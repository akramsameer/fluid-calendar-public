"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar, Clock, ExternalLink, Mail, MessageSquare, User, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface Booking {
  id: string;
  guestName: string;
  guestEmail: string;
  guestNotes: string | null;
  guestTimezone: string;
  startTime: string;
  endTime: string;
  status: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  videoLink: string | null;
  bookingLink: {
    id: string;
    name: string;
    slug: string;
    duration: number;
  };
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancellingBooking, setCancellingBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchBookings = useCallback(async (timeframe: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (timeframe === "upcoming") {
        params.set("timeframe", "upcoming");
      } else if (timeframe === "past") {
        params.set("timeframe", "past");
      } else if (timeframe === "cancelled") {
        params.set("status", "cancelled");
      }

      const res = await fetch(`/api/bookings?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch bookings");
      }

      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings(activeTab);
  }, [activeTab, fetchBookings]);

  const handleCancelClick = (booking: Booking) => {
    setCancellingBooking(booking);
    setCancelReason("");
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!cancellingBooking) return;

    try {
      setIsCancelling(true);

      const res = await fetch(`/api/book/cancel/${cancellingBooking.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancelReason || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to cancel booking");
      }

      toast.success("Booking cancelled successfully");
      setCancelDialogOpen(false);
      setCancellingBooking(null);

      // Refresh the list
      fetchBookings(activeTab);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel booking");
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: format(date, "EEEE, MMMM d, yyyy"),
      time: format(date, "h:mm a"),
    };
  };

  const renderBookingCard = (booking: Booking) => {
    const { date, time } = formatDateTime(booking.startTime);
    const endTime = format(new Date(booking.endTime), "h:mm a");
    const isPast = new Date(booking.startTime) < new Date();
    const isCancelled = booking.status === "cancelled";

    return (
      <Card key={booking.id} className={isCancelled ? "opacity-60" : ""}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {booking.bookingLink.name}
                {isCancelled && (
                  <Badge variant="destructive" className="text-xs">
                    Cancelled
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="flex items-center gap-1 mt-1">
                <Calendar className="h-3 w-3" />
                {date}
              </CardDescription>
            </div>
            {!isCancelled && !isPast && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleCancelClick(booking)}
              >
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>
                {time} - {endTime}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="text-xs">({booking.guestTimezone})</span>
            </div>
          </div>

          <div className="border-t pt-3 space-y-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{booking.guestName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <a
                href={`mailto:${booking.guestEmail}`}
                className="text-sm text-primary hover:underline"
              >
                {booking.guestEmail}
              </a>
            </div>
            {booking.guestNotes && (
              <div className="flex items-start gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">{booking.guestNotes}</p>
              </div>
            )}
            {booking.videoLink && (
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                <a
                  href={booking.videoLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Join Video Call
                </a>
              </div>
            )}
          </div>

          {isCancelled && booking.cancelReason && (
            <div className="border-t pt-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">Cancellation reason:</span>{" "}
                {booking.cancelReason}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="text-center py-16 text-muted-foreground">
      <Calendar className="h-16 w-16 mx-auto mb-4 opacity-30" />
      <p className="text-lg">{message}</p>
      <p className="text-sm mt-2">
        Bookings will appear here when guests schedule meetings with you.
      </p>
    </div>
  );

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">
          View and manage your scheduled meetings
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : bookings.length === 0 ? (
            renderEmptyState("No upcoming bookings")
          ) : (
            <div className="space-y-4">
              {bookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : bookings.length === 0 ? (
            renderEmptyState("No past bookings")
          ) : (
            <div className="space-y-4">
              {bookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="cancelled">
          {loading ? (
            <div className="text-center py-16 text-muted-foreground">Loading...</div>
          ) : bookings.length === 0 ? (
            renderEmptyState("No cancelled bookings")
          ) : (
            <div className="space-y-4">
              {bookings.map(renderBookingCard)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Booking Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? The guest will be notified
              via email.
            </DialogDescription>
          </DialogHeader>

          {cancellingBooking && (
            <div className="py-4 space-y-2">
              <p className="text-sm">
                <span className="font-medium">Guest:</span> {cancellingBooking.guestName}
              </p>
              <p className="text-sm">
                <span className="font-medium">Meeting:</span>{" "}
                {cancellingBooking.bookingLink.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">Time:</span>{" "}
                {formatDateTime(cancellingBooking.startTime).date} at{" "}
                {formatDateTime(cancellingBooking.startTime).time}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cancelReason">Reason for cancellation (optional)</Label>
            <Textarea
              id="cancelReason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Let the guest know why you're cancelling..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCancelDialogOpen(false)}
              disabled={isCancelling}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
