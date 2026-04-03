"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  AnchorButton,
  Button,
  Callout,
  Card,
  Classes,
  Dialog,
  DialogBody,
  DialogFooter,
  Elevation,
  FormGroup,
  InputGroup,
  Intent,
  TextArea,
} from "@blueprintjs/core";

const FORMSUBMIT_URL =
  "https://formsubmit.co/ajax/shamankathmandu@gmail.com";

export function UnderConstructionPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");

  useEffect(() => {
    document.body.classList.add(Classes.DARK);
    return () => document.body.classList.remove(Classes.DARK);
  }, []);

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

  async function handleSubmit() {
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
    message.trim().length > 0 && (email.trim().length > 0 || phone.trim().length > 0);

  return (
    <div className="uc-shell">
      <Card className="uc-card" elevation={Elevation.TWO}>
        <div className="uc-card-inner">
          <Image
            src="/logo.jpg"
            alt="Shaman Kathmandu"
            width={280}
            height={120}
            className="uc-logo"
            priority
            unoptimized
          />

          <span className={`${Classes.TAG} ${Classes.INTENT_PRIMARY} uc-badge`}>
            Under construction
          </span>

          <h1 className={`${Classes.HEADING} uc-title`}>
            We&apos;re building something new
          </h1>
          <p className={`${Classes.TEXT_MUTED} uc-lead`}>
            The Shaman Kathmandu site will be here soon. Until then, reach us
            directly or send a quick message — we read every note.
          </p>

          <div className="uc-actions">
            <Button
              intent={Intent.PRIMARY}
              icon="chat"
              large
              onClick={() => setDialogOpen(true)}
            >
              Send a query
            </Button>
          </div>

          <div className="uc-contact">
            <AnchorButton
              href="mailto:shamankathmandu@gmail.com"
              text="shamankathmandu@gmail.com"
              icon="envelope"
              minimal
              large
            />
            <AnchorButton
              href="tel:+9779842482062"
              text="+977 984-248-2062"
              icon="phone"
              minimal
              large
            />
          </div>
        </div>
      </Card>

      <footer className="uc-footer">
        <span className={Classes.TEXT_MUTED}>
          © {new Date().getFullYear()} Shaman Kathmandu
        </span>
      </footer>

      <Dialog
        isOpen={dialogOpen}
        onClose={handleClose}
        title="Send us a query"
        icon="chat"
        className="uc-query-dialog"
      >
        <DialogBody>
          <p className={`${Classes.TEXT_MUTED} uc-dialog-intro`}>
            Your message is emailed to our team. Please include either an email
            or phone so we can reply.
          </p>

          {status === "sent" && (
            <Callout intent={Intent.SUCCESS} icon="tick-circle" title="Sent">
              Thank you — we&apos;ll get back to you soon.
            </Callout>
          )}

          {status === "error" && (
            <Callout intent={Intent.DANGER} icon="error" title="Could not send">
              Please try again, or email{" "}
              <a href="mailto:shamankathmandu@gmail.com">
                shamankathmandu@gmail.com
              </a>{" "}
              or call{" "}
              <a href="tel:+9779842482062">+977 984-248-2062</a>.
            </Callout>
          )}

          {status !== "sent" && (
            <>
              <FormGroup label="Name" labelFor="uc-name">
                <InputGroup
                  id="uc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  large
                />
              </FormGroup>
              <FormGroup label="Email" labelFor="uc-email">
                <InputGroup
                  id="uc-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  large
                />
              </FormGroup>
              <FormGroup label="Phone" labelFor="uc-phone">
                <InputGroup
                  id="uc-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+977 …"
                  large
                />
              </FormGroup>
              <FormGroup
                label="Message"
                labelFor="uc-message"
                helperText="Required"
              >
                <TextArea
                  id="uc-message"
                  fill
                  autoResize
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  large
                />
              </FormGroup>
            </>
          )}
        </DialogBody>
        <DialogFooter
          actions={
            status === "sent" ? (
              <Button intent={Intent.PRIMARY} onClick={handleClose}>
                Close
              </Button>
            ) : (
              <>
                <Button onClick={handleClose}>Cancel</Button>
                <Button
                  intent={Intent.PRIMARY}
                  loading={status === "sending"}
                  disabled={!canSubmit || status === "sending"}
                  onClick={handleSubmit}
                >
                  Send
                </Button>
              </>
            )
          }
        />
      </Dialog>
    </div>
  );
}
