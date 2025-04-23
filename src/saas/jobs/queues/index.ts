import { JobsOptions, Queue } from "bullmq";
import { v4 as uuidv4 } from "uuid";

import { logger } from "@/lib/logger";

import { getRedisOptions } from "../config/redis";
import { trackJobCreation } from "../utils/job-creator";

const LOG_SOURCE = "BullMQQueues";

// Queue names
export const QUEUE_NAMES = {
  CALENDAR_SYNC: "calendar-sync",
  EMAIL: "email",
  DAILY_SUMMARY: "daily-summary",
  TASK_REMINDER: "task-reminder",
  MAINTENANCE: "maintenance",
  TASK_SCHEDULE: "task-schedule",
  TEST_CRON: "test-cron",
  TASK_SYNC: "task-sync",
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
    max: 1, // Maximum 2 jobs
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
export const taskScheduleQueue = new Queue(
  QUEUE_NAMES.TASK_SCHEDULE,
  defaultQueueOptions
);
export const testCronQueue = new Queue(
  QUEUE_NAMES.TEST_CRON,
  defaultQueueOptions
);
export const taskSyncQueue = new Queue<TaskSyncJobData>(QUEUE_NAMES.TASK_SYNC, {
  ...defaultQueueOptions,
  defaultJobOptions: {
    ...defaultQueueOptions.defaultJobOptions,
    attempts: 5, // More attempts for task sync due to possible API limits
    backoff: {
      type: "exponential",
      delay: 5000, // Start with 5 seconds, then exponential backoff
    },
  },
});

// Queue map for easy access
export const queues = {
  [QUEUE_NAMES.CALENDAR_SYNC]: calendarSyncQueue,
  [QUEUE_NAMES.EMAIL]: emailQueue,
  [QUEUE_NAMES.DAILY_SUMMARY]: dailySummaryQueue,
  [QUEUE_NAMES.TASK_REMINDER]: taskReminderQueue,
  [QUEUE_NAMES.MAINTENANCE]: maintenanceQueue,
  [QUEUE_NAMES.TASK_SCHEDULE]: taskScheduleQueue,
  [QUEUE_NAMES.TEST_CRON]: testCronQueue,
  [QUEUE_NAMES.TASK_SYNC]: taskSyncQueue,
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

export interface TaskScheduleJobData {
  userId: string;
  settings: Record<string, unknown>;
  [key: string]: unknown; // Add index signature to satisfy JobData constraint
}

export interface TestCronJobData {
  timestamp: string;
  email: string;
}

export interface TaskSyncJobData {
  userId?: string;
  providerId?: string;
  mappingId?: string;
  fullSync?: boolean;
  syncAll?: boolean; // If true, sync all mappings for a user
  direction?: "incoming" | "outgoing" | "bidirectional"; // Controls sync direction
  [key: string]: unknown; // Add index signature to satisfy JobData constraint
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

export async function addTaskScheduleJob(
  data: TaskScheduleJobData,
  options?: JobsOptions
) {
  try {
    // Create a base job ID for the user
    const baseJobId = `schedule-tasks-${data.userId}`;

    // Check if a job with this base ID already exists and is waiting, active, or delayed
    const existingJobs = await taskScheduleQueue.getJobs([
      "waiting",
      "active",
      "delayed",
    ]);
    const existingJob = existingJobs.find((job) =>
      job.id?.startsWith(baseJobId)
    );

    if (existingJob) {
      logger.info(
        "Task scheduling job already exists for this user, skipping",
        { userId: data.userId },
        LOG_SOURCE
      );
      return existingJob;
    }

    // Create a unique job ID with timestamp to ensure uniqueness
    const timestamp = new Date().getTime();
    const jobId = `${baseJobId}-${timestamp}`;

    await trackJobCreation(
      QUEUE_NAMES.TASK_SCHEDULE,
      jobId,
      "schedule-tasks",
      data,
      data.userId
    );

    // Add the job with a delay to allow for batching multiple task changes
    const job = await taskScheduleQueue.add("schedule-tasks", data, {
      jobId,
      delay: 5000, // 5 second delay to allow for batching
      ...options,
    });

    logger.info(
      "Added task scheduling job with debounce",
      {
        userId: data.userId,
        jobId: job.id || "unknown",
      },
      LOG_SOURCE
    );

    return job;
  } catch (error) {
    logger.error(
      "Error adding task scheduling job",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        userId: data.userId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}

export async function addTestCronJob(
  data: TestCronJobData,
  options?: JobsOptions
) {
  // Generate a UUID for the job ID to ensure uniqueness across queues
  const jobId = uuidv4();

  // Track the job in the database FIRST
  await trackJobCreation(
    QUEUE_NAMES.TEST_CRON,
    jobId,
    "send",
    data,
    undefined // Test cron jobs might not have a userId
  );

  // Then add the job to the queue
  const job = await testCronQueue.add("send", data, {
    ...options,
    jobId, // Use the generated UUID as the job ID
  });

  return job;
}

/**
 * Add a task sync job to synchronize a specific task mapping or all mappings for a user
 */
export async function addTaskSyncJob(
  data: TaskSyncJobData,
  options?: JobsOptions
) {
  // Generate a UUID for the job ID to ensure uniqueness across queues
  const jobId = uuidv4();

  // Track the job in the database FIRST
  await trackJobCreation(
    QUEUE_NAMES.TASK_SYNC,
    jobId,
    "sync",
    data,
    data.userId || undefined // Task sync jobs may not have a userId
  );

  // Then add the job to the queue
  const job = await taskSyncQueue.add("sync", data, {
    ...options,
    jobId, // Use the generated UUID as the job ID
  });

  return job;
}
