"use client";

// Fonepay Dynamic QR payment page. Reached right after a fonepay-method order
// is created (order-first-then-pay): shows the scannable QR on desktop plus
// bank-app deep links on mobile, listens on Fonepay's WebSocket for scan/pay
// signals, and settles ONLY through our server status endpoint — every
// success path goes through /api/customer/payment/fonepay/status, which
// re-verifies with Fonepay before marking the order paid.

import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { SiteShell } from "@/components/site/layout/site-shell";
import { SiteProviders } from "@/context/providers";
import { Button } from "@/components/site/shared/button";
import { useAuth } from "@/context/auth-context";
import { formatNpr } from "@/lib/format";
import { getDictionary } from "@/lib/i18n/getDictionary";
import { splitLocale, localizeHref } from "@/lib/i18n/locale";
import { LocaleLink } from "@/components/site/locale-link";
import { trackPurchase } from "@/lib/pixel";
import { catalogItemId } from "@/lib/catalog-id";

const POLL_INTERVAL_MS = 15_000;
const SESSION_TIMEOUT_MS = 5 * 60 * 1000;
const FONEPAY_RED = "#ce2027";

interface QrSession {
  referenceLabel: string;
  qrString: string;
  websocketId: string;
  amount: number;
  order: {
    number: string;
    total: number;
    items: {
      productSlug: string;
      variationId: string | null;
      quantity: number;
      priceAtOrder: number;
      productName: string;
    }[];
  };
}

interface Bank {
  bankName: string;
  bankCode: string;
  bankIcon: string;
  intentScheme: string;
}

type PayState =
  | "loading" // fetching/creating the QR session
  | "waiting" // QR shown, no payment yet
  | "scanned" // WS says QR verified — customer is confirming in their app
  | "checking" // a settle call is in flight (manual or triggered)
  | "paid"
  | "failed"
  | "timeout"
  | "error"; // QR could not be created

