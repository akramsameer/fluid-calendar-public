import { Job } from "bullmq";
import { BaseProcessor } from "./base-processor";
import {
  TestCronJobData,
  QUEUE_NAMES,
  addEmailJob,
  addTestCronJob,
} from "../queues";
import { logger } from "@/lib/logger";
import { format } from "@/lib/date-utils";

const LOG_SOURCE = "TestCronProcessor";

/**
 * Test cron processor for sending test emails every 15 minutes
 */
export class TestCronProcessor extends BaseProcessor<
  TestCronJobData & Record<string, unknown>,
  { success: boolean }
> {
  constructor() {
    super(QUEUE_NAMES.TEST_CRON);
  }

  /**
   * Process a test cron job
   * @param job The test cron job to process
   */
  protected async process(
    job: Job<TestCronJobData & Record<string, unknown>>
  ): Promise<{ success: boolean }> {
    const { timestamp, email } = job.data;

    console.log(`Processing test cron job for ${email} at ${timestamp}`);
    logger.info(
      `Processing test cron job`,
      {
        timestamp,
        email,
      },
      LOG_SOURCE
    );

    try {
      // Get environment from custom environment variable
      const environment = process.env.APP_ENVIRONMENT || "development";

      console.log(`Environment: ${environment}`);

      // Generate email content
      const html = `
        <h1>Test Cron Job</h1>
        <p>This is a test email sent by the cron job at ${timestamp}</p>
        <p>Environment: ${environment}</p>
        <p>If you're receiving this email, it means the cron job system is working correctly.</p>
      `;
      const text = `
        Test Cron Job
        
        This is a test email sent by the cron job at ${timestamp}
        Environment: ${environment}
        
        If you're receiving this email, it means the cron job system is working correctly.
      `;

      // Queue email job
      console.log(
        `Queueing email to ${email} with subject: ${environment} Test Cron Job - ${timestamp}`
      );
      await addEmailJob({
        to: email,
        subject: `[${environment}] Test Cron Job - ${timestamp}`,
        html,
        text,
      });
      console.log(`Email queued successfully`);

      logger.info(
        `Test cron email queued`,
        {
          email,
          timestamp,
        },
        LOG_SOURCE
      );

      return { success: true };
    } catch (error) {
      console.error(`Failed to process test cron job:`, error);
      logger.error(
        `Failed to process test cron job`,
        {
          email,
          timestamp,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }

  /**
   * Schedule a test cron email
   */
  public static async scheduleTestEmail(email: string): Promise<void> {
    try {
      console.log(`Scheduling test cron email for ${email}`);
      logger.info(
        "Scheduling test cron email",
        {
          email,
        },
        LOG_SOURCE
      );

      const timestamp = format(new Date(), "yyyy-MM-dd HH:mm:ss");
      console.log(`Generated timestamp: ${timestamp}`);

      console.log(`Adding test cron job to queue`);
      await addTestCronJob({
        timestamp,
        email,
      });
      console.log(`Test cron job added to queue successfully`);

      logger.info(
        `Scheduled test cron email`,
        {
          email,
          timestamp,
        },
        LOG_SOURCE
      );
    } catch (error) {
      console.error(`Error scheduling test cron email:`, error);
      logger.error(
        "Failed to schedule test cron email",
        {
          email,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        LOG_SOURCE
      );

      throw error;
    }
  }
}

// Create and export a singleton instance
export const testCronProcessor = new TestCronProcessor();
