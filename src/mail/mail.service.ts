import { Injectable, Logger } from "@nestjs/common";

export type Mail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

/**
 * Sends email through Resend's HTTP API (https://resend.com/docs/api-reference).
 * Needs RESEND_API_KEY and MAIL_FROM (e.g. "Chronicle <hello@yourdomain.com>");
 * without them isConfigured() is false and nothing is sent.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  isConfigured(): boolean {
    return !!process.env.RESEND_API_KEY && !!process.env.MAIL_FROM;
  }

  async send(mail: Mail): Promise<void> {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.MAIL_FROM, ...mail }),
    });
    if (!response.ok) {
      this.logger.error(
        `Resend refused an email (${response.status}): ${await response.text()}`,
      );
      throw new Error("Failed to send email");
    }
  }
}
