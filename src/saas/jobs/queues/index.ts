import { Queue, JobsOptions } from "bullmq";
import { getRedisOptions } from "../config/redis";
import { logger } from "@/lib/logger";
import { trackJobCreation } from "../utils/job-creator";
import { v4 as uuidv4 } from "uuid";

const LOG_SOURCE = "BullMQQueues";

// Queue names
export const QUEUE_NAMES = {
  CALENDAR_SYNC: "calendar-sync",
  EMAIL: "email",
  DAILY_SUMMARY: "daily-summary",
  TASK_REMINDER: "task-reminder",
  MAINTENANCE: "maintenance",
};

// Queue options
const defaultQueueOptions = {
  ...getRedisOptions(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep successful jobs for 24 hours
      count: 1000, // Keep at most 1000 successful jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
};

// Email queue options with rate limiter (2 emails per second)
const emailQueueOptions = {
  ...defaultQueueOptions,
  limiter: {
    max: 2, // Maximum 2 jobs
    duration: 1000, // Per 1 second (1000ms)
  },
};

// Create queues
export const calendarSyncQueue = new Queue(
  QUEUE_NAMES.CALENDAR_SYNC,
  defaultQueueOptions
);
export const emailQueue = new Queue(QUEUE_NAMES.EMAIL, emailQueueOptions);
export const dailySummaryQueue = new Queue(
  QUEUE_NAMES.DAILY_SUMMARY,
  defaultQueueOptions
);
export const taskReminderQueue = new Queue(
  QUEUE_NAMES.TASK_REMINDER,
  defaultQueueOptions
);
export const maintenanceQueue = new Queue(
  QUEUE_NAMES.MAINTENANCE,
  defaultQueueOptions
);

// Queue map for easy access
export const queues = {
  [QUEUE_NAMES.CALENDAR_SYNC]: calendarSyncQueue,
  [QUEUE_NAMES.EMAIL]: emailQueue,
  [QUEUE_NAMES.DAILY_SUMMARY]: dailySummaryQueue,
  [QUEUE_NAMES.TASK_REMINDER]: taskReminderQueue,
  [QUEUE_NAMES.MAINTENANCE]: maintenanceQueue,
};

// Initialize all queues
export async function initializeQueues() {
  logger.info("Initializing BullMQ queues", {}, LOG_SOURCE);

  // Add event listeners to each queue
  Object.entries(queues).forEach(([name, queue]) => {
    queue.on("error", (error) => {
      logger.error(
        `Error in queue ${name}`,
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
    });

    logger.info(`Queue ${name} initialized`, {}, LOG_SOURCE);
  });
}

// Close all queues
export async function closeQueues() {
  logger.info("Closing BullMQ queues", {}, LOG_SOURCE);

  await Promise.all(
    Object.entries(queues).map(async ([name, queue]) => {
      try {
        await queue.close();
        logger.info(`Queue ${name} closed`, {}, LOG_SOURCE);
      } catch (error) {
        logger.error(
          `Error closing queue ${name}`,
          { error: error instanceof Error ? error.message : "Unknown error" },
          LOG_SOURCE
        );
      }
    })
  );
}

// Types for job data
export interface CalendarSyncJobData {
  userId: string;
  calendarId: string;
  fullSync?: boolean;
  fromDate?: string;
  toDate?: string;
}

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType?: string;
  }>;
}

export interface DailySummaryJobData {
  userId: string;
  email: string;
  date?: string; // ISO date string, defaults to today
  timezone?: string;
}

export interface TaskReminderJobData {
  userId: string;
  taskId: string;
  email: string;
}

export interface MaintenanceJobData {
  olderThanHours?: number; // Default could be 24
}

// Helper functions to add jobs to queues
export async function addCalendarSyncJob(
  data: CalendarSyncJobData,
  options?: JobsOptions
) {
  // Generate a UUID for the job ID to ensure uniqueness across queues
  const jobId = uuidv4();

  // Track the job in the database FIRST
  await trackJobCreation(
    QUEUE_NAMES.CALENDAR_SYNC,
    jobId,
    "sync",
    data,
    data.userId
  );

  // Then add the job to the queue
  const job = await calendarSyncQueue.add("sync", data, {
    ...options,
    jobId, // Use the generated UUID as the job ID
  });

  return job;
}

export async function addEmailJob(data: EmailJobData, options?: JobsOptions) {
  // Generate a UUID for the job ID to ensure uniqueness across queues
  const jobId = uuidv4();

  // Track the job in the database FIRST
  await trackJobCreation(
    QUEUE_NAMES.EMAIL,
    jobId,
    "send",
    data,
    undefined // Email jobs might not have a userId
  );

  // Then add the job to the queue
  const job = await emailQueue.add("send", data, {
    ...options,
    jobId, // Use the generated UUID as the job ID
  });

  return job;
}

export async function addDailySummaryJob(
  data: DailySummaryJobData,
  options?: JobsOptions
) {
  // Generate a UUID for the job ID to ensure uniqueness across queues
  const jobId = uuidv4();

  // Track the job in the database FIRST
  await trackJobCreation(
    QUEUE_NAMES.DAILY_SUMMARY,
    jobId,
    "generate",
    data,
    data.userId
  );

  // Then add the job to the queue
  const job = await dailySummaryQueue.add("generate", data, {
    ...options,
    jobId, // Use the generated UUID as the job ID
  });

  return job;
}

export async function addTaskReminderJob(
  data: TaskReminderJobData,
  options?: JobsOptions
) {
  // Generate a UUID for the job ID to ensure uniqueness across queues
  const jobId = uuidv4();

  // Track the job in the database FIRST
  await trackJobCreation(
    QUEUE_NAMES.TASK_REMINDER,
    jobId,
    "remind",
    data,
    data.userId
  );

  // Then add the job to the queue
  const job = await taskReminderQueue.add("remind", data, {
    ...options,
    jobId, // Use the generated UUID as the job ID
  });

  return job;
}

export async function addCleanupOrphanedRecordsJob(
  data: MaintenanceJobData = { olderThanHours: 24 },
  options?: JobsOptions
) {
  // Generate a UUID for the job ID to ensure uniqueness across queues
  const jobId = uuidv4();

  // Track the job in the database FIRST
  await trackJobCreation(
    QUEUE_NAMES.MAINTENANCE,
    jobId,
    "cleanup-orphaned-records",
    data,
    undefined // System job, no user ID
  );

  // Then add the job to the queue
  const job = await maintenanceQueue.add("cleanup-orphaned-records", data, {
    ...options,
    jobId, // Use the generated UUID as the job ID
  });

  return job;
}

// Schedule daily summary emails for all users
export async function scheduleDailySummaryEmails() {
  // This will be implemented later when we create the scheduler
  logger.info("Scheduling daily summary emails", {}, LOG_SOURCE);
  // TODO: Fetch all users and schedule daily summary emails
}
