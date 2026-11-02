// Transactional email (nodemailer + the Google Workspace account in EMAIL_USER / EMAIL_PASS,
// same setup as scripts/test-email-credentials.ts). Server-only.

import nodemailer from 'nodemailer';

let transport: nodemailer.Transporter | null = null;

export function emailConfigured(): boolean {
  return !!process.env.EMAIL_USER && !!process.env.EMAIL_PASS;
}

export async function sendEmail(to: string, msg: { subject: string; text: string; html: string }) {
  if (!emailConfigured()) throw new Error('email_not_configured');
  transport ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: (process.env.EMAIL_PASS ?? '').replace(/\s+/g, '') },
  });
  await transport.sendMail({ from: `Avocat <${process.env.EMAIL_USER}>`, to, ...msg });
}
