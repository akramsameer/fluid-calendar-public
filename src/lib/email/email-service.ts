import { logger } from "@/lib/logger";
import { addEmailJob, EmailJobData } from "@/saas/jobs/queues";

const LOG_SOURCE = "EmailService";

/**
 * Email service for sending emails through the queue
 * This centralizes all email sending to use the queue instead of direct Resend API calls
 */
export class EmailService {
  /**
   * Send an email through the queue
   * @param emailData The email data to send
   * @returns A promise that resolves when the email is queued
   */
  static async sendEmail(emailData: EmailJobData): Promise<{ jobId: string }> {
    try {
      const { to, subject } = emailData;

      logger.info(
        `Queueing email to ${to}`,
        {
          to,
          subject,
          from: emailData.from || "default",
          hasAttachments:
            !!emailData.attachments && emailData.attachments.length > 0,
        },
        LOG_SOURCE
      );

      // Add the email job to the queue
      const job = await addEmailJob(emailData);

      logger.info(
        `Email queued successfully`,
        {
          to,
          subject,
          jobId: job.id || "",
        },
        LOG_SOURCE
      );

      return { jobId: job.id || "" };
    } catch (error) {
      logger.error(
        `Failed to queue email`,
        {
          error: error instanceof Error ? error.message : "Unknown error",
          to: emailData.to,
          subject: emailData.subject,
        },
        LOG_SOURCE
      );
      throw error;
    }
  }

  /**
   * Format a sender email address with a display name
   * @param displayName The display name to use
   * @param email Optional custom email address
   * @returns Formatted email string
   */
  static formatSender(displayName: string, email?: string): string {
    const fromEmail =
      email || process.env.RESEND_FROM_EMAIL || "noreply@fluidcalendar.com";
    return `${displayName} <${fromEmail}>`;
  }
}
