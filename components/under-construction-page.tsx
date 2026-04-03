"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const FORMSUBMIT_URL =
  "https://formsubmit.co/ajax/shamankathmandu@gmail.com";
const PHONE_E164 = "+9779851030150";
const PHONE_DISPLAY = "+977 985-103-0150";

export function UnderConstructionPage() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (dialogOpen) {
      if (!el.open) el.showModal();
    } else if (el.open) {
      el.close();
    }
  }, [dialogOpen]);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setMessage("");
    setStatus("idle");
  }

  function handleClose() {
    setDialogOpen(false);
    resetForm();
  }

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
      <div className="ground-line bg-line" aria-hidden />

      <div className="vehicle bulldozer" aria-hidden>
        <svg
          viewBox="0 0 120 80"
          width={120}
          height={80}
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
          viewBox="0 0 150 150"
          width={180}
          height={180}
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
          <a href={`tel:${PHONE_E164}`}>{PHONE_DISPLAY}</a>
        </div>
      </div>

      <div className="ground-line fg-line" aria-hidden />

      <div className="vehicle forklift" aria-hidden>
        <svg
          viewBox="0 0 100 80"
          width={100}
          height={80}
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

      <footer className="uc-footer">
        © {new Date().getFullYear()} Shaman Kathmandu
      </footer>

      <dialog
        ref={dialogRef}
        className="modal"
        onClose={handleClose}
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
      >
        <div
          className="modal-box max-w-md bg-base-100 text-base-content"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-bold text-lg">Send us a query</h3>
          <p className="text-sm opacity-80 py-2">
            Your message is emailed to our team. Include an email or phone so
            we can reply.
          </p>

          {status === "sent" && (
            <div className="alert alert-success text-sm my-2">
              Thank you — we&apos;ll get back to you soon.
            </div>
          )}

          {status === "error" && (
            <div className="alert alert-error text-sm my-2">
              Could not send. Email{" "}
              <a
                href="mailto:shamankathmandu@gmail.com"
                className="link font-semibold"
              >
                shamankathmandu@gmail.com
              </a>{" "}
              or call{" "}
              <a href={`tel:${PHONE_E164}`} className="link font-semibold">
                {PHONE_DISPLAY}
              </a>
              .
            </div>
          )}

          {status !== "sent" ? (
            <form className="flex flex-col gap-3 pt-2" onSubmit={handleSubmit}>
              <label className="form-control w-full">
                <span className="label-text font-medium">Name</span>
                <input
                  type="text"
                  className="input input-bordered w-full"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text font-medium">Email</span>
                <input
                  type="email"
                  className="input input-bordered w-full"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text font-medium">Phone</span>
                <input
                  type="tel"
                  className="input input-bordered w-full"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+977 …"
                />
              </label>
              <label className="form-control w-full">
                <span className="label-text font-medium">Message</span>
                <textarea
                  className="textarea textarea-bordered w-full min-h-24"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  required
                />
              </label>
              <div className="modal-action mt-2">
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
                  Send
                </button>
              </div>
            </form>
          ) : (
            <div className="modal-action">
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
        <form method="dialog" className="modal-backdrop">
          <button type="submit" aria-label="Close dialog">
            close
          </button>
        </form>
      </dialog>
    </div>
  );
}
