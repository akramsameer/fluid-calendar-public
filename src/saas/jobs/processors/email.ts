import { Job } from "bullmq";
import { BaseProcessor } from "./base-processor";
import { EmailJobData, QUEUE_NAMES } from "../queues";
import { logger } from "@/lib/logger";
import { Resend } from "resend";
import { EmailService } from "@/lib/email/email-service.saas";
import { getRedisOptions } from "../config/redis";

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
    super(QUEUE_NAMES.EMAIL, {
      // Include Redis connection options
      ...getRedisOptions(),
      // Set concurrency to 2 to match our rate limiter (2 emails per second)
      // This ensures we have enough workers to process at the rate we want
      concurrency: 1,
    });
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
        timestamp: new Date().toISOString(),
        jobId: job.id || "unknown",
      },
      LOG_SOURCE
    );

    try {
      // Send email using Resend
      const fromEmail = EmailService.formatSender("FluidCalendar");

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
          timestamp: new Date().toISOString(),
          processingTime: `${
            Date.now() - new Date(job.processedOn || Date.now()).getTime()
          }ms`,
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
