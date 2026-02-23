import { Job, Worker, WorkerOptions } from "bullmq";

import { logger } from "@/lib/logger";

import { getRedisOptions } from "../config/redis";
import {
  trackJob,
  trackJobCompletion,
  trackJobFailure,
  trackJobStart,
} from "../utils/job-tracker";

// Define types for job data and results
type JobData = Record<string, unknown>;
type JobResult = string | number | boolean | null | Record<string, unknown>;

export abstract class BaseProcessor<
  T extends JobData = Record<string, unknown>,
  R extends JobResult = Record<string, unknown>,
> {
  protected worker: Worker;
  protected queueName: string;
  protected logSource: string;

  constructor(queueName: string, options?: WorkerOptions) {
    this.queueName = queueName;
    this.logSource = `${queueName}Processor`;

    const defaultOptions: WorkerOptions = {
      ...getRedisOptions(),
      autorun: true,
      concurrency: 5,
      lockDuration: 30000, // 30 seconds
      lockRenewTime: 15000, // 15 seconds
    };

    this.worker = new Worker(this.queueName, this.processJob.bind(this), {
      ...defaultOptions,
      ...options,
    });

    this.setupListeners();

    logger.info(`${this.logSource} initialized`, {}, this.logSource);
  }

  private setupListeners() {
    this.worker.on("active", (job: Job) => {
      trackJobStart(job).catch((error) => {
        logger.error(
          `Error tracking job start: ${job.id || "unknown"}`,
          { error: error instanceof Error ? error.message : "Unknown error" },
          this.logSource
        );
      });
    });

    this.worker.on("completed", (job: Job, result: R) => {
      logger.info(
        `Job ${job.id || "unknown"} completed`,
        {
          jobId: job.id || "unknown",
          jobName: job.name || "unknown",
          result:
            typeof result === "object"
              ? JSON.stringify(result)
              : String(result),
        },
        this.logSource
      );

      trackJobCompletion(job, result).catch((error) => {
        logger.error(
          `Error tracking job completion: ${job.id || "unknown"}`,
          { error: error instanceof Error ? error.message : "Unknown error" },
          this.logSource
        );
      });
    });

    this.worker.on("failed", (job: Job | undefined, error: Error) => {
      logger.error(
        `Job ${job?.id || "unknown"} failed`,
        {
          jobId: job?.id || "unknown",
          jobName: job?.name || "unknown",
          error: error.message,
          stack: error.stack || "No stack trace",
        },
        this.logSource
      );

      if (job) {
        trackJobFailure(job, error).catch((trackError) => {
          logger.error(
            `Error tracking job failure: ${job.id || "unknown"}`,
            {
              error:
                trackError instanceof Error
                  ? trackError.message
                  : "Unknown error",
            },
            this.logSource
          );
        });
      }
    });

    this.worker.on("error", (error: Error) => {
      logger.error(
        "Worker error",
        {
          error: error.message,
          stack: error.stack || "No stack trace",
        },
        this.logSource
      );
    });
  }

  /**
   * Process a job
   * This method should be implemented by subclasses
   */
  protected abstract process(job: Job<T>): Promise<R>;

  /**
   * Wrapper around the process method to handle errors
   */
  private async processJob(job: Job<T>): Promise<R> {
    try {
      // Track the job in the database
      await trackJob(job, this.extractUserId(job));

      logger.info(
        `Processing job ${job.id || "unknown"}`,
        {
          jobId: job.id || "unknown",
          jobName: job.name || "unknown",
          data: JSON.stringify(job.data),
        },
        this.logSource
      );

      const result = await this.process(job);

      return result;
    } catch (error) {
      logger.error(
        `Error processing job ${job.id || "unknown"}`,
        {
          jobId: job.id || "unknown",
          jobName: job.name || "unknown",
          error: error instanceof Error ? error.message : "Unknown error",
          stack:
            error instanceof Error
              ? error.stack || "No stack trace"
              : "No stack trace",
        },
        this.logSource
      );

      throw error;
    }
  }

  /**
   * Extract user ID from job data if available
   * @param job The job to extract user ID from
   * @returns The user ID or undefined
   */
  protected extractUserId(job: Job<T>): string | undefined {
    if (typeof job.data === "object" && job.data !== null) {
      const data = job.data as Record<string, unknown>;
      return typeof data.userId === "string" ? data.userId : undefined;
    }
    return undefined;
  }

  /**
   * Close the worker
   */
  public async close(): Promise<void> {
    logger.info(`Closing ${this.logSource}`, {}, this.logSource);
    await this.worker.close();
  }
}
