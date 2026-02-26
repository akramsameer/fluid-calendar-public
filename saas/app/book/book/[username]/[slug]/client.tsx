"use client";

import { useState, useEffect, useCallback } from "react";
import { format, addDays, parseISO, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Calendar as CalendarIcon, Clock, Globe, User, Mail, FileText, ChevronLeft, ChevronRight, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface BookingPageClientProps {
  username: string;
  slug: string;
  bookingLink: {
    id: string;
    name: string;
    description: string | null;
    duration: number;
  };
  hostName: string;
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

export function BookingPageClient({
  username,
  slug,
  bookingLink,
  hostName,
}: BookingPageClientProps) {
  const [step, setStep] = useState<"select" | "form" | "confirmed">("select");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<AvailableSlots[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(startOfDay(new Date()));

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<{
    startTime: string;
    endTime: string;
    videoLink?: string;
  } | null>(null);

  // Detect browser timezone on mount and select today by default
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // Check if it's in our list, otherwise default to UTC
    const found = TIMEZONES.find((tz) => tz.value === detected);
    setTimezone(found ? detected : "UTC");
    // Default to today's date
    setSelectedDate(startOfDay(new Date()));
  }, []);

  // Fetch availability when timezone or week changes
  const fetchAvailability = useCallback(async () => {
    if (!timezone) return;

    setLoading(true);
    setError(null);

    try {
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(addDays(weekStart, 6), "yyyy-MM-dd");

      const res = await fetch(
        `/api/book/${username}/${slug}/availability?startDate=${startDate}&endDate=${endDate}&timezone=${timezone}`
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch availability");
      }

      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch availability");
    } finally {
      setLoading(false);
    }
  }, [username, slug, timezone, weekStart]);

  useEffect(() => {
    fetchAvailability();
  }, [fetchAvailability]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlot(null);
  };

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot);
  };

  const handleContinue = () => {
    if (selectedSlot) {
      setStep("form");
    }
  };

  const handleBack = () => {
    if (step === "form") {
      setStep("select");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSlot || !formData.name || !formData.email) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/book/${username}/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: formData.name,
          guestEmail: formData.email,
          guestNotes: formData.notes || undefined,
          guestTimezone: timezone,
          startTime: selectedSlot.startTime,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create booking");
      }

      const data = await res.json();
      setBookingResult(data.booking);
      setStep("confirmed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  // Get slots for selected date
  const slotsForSelectedDate = selectedDate
    ? availableSlots.find((d) => d.date === format(selectedDate, "yyyy-MM-dd"))?.slots || []
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

  const formatSlotTime = (isoString: string): string => {
    const date = parseISO(isoString);
    const zonedDate = toZonedTime(date, timezone);
    return format(zonedDate, "h:mm a");
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Header with branding */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            FluidCalendar
          </h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left sidebar - Meeting info */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-xl">{bookingLink.name}</CardTitle>
              <CardDescription>with {hostName}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <Clock className="h-4 w-4" />
                <span>{bookingLink.duration} minutes</span>
              </div>

              {bookingLink.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {bookingLink.description}
                </p>
              )}

              {selectedSlot && (
                <div className="mt-4 rounded-lg bg-primary/10 p-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarIcon className="h-4 w-4" />
                    {selectedDate && format(selectedDate, "EEEE, MMMM d")}
                  </div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {formatSlotTime(selectedSlot.startTime)} -{" "}
                    {formatSlotTime(selectedSlot.endTime)}
                  </div>
                </div>
              )}

              {/* Timezone selector */}
              <div className="mt-4">
                <Label className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4" />
                  Timezone
                </Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="mt-1">
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
            </CardContent>
          </Card>

          {/* Main content */}
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              {error && (
                <div className="mb-4 rounded-lg bg-red-50 p-3 text-red-700 dark:bg-red-900/20 dark:text-red-400">
                  {error}
                </div>
              )}

              {step === "select" && (
                <div>
                  {/* Week navigation */}
                  <div className="mb-4 flex items-center justify-between">
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
                  <div className="mb-6 grid grid-cols-7 gap-2">
                    {weekDays.map((day) => {
                      const isSelected =
                        selectedDate &&
                        format(day, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd");
                      const hasSlots = hasAvailableSlots(day);
                      const isPast = day < startOfDay(new Date());

                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => hasSlots && !isPast && handleDateSelect(day)}
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
                          <span className="text-lg font-medium">{format(day, "d")}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time slots */}
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-gray-500">Loading availability...</p>
                    </div>
                  ) : selectedDate ? (
                    <div>
                      <h3 className="mb-3 font-medium">
                        Available times for {format(selectedDate, "EEEE, MMMM d")}
                      </h3>
                      {availableSlotsForDate.length === 0 ? (
                        <p className="text-gray-500">No available times for this day</p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {availableSlotsForDate.map((slot) => {
                            const isSelected = selectedSlot?.startTime === slot.startTime;
                            return (
                              <button
                                key={slot.startTime}
                                onClick={() => handleSlotSelect(slot)}
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

                  {/* Continue button */}
                  {selectedSlot && (
                    <div className="mt-6 flex justify-end">
                      <Button onClick={handleContinue}>Continue</Button>
                    </div>
                  )}
                </div>
              )}

              {step === "form" && (
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <Button type="button" variant="ghost" onClick={handleBack}>
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  </div>

                  <h2 className="mb-6 text-xl font-semibold">Enter your details</h2>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Name *
                      </Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        placeholder="Your name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Additional notes
                      </Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) =>
                          setFormData({ ...formData, notes: e.target.value })
                        }
                        placeholder="Anything you'd like to discuss..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Scheduling..." : "Schedule Meeting"}
                    </Button>
                  </div>
                </form>
              )}

              {step === "confirmed" && bookingResult && (
                <div className="text-center py-8">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                    <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h2 className="mb-2 text-2xl font-semibold">Booking Confirmed!</h2>
                  <p className="mb-6 text-gray-600 dark:text-gray-400">
                    A confirmation email has been sent to {formData.email}
                  </p>

                  <Card className="mx-auto max-w-sm text-left">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-500">Meeting</p>
                          <p className="font-medium">{bookingLink.name}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">When</p>
                          <p className="font-medium">
                            {format(
                              toZonedTime(parseISO(bookingResult.startTime), timezone),
                              "EEEE, MMMM d, yyyy"
                            )}
                          </p>
                          <p className="text-sm">
                            {format(
                              toZonedTime(parseISO(bookingResult.startTime), timezone),
                              "h:mm a"
                            )}{" "}
                            -{" "}
                            {format(
                              toZonedTime(parseISO(bookingResult.endTime), timezone),
                              "h:mm a"
                            )}
                          </p>
                        </div>
                        {bookingResult.videoLink && (
                          <div>
                            <p className="text-sm text-gray-500">Video Link</p>
                            <a
                              href={bookingResult.videoLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Join meeting
                            </a>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Powered by{" "}
          <a
            href="https://www.fluidcalendar.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium hover:text-primary hover:underline"
          >
            FluidCalendar
          </a>
        </div>
      </div>
    </div>
  );
}
