"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

const FORMSUBMIT_URL =
  "https://formsubmit.co/ajax/shamankathmandu@gmail.com";
const PHONE_E164 = "+9779851030150";
const PHONE_DISPLAY = "+977 985-103-0150";

export function UnderConstructionPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const nameInputRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setDialogOpen(false);
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setStatus("idle");
  }, []);

  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dialogOpen]);

  useEffect(() => {
    if (!dialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dialogOpen, handleClose]);

  useEffect(() => {
    if (!dialogOpen || status === "sent") return;
    const id = requestAnimationFrame(() => nameInputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [dialogOpen, status]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedMessage = message.trim();
    if (!trimmedMessage) return;
    if (!email.trim() && !phone.trim()) return;

    setStatus("sending");
    try {
      const res = await fetch(FORMSUBMIT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name.trim() || "(not provided)",
          email: email.trim() || "(not provided)",
          phone: phone.trim() || "(not provided)",
          message: trimmedMessage,
          _subject: `Website query — ${name.trim() || email.trim() || phone.trim() || "visitor"}`,
        }),
      });
      if (res.ok) {
        setStatus("sent");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  }

  const canSubmit =
    message.trim().length > 0 &&
    (email.trim().length > 0 || phone.trim().length > 0);

  return (
    <div className="site-container">
      <div className="uc-scene">
        <div className="ground-line bg-line" aria-hidden />

        <div className="vehicle bulldozer" aria-hidden>
          <svg
            className="uc-bulldozer-svg"
            viewBox="0 0 120 80"
            xmlns="http://www.w3.org/2000/svg"
          >
          <path
            d="M 90 20 Q 110 45, 95 75 L 105 75 Q 120 45, 100 20 Z"
            fill="#999"
          />
          <line
            x1="60"
            y1="50"
            x2="100"
            y2="50"
            stroke="#333"
            strokeWidth={6}
            strokeLinecap="round"
          />
          <path
            d="M 20 55 L 20 25 C 20 15, 25 10, 35 10 L 65 10 C 75 10, 80 15, 80 25 L 80 55 Z"
            fill="#FFB300"
          />
          <rect
            x="50"
            y="15"
            width="20"
            height="20"
            rx={3}
            fill="#AEE2FF"
          />
          <rect x="30" y="0" width="6" height="15" rx={2} fill="#555" />
          <rect
            x="10"
            y="55"
            width="80"
            height="20"
            rx={10}
            fill="#222"
          />
          <circle cx="20" cy="65" r="5" fill="#666" />
          <circle cx="35" cy="65" r="5" fill="#666" />
          <circle cx="50" cy="65" r="5" fill="#666" />
          <circle cx="65" cy="65" r="5" fill="#666" />
          <circle cx="80" cy="65" r="5" fill="#666" />
          </svg>
        </div>

        <div className="vehicle crane" aria-hidden>
        <svg
          className="uc-crane-svg"
          viewBox="0 0 150 150"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            x="20"
            y="100"
            width="70"
            height="30"
            rx={6}
            fill="#FFCC00"
          />
          <rect
            x="60"
            y="65"
            width="30"
            height="35"
            rx={4}
            fill="#AEE2FF"
          />
          <rect
            x="60"
            y="65"
            width="30"
            height="35"
            rx={4}
            fill="none"
            stroke="#FFCC00"
            strokeWidth={5}
          />
          <circle cx="35" cy="130" r="12" fill="#222" />
          <circle cx="75" cy="130" r="12" fill="#222" />
          <circle cx="35" cy="130" r="5" fill="#999" />
          <circle cx="75" cy="130" r="5" fill="#999" />
          <g className="crane-arm-group">
            <rect
              x="35"
              y="85"
              width="100"
              height="10"
              rx={4}
              fill="#FF8C00"
            />
            <line
              x1="125"
              y1="95"
              x2="125"
              y2="135"
              stroke="#333"
              strokeWidth={2}
            />
            <path
              d="M 120 135 C 120 145, 130 145, 130 135"
              fill="none"
              stroke="#333"
              strokeWidth={4}
              strokeLinecap="round"
            />
          </g>
          <circle cx="40" cy="90" r="10" fill="#333" />
        </svg>
        </div>

        <div className="ground-line fg-line" aria-hidden />

        <div className="vehicle forklift" aria-hidden>
          <svg
            className="uc-forklift-svg"
            viewBox="0 0 100 80"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              x="10"
              y="30"
              width="55"
              height="35"
              rx={8}
              fill="#FFCC00"
            />
            <path
              d="M 20 30 L 25 5 L 50 5 L 55 30"
              fill="none"
              stroke="#333"
              strokeWidth={5}
              strokeLinejoin="round"
            />
            <rect x="25" y="25" width="10" height="10" fill="#333" />
            <rect x="70" y="5" width="6" height="60" rx={2} fill="#333" />
            <path
              d="M 75 55 L 98 55"
              fill="none"
              stroke="#222"
              strokeWidth={5}
              strokeLinecap="round"
            />
            <path
              d="M 75 60 L 98 60"
              fill="none"
              stroke="#222"
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx="25" cy="65" r="10" fill="#222" />
            <circle cx="55" cy="65" r="10" fill="#222" />
            <circle cx="25" cy="65" r="4" fill="#999" />
            <circle cx="55" cy="65" r="4" fill="#999" />
          </svg>
        </div>
      </div>

      <div className="text-wrapper">
        <div className="stripes" aria-hidden />
        <div className="uc-logo-wrap">
          <Image
            src="/logo.jpg"
            alt="Shaman Kathmandu"
            width={220}
            height={100}
            className="uc-logo"
            priority
            unoptimized
          />
        </div>
        <h1>Under Construction</h1>
        <p>
          We&apos;re working on something big!
          <br />
          Shaman Kathmandu — check back soon for updates.
        </p>
        <div className="uc-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setDialogOpen(true)}
          >
            Send a query
          </button>
        </div>
        <div className="uc-contact">
          <a href="mailto:shamankathmandu@gmail.com">
            shamankathmandu@gmail.com
          </a>
          <span className="uc-contact-sep" aria-hidden>
            |
          </span>
          <a href={`tel:${PHONE_E164}`}>{PHONE_DISPLAY}</a>
        </div>
      </div>

      <footer className="uc-footer">
        © {new Date().getFullYear()} Shaman Kathmandu
      </footer>

      {dialogOpen ? (
        <div
          className="uc-modal-root modal modal-open"
          role="dialog"
          aria-modal="true"
          aria-labelledby="uc-query-title"
        >
          <div
            className="modal-box uc-query-panel font-sans-uc text-base-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="uc-query-stripes" aria-hidden />
            <button
              type="button"
              className="btn btn-sm btn-ghost uc-query-close"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="uc-query-body">
              <h3
                id="uc-query-title"
                className="uc-modal-title text-xl sm:text-2xl font-extrabold text-[#14532d] pr-10"
              >
                Send us a query
              </h3>
              <p className="uc-query-lead">
                We read every message. Add your email or phone so we can reply.
              </p>

              {status === "sent" && (
                <div
                  className="uc-query-alert uc-query-alert--success"
                  role="status"
                >
                  <svg
                    className="uc-query-alert-icon shrink-0 text-emerald-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  <div>
                    <strong className="font-bold">Sent.</strong> Thank you —
                    we&apos;ll get back to you soon.
                  </div>
                </div>
              )}

              {status === "error" && (
                <div
                  className="uc-query-alert uc-query-alert--error"
                  role="alert"
                >
                  <svg
                    className="uc-query-alert-icon shrink-0 text-red-600"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                  </svg>
                  <div>
                    Couldn&apos;t send from the browser. Email{" "}
                    <a
                      href="mailto:shamankathmandu@gmail.com"
                      className="font-bold underline underline-offset-2"
                    >
                      shamankathmandu@gmail.com
                    </a>{" "}
                    or call{" "}
                    <a
                      href={`tel:${PHONE_E164}`}
                      className="font-bold underline underline-offset-2"
                    >
                      {PHONE_DISPLAY}
                    </a>
                    .
                  </div>
                </div>
              )}

              {status !== "sent" ? (
                <form onSubmit={handleSubmit}>
                  <p className="uc-form-section-title">About you</p>
                  <div>
                    <label className="uc-field-label" htmlFor="uc-q-name">
                      Name
                    </label>
                    <input
                      ref={nameInputRef}
                      id="uc-q-name"
                      type="text"
                      className="uc-input"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                    />
                  </div>

                  <p className="uc-form-section-title">How we reach you</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
                    <div>
                      <label className="uc-field-label" htmlFor="uc-q-email">
                        Email
                      </label>
                      <input
                        id="uc-q-email"
                        type="email"
                        className="uc-input"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div>
                      <label className="uc-field-label" htmlFor="uc-q-phone">
                        Phone
                      </label>
                      <input
                        id="uc-q-phone"
                        type="tel"
                        className="uc-input"
                        autoComplete="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+977 …"
                      />
                    </div>
                  </div>
                  <p className="uc-field-hint">
                    Add at least one: email or phone (so we can reply).
                  </p>

                  <p className="uc-form-section-title">Your message</p>
                  <div>
                    <label className="uc-field-label" htmlFor="uc-q-msg">
                      Message
                    </label>
                    <textarea
                      id="uc-q-msg"
                      className="uc-textarea"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="What would you like to know?"
                      required
                      rows={4}
                    />
                  </div>

                  <div className="uc-query-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={handleClose}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={!canSubmit || status === "sending"}
                    >
                      {status === "sending" ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : null}
                      Send message
                    </button>
                  </div>
                </form>
              ) : (
                <div className="uc-query-actions">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleClose}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="modal-backdrop uc-modal-backdrop">
            <button
              type="button"
              className="uc-modal-backdrop-btn"
              aria-label="Close dialog"
              onClick={handleClose}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
