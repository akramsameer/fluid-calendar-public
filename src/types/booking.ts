import { BookingLink as PrismaBookingLink, Booking as PrismaBooking } from "@prisma/client";

// Re-export Prisma types with enhancements
export type BookingLink = PrismaBookingLink;
export type Booking = PrismaBooking;

// Booking link with relations
export interface BookingLinkWithBookings extends BookingLink {
  bookings: Booking[];
}

// Duration options for booking links
export type BookingDuration = 15 | 30 | 45 | 60;

// Video provider options
export type VideoProvider = "google_meet" | "zoom" | null;

// Availability type options
export type AvailabilityType = "working_hours" | "custom";

// Booking status
export type BookingStatus = "confirmed" | "cancelled";

// Custom availability for a single day
export interface DayAvailability {
  enabled: boolean;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
}

// Custom availability configuration (JSON structure)
export interface CustomAvailability {
  monday: DayAvailability;
  tuesday: DayAvailability;
  wednesday: DayAvailability;
  thursday: DayAvailability;
  friday: DayAvailability;
  saturday: DayAvailability;
  sunday: DayAvailability;
}

// Time slot for availability display
export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
}

// Available slots for a date range
export interface AvailableSlots {
  date: string; // ISO date string YYYY-MM-DD
  slots: TimeSlot[];
}

// Booking link creation payload
export interface CreateBookingLinkInput {
  name: string;
  slug: string;
  description?: string;
  duration: BookingDuration;
  selectedCalendars: string[]; // Calendar feed IDs
  targetCalendarId: string;
  availabilityType?: AvailabilityType;
  customAvailability?: CustomAvailability;
  bufferBefore?: number;
  bufferAfter?: number;
  minNotice?: number;
  maxFutureDays?: number;
  videoProvider?: VideoProvider;
}

// Booking link update payload
export interface UpdateBookingLinkInput {
  name?: string;
  slug?: string;
  description?: string;
  duration?: BookingDuration;
  selectedCalendars?: string[];
  targetCalendarId?: string;
  availabilityType?: AvailabilityType;
  customAvailability?: CustomAvailability;
  bufferBefore?: number;
  bufferAfter?: number;
  minNotice?: number;
  maxFutureDays?: number;
  videoProvider?: VideoProvider;
  enabled?: boolean;
}

// Booking submission payload (from guest)
export interface CreateBookingInput {
  guestName: string;
  guestEmail: string;
  guestNotes?: string;
  guestTimezone: string;
  startTime: string; // ISO datetime string
}

// Public booking link info (for the booking page)
export interface PublicBookingLinkInfo {
  name: string;
  description?: string;
  duration: number;
  hostName: string;
  enabled: boolean;
}

// Availability request parameters
export interface AvailabilityRequest {
  startDate: string; // ISO date YYYY-MM-DD
  endDate: string; // ISO date YYYY-MM-DD
  timezone: string;
}

// Username validation result
export interface UsernameValidationResult {
  available: boolean;
  reason?: string;
}

// Reserved usernames that cannot be used
export const RESERVED_USERNAMES = [
  "admin",
  "api",
  "app",
  "auth",
  "book",
  "booking",
  "calendar",
  "dashboard",
  "help",
  "login",
  "logout",
  "profile",
  "settings",
  "signup",
  "support",
  "user",
  "users",
  "www",
];

// Feature gating for booking links
export interface BookingFeatureAccess {
  canCreateBookingLink: boolean;
  canUseVideoConferencing: boolean;
  canUseBufferTime: boolean;
  canUseCustomAvailability: boolean;
  maxBookingLinks: number | null; // null = unlimited
}
