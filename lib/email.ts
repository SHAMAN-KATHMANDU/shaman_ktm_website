// SMTP mailer for customer-facing email (password resets, order lifecycle).
// With no SMTP_HOST configured the transport degrades to console logging, so
// dev/local keeps working with zero setup — mirroring the admin reset flow's
// dev-echo behaviour.
//
// Like lib/audit.ts, sends are fire-and-forget: sendEmail never throws, so a
// mail outage can't fail a checkout or password-reset request.

import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";

interface EmailArgs {
  to: string;
  subject: string;
  html: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: env.SMTP_USER
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
    });
  }
  return transporter;
}

export async function sendEmail(args: EmailArgs): Promise<void> {
  try {
    const t = getTransporter();
    if (!t) {
      console.log("[email-dev] would send:", {
        to: args.to,
        subject: args.subject,
      });
      return;
    }
    const from = env.SMTP_FROM_EMAIL || env.SMTP_USER;
    await t.sendMail({
      from: `"${env.SMTP_FROM_NAME}" <${from}>`,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
  } catch (err) {
    console.error("[email] send failed", {
      to: args.to,
      subject: args.subject,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────
// Interpolated values are user-controlled (names, notes) — always escape.

function esc(v: string): string {
  return v
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shell(title: string, body: string): string {
  return `<div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0a0806;color:#f5efe3">
  <h1 style="color:#c4a35a;font-size:22px;font-weight:normal;letter-spacing:0.05em">${esc(title)}</h1>
  ${body}
  <p style="margin-top:32px;color:#8a7a55;font-size:12px">Shaman Kathmandu</p>
</div>`;
}

export function passwordResetEmail(args: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string } {
  return {
    subject: "Reset your Shaman Kathmandu password",
    html: shell(
      "Reset your password",
      `<p>Hi ${esc(args.name)},</p>
  <p>We received a request to reset your password. The link below is valid for 30 minutes:</p>
  <p style="margin:24px 0"><a href="${esc(args.resetUrl)}" style="color:#c4a35a">${esc(args.resetUrl)}</a></p>
  <p>If you didn't request this, you can safely ignore this email.</p>`,
    ),
  };
}

export function orderConfirmationEmail(args: {
  name: string;
  number: string;
  items: { productName: string; quantity: number; priceAtOrder: number }[];
  total: number;
  deliveryAddress: string;
  orderUrl: string;
}): { subject: string; html: string } {
  const rows = args.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.productName)} × ${i.quantity}</td><td style="padding:6px 0;text-align:right">NPR ${(i.priceAtOrder * i.quantity).toLocaleString("en-US")}</td></tr>`,
    )
    .join("");
  return {
    subject: `Order ${args.number} confirmed — Shaman Kathmandu`,
    html: shell(
      `Order ${args.number} confirmed`,
      `<p>Hi ${esc(args.name)}, thank you for your order.</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;color:#f5efe3">${rows}
    <tr><td style="padding:10px 0;border-top:1px solid #2b2318"><strong>Total (cash on delivery)</strong></td><td style="padding:10px 0;border-top:1px solid #2b2318;text-align:right"><strong>NPR ${args.total.toLocaleString("en-US")}</strong></td></tr>
  </table>
  <p>Delivery to: ${esc(args.deliveryAddress)}</p>
  <p>We'll confirm your order shortly. Track it any time: <a href="${esc(args.orderUrl)}" style="color:#c4a35a">${esc(args.orderUrl)}</a></p>`,
    ),
  };
}

export function orderStatusEmail(args: {
  name: string;
  number: string;
  status: string;
  notes?: string | null;
  orderUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Order ${args.number} update: ${args.status} — Shaman Kathmandu`,
    html: shell(
      `Order ${args.number} is now ${esc(args.status)}`,
      `<p>Hi ${esc(args.name)},</p>
  <p>Your order <strong>${esc(args.number)}</strong> is now <strong>${esc(args.status)}</strong>.</p>
  ${args.notes ? `<p>${esc(args.notes)}</p>` : ""}
  <p>Track it any time: <a href="${esc(args.orderUrl)}" style="color:#c4a35a">${esc(args.orderUrl)}</a></p>`,
    ),
  };
}