function PayPageInner({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale } = splitLocale(pathname);
  const t = getDictionary(locale);
  const { user, hydrated } = useAuth();

  const [session, setSession] = useState<QrSession | null>(null);
  const [state, setState] = useState<PayState>("loading");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankQuery, setBankQuery] = useState("");
  const [showQrOnMobile, setShowQrOnMobile] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<PayState>("loading");
  stateRef.current = state;
  const settlingRef = useRef(false);

  useEffect(() => {
    if (hydrated && !user) {
      // Back to THIS pay page, not /checkout: the cart was already cleared
      // when the order was placed, so a session that expires mid-payment
      // would otherwise land the customer on an empty checkout with a real
      // unpaid order stranded in their account.
      router.replace(
        localizeHref(
          `/account/login?next=${encodeURIComponent(`/checkout/pay/${orderNumber}`)}`,
          locale,
        ),
      );
    }
  }, [hydrated, user, router, locale, orderNumber]);

  // ─── Settlement (the only path to "paid") ─────────────────────────────────

  const settle = useCallback(
    async (opts?: { manual?: boolean }) => {
      const current = stateRef.current;
      if (!session || settlingRef.current) return;
      if (current === "paid" || current === "failed" || current === "error") return;
      settlingRef.current = true;
      if (opts?.manual) setState("checking");
      try {
        const res = await fetch("/api/customer/payment/fonepay/status", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderNumber,
            referenceLabel: session.referenceLabel,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.paid) {
          setState("paid");
          wsRef.current?.close();
          // Browser Purchase pixel pairs with the server CAPI event via
          // event_id = order number; trackPurchase also self-guards against
          // refires through localStorage.
          trackPurchase({
            orderNumber: session.order.number,
            items: session.order.items.map((it) => ({
              contentId: catalogItemId(it.productSlug, it.variationId),
              quantity: it.quantity,
              itemPrice: it.priceAtOrder,
            })),
            value: session.order.total,
          });
          setTimeout(() => {
            router.push(
              localizeHref(`/account/orders/${orderNumber}?paid=1`, locale),
            );
          }, 1500);
        } else if (data?.paymentStatus === "failed") {
          setState("failed");
          wsRef.current?.close();
        } else if (opts?.manual || stateRef.current === "checking") {
          // Still pending — fall back to whatever phase we were in.
          setState((prev) =>
            prev === "checking" ? "waiting" : prev,
          );
        }
      } catch {
        if (stateRef.current === "checking") setState("waiting");
      } finally {
        settlingRef.current = false;
      }
    },
    [session, orderNumber, router, locale],
  );

  const settleRef = useRef(settle);
  settleRef.current = settle;

  // ─── QR session bootstrap ─────────────────────────────────────────────────

  const loadSession = useCallback(
    async (force: boolean) => {
      setState("loading");
      try {
        const res = await fetch("/api/customer/payment/fonepay/qr", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderNumber, force }),
        });
        const data = await res.json().catch(() => null);
        if (res.status === 409 && data?.paid) {
          router.replace(
            localizeHref(`/account/orders/${orderNumber}?paid=1`, locale),
          );
          return;
        }
        if (!res.ok || !data?.qrString) {
          setState("error");
          return;
        }
        setSession({
          referenceLabel: data.referenceLabel,
          qrString: data.qrString,
          websocketId: data.websocketId,
          amount: data.amount,
          order: data.order,
        });
        setState("waiting");
      } catch {
        setState("error");
      }
    },
    [orderNumber, router, locale],
  );

  useEffect(() => {
    if (!hydrated || !user) return;
    void loadSession(false);
  }, [hydrated, user, loadSession]);

  // ─── Fonepay WebSocket (advisory: every signal just triggers a verify) ────

  useEffect(() => {
    if (!session?.websocketId) return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(session.websocketId);
    } catch {
      return; // polling still covers us
    }
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(String(event.data));
        // transactionStatus arrives as a JSON-encoded string.
        const inner =
          typeof msg.transactionStatus === "string"
            ? JSON.parse(msg.transactionStatus)
            : msg.transactionStatus;
        if (inner?.paymentSuccess === true || inner?.success === true) {
          if (inner?.qrVerified === true || inner?.QRVerified === true) {
            setState((prev) => (prev === "waiting" ? "scanned" : prev));
          }
          void settleRef.current();
          return;
        }
      } catch {
        // Unparseable frame — verify anyway; the status API is authoritative.
      }
      void settleRef.current();
    };
    ws.onerror = () => {
      // Ignore: the 15s poll keeps working without the socket.
    };
    return () => {
      wsRef.current = null;
      ws.close();
    };
  }, [session?.websocketId]);

  // ─── Poll fallback + session timeout ──────────────────────────────────────

  useEffect(() => {
    if (!session) return;
    const poll = setInterval(() => {
      const s = stateRef.current;
      if (s === "waiting" || s === "scanned") void settleRef.current();
    }, POLL_INTERVAL_MS);
    const timeout = setTimeout(() => {
      const s = stateRef.current;
      if (s === "waiting" || s === "scanned") {
        setState("timeout");
        wsRef.current?.close();
      }
    }, SESSION_TIMEOUT_MS);
    return () => {
      clearInterval(poll);
      clearTimeout(timeout);
    };
  }, [session]);

  // ─── Mobile bank list ─────────────────────────────────────────────────────

  useEffect(() => {
    if (!session) return;
    fetch("/api/customer/payment/fonepay/banks", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.banks) setBanks(data.banks);
      })
      .catch(() => {});
  }, [session]);

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    if (!q) return banks;
    return banks.filter((b) => b.bankName.toLowerCase().includes(q));
  }, [banks, bankQuery]);

  const openBankApp = (bank: Bank) => {
    if (!session) return;
    // The intentScheme already includes the path, e.g. "LXBLNPKA://payment".
    const url = `${bank.intentScheme}/?qrPayload=${encodeURIComponent(session.qrString)}`;
    window.location.href = url;
  };

  if (!hydrated || !user) {
    return (
      <section className="px-6 py-20 text-center text-ink-soft">
        {t.common.loading}
      </section>
    );
  }

  const busy = state === "loading" || state === "checking";

  return (
    <section className="px-6 md:px-10 mx-auto max-w-[900px] py-12">
      <h1 className="font-display text-4xl text-ink mb-2">
        {t.payment.title}
      </h1>
      <p className="text-sm text-ink-soft mb-8">
        {t.payment.orderLabel} {orderNumber}
        {session ? ` · ${t.payment.amountLabel}: ${formatNpr(session.amount)}` : null}
      </p>

      {state === "error" ? (
        <StatusCard tone="error" message={t.payment.qrLoadFailed}>
          <Button variant="primary" onClick={() => void loadSession(false)}>
            {t.payment.tryAgain}
          </Button>
        </StatusCard>
      ) : state === "failed" ? (
        <StatusCard tone="error" message={t.payment.paymentFailed}>
          <Button variant="primary" onClick={() => void loadSession(true)}>
            {t.payment.tryAgain}
          </Button>
        </StatusCard>
      ) : state === "timeout" ? (
        <StatusCard tone="error" message={t.payment.paymentTimeout}>
          <Button variant="primary" onClick={() => void loadSession(true)}>
            {t.payment.tryAgain}
          </Button>
        </StatusCard>
      ) : state === "paid" ? (
        <StatusCard tone="success" message={t.payment.paymentReceived} />
      ) : state === "loading" || !session ? (
        <StatusCard tone="muted" message={t.common.loading} />
      ) : (
        <div className="grid md:grid-cols-[minmax(0,1fr)_320px] gap-8">
          <div className="space-y-6">
            {/* Mobile: bank-app deep links */}
            {banks.length > 0 ? (
              <div className="md:hidden border border-line bg-[var(--color-surface)] rounded-card p-4 space-y-3">
                <h2 className="font-display text-xl text-ink">
                  {t.payment.payWithBankApp}
                </h2>
                <input
                  type="search"
                  value={bankQuery}
                  onChange={(e) => setBankQuery(e.target.value)}
                  placeholder={t.payment.searchBanks}
                  className="w-full bg-transparent border border-line focus:border-metal-text outline-none px-3 py-2 text-sm text-ink"
                />
                <ul className="max-h-64 overflow-y-auto divide-y divide-line">
                  {filteredBanks.map((bank) => (
                    <li key={bank.bankCode}>
                      <button
                        type="button"
                        onClick={() => openBankApp(bank)}
                        className="w-full flex items-center gap-3 py-3 text-left text-sm text-ink hover:text-metal-text"
                      >
                        {bank.bankIcon ? (
                          // eslint-disable-next-line @next/next/no-img-element -- external bank logos, arbitrary hosts
                          <img
                            src={bank.bankIcon}
                            alt=""
                            className="w-8 h-8 object-contain flex-shrink-0"
                          />
                        ) : (
                          <span className="w-8 h-8 bg-line flex-shrink-0" />
                        )}
                        {bank.bankName}
                      </button>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setShowQrOnMobile((v) => !v)}
                  className="text-xs underline text-ink-soft"
                >
                  {showQrOnMobile ? t.payment.hideQr : t.payment.showQr}
                </button>
              </div>
            ) : null}

            {/* QR card — always on desktop, toggleable on mobile */}
            <div
              className={`${banks.length > 0 && !showQrOnMobile ? "hidden md:block" : ""} border border-line bg-white rounded-card p-6 text-center`}
            >
              <p className="mb-4 font-semibold text-sm text-[#0a0d12]">
                <span style={{ color: FONEPAY_RED }}>Checkout</span> by Fonepay
              </p>
              <div className="inline-block bg-white p-2">
                <QRCodeSVG value={session.qrString} size={240} marginSize={2} />
              </div>
              <p className="mt-4 text-xs text-[#0a0d12]">{t.payment.scanToPay}</p>
            </div>
          </div>

          {/* Status sidebar */}
          <aside>
            <div className="border border-line bg-[var(--color-surface)] rounded-card p-5 space-y-4 sticky top-24">
              <h3 className="label-eyebrow">{t.checkout.summary}</h3>
              <div className="flex justify-between text-sm">
                <span className="text-ink-soft">
                  {t.checkout.total}
                </span>
                <span className="font-display text-metal-text">
                  {formatNpr(session.amount)}
                </span>
              </div>
              <p
                className="text-sm text-ink"
                role="status"
                aria-live="polite"
              >
                {state === "scanned"
                  ? t.payment.qrScanned
                  : state === "checking"
                    ? t.payment.checking
                    : t.payment.waitingForPayment}
              </p>
              <button
                type="button"
                onClick={() => void settle({ manual: true })}
                disabled={busy}
                className="w-full py-3 text-sm font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: FONEPAY_RED }}
              >
                {state === "checking" ? t.payment.checking : t.payment.checkStatus}
              </button>
              <p className="text-xs text-ink-soft">
                {t.payment.payLater}
              </p>
              <LocaleLink
                href={`/account/orders/${orderNumber}`}
                className="block text-xs underline text-ink-soft"
              >
                {t.payment.backToOrder}
              </LocaleLink>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}

function StatusCard({
  tone,
  message,
  children,
}: {
  tone: "success" | "error" | "muted";
  message: string;
  children?: React.ReactNode;
}) {
  const color =
    tone === "success"
      ? "text-metal-text"
      : tone === "error"
        ? "text-[#ce2027]"
        : "text-ink-soft";
  return (
    <div className="border border-line bg-[var(--color-surface)] rounded-card p-10 text-center space-y-6">
      <p className={`font-display text-xl ${color}`}>{message}</p>
      {children}
    </div>
  );
}

export default function FonepayPayPage(props: {
  params: Promise<{ orderNumber: string }>;
}) {
  const params = use(props.params);
  return (
    <SiteProviders>
      <SiteShell>
        <PayPageInner orderNumber={params.orderNumber} />
      </SiteShell>
    </SiteProviders>
  );
}
