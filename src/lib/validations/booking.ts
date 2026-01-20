import { z } from "zod";

import { RESERVED_USERNAMES } from "@/types/booking";

// Username validation schema
export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$/,
    "Username must start and end with a letter or number, and can only contain lowercase letters, numbers, and hyphens"
  )
  .refine(
    (val) => !val.includes("--"),
    "Username cannot contain consecutive hyphens"
  )
  .refine(
    (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
    "This username is reserved"
  );

// Slug validation schema
export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(50, "Slug must be at most 50 characters")
  .regex(
    /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/,
    "Slug must contain only lowercase letters, numbers, and hyphens"
  );

// Duration validation
export const durationSchema = z.enum(["15", "30", "45", "60"]).transform(Number);

// Day availability schema
export const dayAvailabilitySchema = z.object({
  enabled: z.boolean(),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:mm)"),
});

// Custom availability schema
export const customAvailabilitySchema = z.object({
  monday: dayAvailabilitySchema,
  tuesday: dayAvailabilitySchema,
  wednesday: dayAvailabilitySchema,
  thursday: dayAvailabilitySchema,
  friday: dayAvailabilitySchema,
  saturday: dayAvailabilitySchema,
  sunday: dayAvailabilitySchema,
});

// Video provider schema
export const videoProviderSchema = z.enum(["google_meet", "zoom", "teams"]).nullable();

// Create booking link schema
export const createBookingLinkSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  slug: slugSchema,
  description: z.string().max(500, "Description must be at most 500 characters").optional(),
  duration: z.number().refine((val) => [15, 30, 45, 60].includes(val), "Duration must be 15, 30, 45, or 60 minutes"),
  selectedCalendars: z.array(z.string()).min(1, "At least one calendar must be selected"),
  targetCalendarId: z.string().min(1, "Target calendar is required"),
  availabilityType: z.enum(["working_hours", "custom"]).default("working_hours"),
  customAvailability: customAvailabilitySchema.optional(),
  bufferBefore: z.number().min(0).max(120).default(0),
  bufferAfter: z.number().min(0).max(120).default(0),
  minNotice: z.number().min(0).max(10080).default(60), // Max 7 days in minutes
  maxFutureDays: z.number().min(1).max(365).default(60),
  videoProvider: videoProviderSchema.optional(),
});

// Update booking link schema
export const updateBookingLinkSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: slugSchema.optional(),
  description: z.string().max(500).optional().nullable(),
  duration: z.number().refine((val) => [15, 30, 45, 60].includes(val)).optional(),
  selectedCalendars: z.array(z.string()).min(1).optional(),
  targetCalendarId: z.string().min(1).optional(),
  availabilityType: z.enum(["working_hours", "custom"]).optional(),
  customAvailability: customAvailabilitySchema.optional().nullable(),
  bufferBefore: z.number().min(0).max(120).optional(),
  bufferAfter: z.number().min(0).max(120).optional(),
  minNotice: z.number().min(0).max(10080).optional(),
  maxFutureDays: z.number().min(1).max(365).optional(),
  videoProvider: videoProviderSchema.optional(),
  enabled: z.boolean().optional(),
});

// Create booking schema (guest submission)
export const createBookingSchema = z.object({
  guestName: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  guestEmail: z.string().email("Please enter a valid email address"),
  guestNotes: z.string().max(1000, "Notes must be at most 1000 characters").optional(),
  guestTimezone: z.string().min(1, "Timezone is required"),
  startTime: z.string().datetime("Invalid datetime format"),
});

// Availability request schema
export const availabilityRequestSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  timezone: z.string().min(1, "Timezone is required"),
});

// Cancel booking schema
export const cancelBookingSchema = z.object({
  cancelToken: z.string().optional(),
  reason: z.string().max(500, "Reason must be at most 500 characters").optional(),
});

// Reschedule booking schema
export const rescheduleBookingSchema = z.object({
  cancelToken: z.string().optional(),
  startTime: z.string().datetime("Invalid datetime format"),
  guestTimezone: z.string().min(1, "Timezone is required"),
});

// Type exports for inferred types
export type CreateBookingLinkInput = z.infer<typeof createBookingLinkSchema>;
export type UpdateBookingLinkInput = z.infer<typeof updateBookingLinkSchema>;
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type AvailabilityRequestInput = z.infer<typeof availabilityRequestSchema>;
export type CancelBookingInput = z.infer<typeof cancelBookingSchema>;
export type RescheduleBookingInput = z.infer<typeof rescheduleBookingSchema>;
