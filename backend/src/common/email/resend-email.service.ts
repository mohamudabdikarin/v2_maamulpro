import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

export type EmailAttachment = {
  filename: string;
  content: string | Buffer;
};

export type SendEmailInput = {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  attachments?: EmailAttachment[];
};

@Injectable()
export class ResendEmailService {
  private readonly logger = new Logger(ResendEmailService.name);

  isConfigured() {
    return Boolean(
      String(process.env.RESEND_API_KEY || '').trim()
      && String(process.env.RESEND_FROM || '').trim(),
    );
  }

  async send(input: SendEmailInput) {
    if (!this.isConfigured()) {
      this.logger.warn('Email delivery is disabled until RESEND_API_KEY and RESEND_FROM are configured');
      return { sent: false as const };
    }

    const resend = new Resend(process.env.RESEND_API_KEY!.trim());
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM!.trim(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
    });
    if (error) {
      throw new Error(`Resend email delivery failed: ${error.message}`);
    }
    return { sent: true as const, id: data?.id };
  }
}
