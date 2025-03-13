import { Job } from "bullmq";
import { BaseProcessor } from "./base-processor";
import { EmailJobData, QUEUE_NAMES } from "../queues";
import { logger } from "@/lib/logger";
import { Resend } from "resend";

const LOG_SOURCE = "EmailProcessor";
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email processor for sending emails
 */
export class EmailProcessor extends BaseProcessor<
  EmailJobData & Record<string, unknown>,
  { success: boolean }
> {
  constructor() {
    super(QUEUE_NAMES.EMAIL);
  }

  /**
   * Process an email job
   * @param job The email job to process
   */
  protected async process(
    job: Job<EmailJobData & Record<string, unknown>>
  ): Promise<{ success: boolean }> {
    const { to, subject, html, text, from, attachments } = job.data;

    logger.info(
      `Sending email to ${to}`,
      {
        to,
        subject,
        from: from || "default",
        hasAttachments: !!attachments && attachments.length > 0,
      },
      LOG_SOURCE
    );

    try {
      // Send email using Resend
      const fromEmail =
        from || process.env.RESEND_FROM_EMAIL || "noreply@fluidcalendar.com";

      const emailData = {
        from: fromEmail,
        to,
        subject,
        html,
        text,
      };

      // Add attachments if they exist
      if (attachments && attachments.length > 0) {
        const formattedAttachments = attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          content_type: attachment.contentType,
        }));

        Object.assign(emailData, { attachments: formattedAttachments });
      }

      const { data, error } = await resend.emails.send(emailData);

      if (error) {
        throw new Error(`Resend API error: ${error.message}`);
      }

      logger.info(
        `Email sent to ${to}`,
        {
          to,
          subject,
          from: fromEmail,
          resendId: data?.id || null,
        },
        LOG_SOURCE
      );

      return { success: true };
    } catch (error) {
      logger.error(
        `Failed to send email to ${to}`,
        {
          to,
          subject,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }
}

// Create and export a singleton instance
export const emailProcessor = new EmailProcessor();
