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

// Lazy-loaded queue options (don't call getRedisOptions at module load time)
function getDefaultQueueOptions() {
  return {
    ...getRedisOptions(),
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential" as const,
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
}

// Email queue options with rate limiter (2 emails per second)
function getEmailQueueOptions() {
  return {
    ...getDefaultQueueOptions(),
    limiter: {
      max: 1, // Maximum 2 jobs
      duration: 1000, // Per 1 second (1000ms)
    },
  };
}

// Lazy-loaded queue instances (created on first access to avoid Redis connection during build)
let _calendarSyncQueue: Queue | null = null;
let _emailQueue: Queue | null = null;
let _dailySummaryQueue: Queue | null = null;
let _taskReminderQueue: Queue | null = null;
let _maintenanceQueue: Queue | null = null;
let _taskScheduleQueue: Queue | null = null;
let _testCronQueue: Queue | null = null;
let _taskSyncQueue: Queue<TaskSyncJobData> | null = null;

// Lazy getters for queues
export function getCalendarSyncQueue(): Queue {
  if (!_calendarSyncQueue) {
    _calendarSyncQueue = new Queue(QUEUE_NAMES.CALENDAR_SYNC, getDefaultQueueOptions());
  }
  return _calendarSyncQueue;
}

export function getEmailQueue(): Queue {
  if (!_emailQueue) {
    _emailQueue = new Queue(QUEUE_NAMES.EMAIL, getEmailQueueOptions());
  }
  return _emailQueue;
}

export function getDailySummaryQueue(): Queue {
  if (!_dailySummaryQueue) {
    _dailySummaryQueue = new Queue(QUEUE_NAMES.DAILY_SUMMARY, getDefaultQueueOptions());
  }
  return _dailySummaryQueue;
}

export function getTaskReminderQueue(): Queue {
  if (!_taskReminderQueue) {
    _taskReminderQueue = new Queue(QUEUE_NAMES.TASK_REMINDER, getDefaultQueueOptions());
  }
  return _taskReminderQueue;
}

export function getMaintenanceQueue(): Queue {
  if (!_maintenanceQueue) {
    _maintenanceQueue = new Queue(QUEUE_NAMES.MAINTENANCE, getDefaultQueueOptions());
  }
  return _maintenanceQueue;
}

export function getTaskScheduleQueue(): Queue {
  if (!_taskScheduleQueue) {
    _taskScheduleQueue = new Queue(QUEUE_NAMES.TASK_SCHEDULE, getDefaultQueueOptions());
  }
  return _taskScheduleQueue;
}

export function getTestCronQueue(): Queue {
  if (!_testCronQueue) {
    _testCronQueue = new Queue(QUEUE_NAMES.TEST_CRON, getDefaultQueueOptions());
  }
  return _testCronQueue;
}

export function getTaskSyncQueue(): Queue<TaskSyncJobData> {
  if (!_taskSyncQueue) {
    _taskSyncQueue = new Queue<TaskSyncJobData>(QUEUE_NAMES.TASK_SYNC, {
      ...getDefaultQueueOptions(),
      defaultJobOptions: {
        ...getDefaultQueueOptions().defaultJobOptions,
        attempts: 5, // More attempts for task sync due to possible API limits
        backoff: {
          type: "exponential" as const,
          delay: 5000, // Start with 5 seconds, then exponential backoff
        },
      },
    });
  }
  return _taskSyncQueue;
}

// Queue map for easy access (lazy-loaded)
export function getQueues() {
  return {
    [QUEUE_NAMES.CALENDAR_SYNC]: getCalendarSyncQueue(),
    [QUEUE_NAMES.EMAIL]: getEmailQueue(),
    [QUEUE_NAMES.DAILY_SUMMARY]: getDailySummaryQueue(),
    [QUEUE_NAMES.TASK_REMINDER]: getTaskReminderQueue(),
    [QUEUE_NAMES.MAINTENANCE]: getMaintenanceQueue(),
    [QUEUE_NAMES.TASK_SCHEDULE]: getTaskScheduleQueue(),
    [QUEUE_NAMES.TEST_CRON]: getTestCronQueue(),
    [QUEUE_NAMES.TASK_SYNC]: getTaskSyncQueue(),
  };
}

// Legacy export for backward compatibility
export const queues = {
  get [QUEUE_NAMES.CALENDAR_SYNC]() { return getCalendarSyncQueue(); },
  get [QUEUE_NAMES.EMAIL]() { return getEmailQueue(); },
  get [QUEUE_NAMES.DAILY_SUMMARY]() { return getDailySummaryQueue(); },
  get [QUEUE_NAMES.TASK_REMINDER]() { return getTaskReminderQueue(); },
  get [QUEUE_NAMES.MAINTENANCE]() { return getMaintenanceQueue(); },
  get [QUEUE_NAMES.TASK_SCHEDULE]() { return getTaskScheduleQueue(); },
  get [QUEUE_NAMES.TEST_CRON]() { return getTestCronQueue(); },
  get [QUEUE_NAMES.TASK_SYNC]() { return getTaskSyncQueue(); },
};

// Initialize all queues
export async function initializeQueues() {
  logger.info("Initializing BullMQ queues", {}, LOG_SOURCE);

  // Add event listeners to each queue
  const queueMap = getQueues();
  Object.entries(queueMap).forEach(([name, queue]) => {
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

  const queueMap = getQueues();
  await Promise.all(
    Object.entries(queueMap).map(async ([name, queue]) => {
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
  const job = await getCalendarSyncQueue().add("sync", data, {
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
  const job = await getEmailQueue().add("send", data, {
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
  const job = await getDailySummaryQueue().add("generate", data, {
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
  const job = await getTaskReminderQueue().add("remind", data, {
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
  const job = await getMaintenanceQueue().add("cleanup-orphaned-records", data, {
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
    const queue = getTaskScheduleQueue();
    const existingJobs = await queue.getJobs([
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
    const job = await queue.add("schedule-tasks", data, {
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
  const job = await getTestCronQueue().add("send", data, {
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
  const job = await getTaskSyncQueue().add("sync", data, {
    ...options,
    jobId, // Use the generated UUID as the job ID
  });

  return job;
}
