import { render } from "@react-email/components";
import nodemailer from "nodemailer";
import { z } from "zod";
import { OrderReceiptEmail, OrderRefundEmail, VerifyEmailTemplate } from "./templates/index";

export type EmailConfig = {
  host?: string;
  port?: number;
  user?: string;
  pass?: string;
  from?: string;
};

export function createMailTransport(config: EmailConfig) {
  if (!config.host) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: config.host,
    port: config.port ?? 587,
    secure: config.port === 465,
    auth: config.user ? { user: config.user, pass: config.pass } : undefined,
  });
}

const orderReceiptPayload = z.object({
  siteName: z.string(),
  orderId: z.string(),
  total: z.string(),
  items: z.array(z.object({ name: z.string(), quantity: z.number(), price: z.string() })),
});

const verifyEmailPayload = z.object({
  siteName: z.string(),
  url: z.string().url(),
});

const orderRefundPayload = z.object({
  siteName: z.string(),
  orderId: z.string(),
});

export async function renderEmailTemplate(
  template: string,
  payload: Record<string, unknown>,
): Promise<{ subject: string; html: string }> {
  switch (template) {
    case "order-receipt": {
      const data = orderReceiptPayload.parse(payload);
      return {
        subject: `Order confirmed — ${data.siteName}`,
        html: await render(OrderReceiptEmail(data)),
      };
    }
    case "verify-email": {
      const data = verifyEmailPayload.parse(payload);
      return {
        subject: `Verify your email — ${data.siteName}`,
        html: await render(VerifyEmailTemplate(data)),
      };
    }
    case "order-refund": {
      const data = orderRefundPayload.parse(payload);
      return {
        subject: `Refund processed — ${data.siteName}`,
        html: await render(OrderRefundEmail(data)),
      };
    }
    default:
      throw new Error(`Unknown email template: ${template}`);
  }
}

export async function sendEmail(
  transport: nodemailer.Transporter,
  opts: { to: string; subject: string; html: string; from: string },
) {
  return transport.sendMail({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export async function sendTemplatedEmail(
  transport: nodemailer.Transporter,
  opts: { to: string; template: string; payload: Record<string, unknown>; from: string },
) {
  const { subject, html } = await renderEmailTemplate(opts.template, opts.payload);
  return sendEmail(transport, { to: opts.to, subject, html, from: opts.from });
}
