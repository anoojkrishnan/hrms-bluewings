import nodemailer from 'nodemailer';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpPort === 465,
  auth: env.smtpUser
    ? { user: env.smtpUser, pass: env.smtpPass }
    : undefined,
});

async function send(options: { to: string; subject: string; html: string }): Promise<void> {
  try {
    await transporter.sendMail({ from: env.smtpFrom, ...options });
  } catch (err) {
    logger.error({ err, to: options.to, subject: options.subject }, 'Email send failed');
  }
}

export const emailService = {
  async sendRaw(to: string, subject: string, html?: string, text?: string): Promise<void> {
    await send({ to, subject, html: html ?? `<p>${text ?? ''}</p>` });
  },

  async sendVerificationEmail(to: string, firstName: string, token: string): Promise<void> {
    const link = `${env.appUrl}/verify-email?token=${encodeURIComponent(token)}`;
    await send({
      to,
      subject: 'Verify your HRMS account',
      html: `
        <p>Hi ${firstName},</p>
        <p>Thanks for signing up. Please verify your email address to activate your account.</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#2563EB;color:#fff;border-radius:6px;text-decoration:none;">Verify Email</a></p>
        <p>Or copy this link: ${link}</p>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't sign up, you can ignore this email.</p>
      `,
    });
  },

  async sendPasswordResetEmail(to: string, firstName: string, token: string): Promise<void> {
    const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(token)}`;
    await send({
      to,
      subject: 'Reset your HRMS password',
      html: `
        <p>Hi ${firstName},</p>
        <p>We received a request to reset your password.</p>
        <p><a href="${link}" style="display:inline-block;padding:10px 20px;background:#1A56DB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">Reset Password</a></p>
        <p style="color:#6b7a8d;font-size:13px;">Or copy this link: ${link}</p>
        <p style="color:#6b7a8d;font-size:13px;">This link expires in 1 hour.</p>
      `,
    });
  },

  async sendEssInviteEmail(to: string, firstName: string, setPasswordToken: string, tenantId: string): Promise<void> {
    const link = `${env.appUrl}/reset-password?token=${encodeURIComponent(setPasswordToken)}`;
    await send({
      to,
      subject: `You've been invited to HRMS Employee Self-Service`,
      html: `
        <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#ffffff;">
          <div style="background:#1A56DB;border-radius:10px;padding:28px 32px;margin-bottom:28px;">
            <h1 style="color:#ffffff;font-size:22px;font-weight:700;margin:0;letter-spacing:-0.5px;">Welcome to HRMS</h1>
            <p style="color:rgba(255,255,255,0.8);margin:6px 0 0;font-size:14px;">Employee Self-Service Portal</p>
          </div>

          <p style="font-size:15px;color:#0D1117;margin:0 0 16px;">Hi <strong>${firstName}</strong>,</p>
          <p style="font-size:14px;color:#5A6882;line-height:1.6;margin:0 0 24px;">
            Your HR team has set up an Employee Self-Service account for you.
            You can now view your payslips, apply for leave, check your attendance, and manage your profile — all in one place.
          </p>

          <p style="font-size:13px;color:#5A6882;margin:0 0 8px;">Your login email:</p>
          <p style="font-size:14px;font-weight:600;color:#0D1117;background:#F0F2F5;padding:10px 14px;border-radius:8px;margin:0 0 24px;">${to}</p>

          <a href="${link}"
             style="display:inline-block;padding:13px 28px;background:#1A56DB;color:#ffffff;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;">
            Set Your Password &amp; Login
          </a>

          <p style="font-size:12px;color:#8A9BB8;margin:24px 0 0;line-height:1.6;">
            This link expires in <strong>24 hours</strong>. If you didn't expect this email, please ignore it or contact your HR team.
          </p>
          <hr style="border:none;border-top:1px solid #E2E7EF;margin:24px 0;" />
          <p style="font-size:12px;color:#8A9BB8;margin:0;">
            Tenant ID: ${tenantId} &nbsp;·&nbsp; HRMS Platform
          </p>
        </div>
      `,
    });
  },
};
