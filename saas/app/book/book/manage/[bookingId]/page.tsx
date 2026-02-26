"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { format, addDays, parseISO, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import {
  Check,
  X,
  Calendar as CalendarIcon,
  Clock,
  Globe,
  ChevronLeft,
  ChevronRight,
  Video,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PageProps {
  params: Promise<{ bookingId: string }>;
}

interface BookingDetails {
  guestName: string;
  guestEmail: string;
  meetingTitle: string;
  startTime: string;
  endTime: string;
  hostName: string;
  videoLink: string | null;
  status: string;
  bookingLink: {
    id: string;
    name: string;
    duration: number;
    username: string;
    slug: string;
  };
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
}

interface AvailableSlots {
  date: string;
  slots: TimeSlot[];
}

// Common timezones
const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (AZ)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST)" },
  { value: "Asia/Dubai", label: "Dubai (GST)" },
  { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  { value: "UTC", label: "UTC" },
];

type PageStatus =
  | "loading"
  | "view"
  | "reschedule"
  | "cancelled"
  | "rescheduled"
  | "error";

export default function ManageBookingPage({ params }: PageProps) {
  const searchParams = useSearchParams();
  const [bookingId, setBookingId] = useState<string | null>(null);
  const cancelToken = searchParams.get("token");

  const [status, setStatus] = useState<PageStatus>("loading");
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Reschedule state
  const [timezone, setTimezone] = useState<string>("");
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [newBookingResult, setNewBookingResult] = useState<{
    startTime: string;
    endTime: string;
    videoLink?: string;
  } | null>(null);

  // Get booking ID from params
  useEffect(() => {
    params.then((p) => setBookingId(p.bookingId));
  }, [params]);

  // Detect browser timezone on mount
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const found = TIMEZONES.find((tz) => tz.value === detected);
    setTimezone(found ? detected : "UTC");
  }, []);

  // Fetch booking details
  useEffect(() => {
    if (!bookingId) return;

    async function fetchBooking() {
      try {
        const res = await fetch(`/api/book/booking/${bookingId}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Booking not found");
        }
        const data = await res.json();

        if (data.status === "cancelled") {
          setErrorMessage("This booking has already been cancelled.");
          setStatus("error");
          return;
        }

        setBooking(data);
        setStatus("view");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load booking"
        );
        setStatus("error");
      }
    }

    fetchBooking();
  }, [bookingId]);

  // Fetch availability for reschedule
  const fetchAvailability = useCallback(async () => {
    if (!timezone || !booking) return;

    setLoadingSlots(true);

    try {
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

      const res = await fetch(
        `/api/book/${booking.bookingLink.username}/${booking.bookingLink.slug}/availability?startDate=${startDate}&endDate=${endDate}&timezone=${timezone}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch availability");
      }

      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to fetch availability"
      );
    } finally {
      setLoadingSlots(false);
    }
  }, [booking, timezone, weekStart]);

  useEffect(() => {
    if (status === "reschedule") {
      fetchAvailability();
    }
  }, [status, fetchAvailability]);

  const handleCancel = async () => {
    if (!bookingId) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/book/cancel/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancelToken,
          reason: reason || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel booking");
      }

      setStatus("cancelled");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to cancel booking"
      );
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReschedule = async () => {
    if (!bookingId || !selectedSlot) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/book/reschedule/${bookingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cancelToken,
          startTime: selectedSlot.startTime,
          guestTimezone: timezone,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reschedule booking");
      }

      const data = await res.json();
      setNewBookingResult(data.booking);
      setStatus("rescheduled");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to reschedule booking"
      );
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatSlotTime = (isoString: string): string => {
    const date = parseISO(isoString);
    const zonedDate = toZonedTime(date, timezone);
    return format(zonedDate, "h:mm a");
  };

  const formatDateTime = (isoString: string): string => {
    const date = parseISO(isoString);
    const zonedDate = toZonedTime(date, timezone);
    return format(zonedDate, "EEEE, MMMM d, yyyy 'at' h:mm a");
  };

  // Get slots for selected date
  const slotsForSelectedDate = selectedDate
    ? availableSlots.find(
        (d) => d.date === format(selectedDate, "yyyy-MM-dd")
      )?.slots || []
    : [];

  const availableSlotsForDate = slotsForSelectedDate.filter((s) => s.available);

  // Generate week days
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Check if a date has available slots
  const hasAvailableSlots = (date: Date): boolean => {
    const dateStr = format(date, "yyyy-MM-dd");
    const daySlots = availableSlots.find((d) => d.date === dateStr);
    return daySlots?.slots.some((s) => s.available) || false;
  };

  if (status === "loading" || !bookingId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl">
        {/* View booking details */}
        {status === "view" && booking && (
          <>
            <CardHeader>
              <CardTitle>Manage Your Booking</CardTitle>
              <CardDescription>
                View your booking details or make changes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Booking details */}
              <div className="rounded-lg bg-gray-100 p-4 dark:bg-gray-800">
                <h3 className="font-semibold text-lg mb-3">
                  {booking.meetingTitle}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <CalendarIcon className="h-4 w-4" />
                    <span>{formatDateTime(booking.startTime)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{booking.bookingLink.duration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Host:</span>
                    <span>{booking.hostName}</span>
                  </div>
                  {booking.videoLink && (
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Video className="h-4 w-4" />
                      <a
                        href={booking.videoLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Join video call
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedSlot(null);
                    setStatus("reschedule");
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reschedule
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleCancel}
                  disabled={submitting}
                >
                  {submitting ? "Cancelling..." : "Cancel Booking"}
                </Button>
              </div>

              {/* Optional reason field */}
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm text-gray-500">
                  Cancellation reason (optional)
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Let the host know why you're cancelling..."
                  rows={2}
                />
              </div>
            </CardContent>
          </>
        )}

        {/* Reschedule view */}
        {status === "reschedule" && booking && (
          <>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStatus("view")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div>
                  <CardTitle>Reschedule Booking</CardTitle>
                  <CardDescription>
                    Select a new date and time for your meeting
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current booking info */}
              <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20 text-sm">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  Current booking:
                </p>
                <p className="text-yellow-700 dark:text-yellow-300">
                  {formatDateTime(booking.startTime)}
                </p>
              </div>

              {/* Timezone selector */}
              <div>
                <Label className="flex items-center gap-2 text-sm mb-2">
                  <Globe className="h-4 w-4" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Week navigation */}
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, -7))}
                  disabled={weekStart <= startOfDay(new Date())}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {format(weekStart, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setWeekStart(addDays(weekStart, 7))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Date grid */}
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => {
                  const isSelected =
                    selectedDate &&
                    format(day, "yyyy-MM-dd") ===
                      format(selectedDate, "yyyy-MM-dd");
                  const hasSlots = hasAvailableSlots(day);
                  const isPast = day < startOfDay(new Date());

                  return (
                    <button
                      key={day.toISOString()}
                      onClick={() => {
                        if (hasSlots && !isPast) {
                          setSelectedDate(day);
                          setSelectedSlot(null);
                        }
                      }}
                      disabled={!hasSlots || isPast}
                      className={`flex flex-col items-center rounded-lg p-3 text-center transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : hasSlots && !isPast
                            ? "hover:bg-gray-100 dark:hover:bg-gray-800"
                            : "text-gray-400 cursor-not-allowed"
                      }`}
                    >
                      <span className="text-xs">{format(day, "EEE")}</span>
                      <span className="text-lg font-medium">
                        {format(day, "d")}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Time slots */}
              {loadingSlots ? (
                <div className="flex items-center justify-center py-4">
                  <p className="text-gray-500">Loading availability...</p>
                </div>
              ) : selectedDate ? (
                <div>
                  <h3 className="mb-3 font-medium">
                    Available times for {format(selectedDate, "EEEE, MMMM d")}
                  </h3>
                  {availableSlotsForDate.length === 0 ? (
                    <p className="text-gray-500">
                      No available times for this day
                    </p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {availableSlotsForDate.map((slot) => {
                        const isSelected =
                          selectedSlot?.startTime === slot.startTime;
                        return (
                          <button
                            key={slot.startTime}
                            onClick={() => setSelectedSlot(slot)}
                            className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "hover:border-primary"
                            }`}
                          >
                            {formatSlotTime(slot.startTime)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-500">
                  Select a date to see available times
                </p>
              )}

              {/* Confirm reschedule button */}
              {selectedSlot && (
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStatus("view")}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleReschedule}
                    disabled={submitting}
                  >
                    {submitting ? "Rescheduling..." : "Confirm New Time"}
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}

        {/* Cancelled confirmation */}
        {status === "cancelled" && (
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Booking Cancelled</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Your meeting has been cancelled. A confirmation email has been
              sent.
            </p>
          </CardContent>
        )}

        {/* Rescheduled confirmation */}
        {status === "rescheduled" && newBookingResult && (
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Booking Rescheduled</h2>
            <p className="mb-6 text-gray-600 dark:text-gray-400">
              Your meeting has been rescheduled. A confirmation email has been
              sent.
            </p>

            <div className="mx-auto max-w-sm rounded-lg bg-gray-100 p-4 text-left dark:bg-gray-800">
              <p className="text-sm text-gray-500 mb-1">New time:</p>
              <p className="font-medium">
                {formatDateTime(newBookingResult.startTime)}
              </p>
              {newBookingResult.videoLink && (
                <div className="mt-3">
                  <p className="text-sm text-gray-500 mb-1">Video link:</p>
                  <a
                    href={newBookingResult.videoLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Join video call
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        )}

        {/* Error state */}
        {status === "error" && (
          <CardContent className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <X className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold">Something went wrong</h2>
            <p className="text-gray-600 dark:text-gray-400">{errorMessage}</p>
          </CardContent>
        )}
      </Card>

      <div className="fixed bottom-4 text-center text-sm text-gray-500">
        Powered by <span className="font-medium">FluidCalendar</span>
      </div>
    </div>
  );
}
