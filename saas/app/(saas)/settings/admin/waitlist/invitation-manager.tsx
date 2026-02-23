"use client";

import { useEffect, useState } from "react";

import { format } from "date-fns";
import { CalendarIcon, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useWaitlistStore } from "@/store/waitlist.saas";

export function InvitationManager() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
  );
  const [invitationCount, setInvitationCount] = useState(10);
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    invitations,
    invitationsLoading,
    invitationsError,
    fetchInvitations,
    sendInvitations,
    resendInvitation,
  } = useWaitlistStore();

  // Fetch invitations on component mount
  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  const handleSendInvitations = async () => {
    if (!selectedDate) {
      toast.error("Please select a date for the invitations");
      return;
    }

    setIsSubmitting(true);
    try {
      await sendInvitations(
        invitationCount,
        selectedDate,
        customMessage || undefined
      );

      toast.success(
        `Scheduled and sent ${invitationCount} invitations. Check the Recent Invitations tab to see the status.`
      );

      // Reset form
      setCustomMessage("");

      // Switch to the recent tab to show the results
      const tabsList = document.querySelector('[role="tablist"]');
      const recentTab = tabsList?.querySelector(
        '[value="recent"]'
      ) as HTMLButtonElement;
      if (recentTab) {
        recentTab.click();
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to schedule invitations"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendInvitation = async (id: string) => {
    try {
      await resendInvitation(id);
      toast.success("Invitation resent successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resend invitation"
      );
    }
  };

  return (
    <div>
      <Tabs defaultValue="schedule" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="schedule">Schedule Invitations</TabsTrigger>
          <TabsTrigger value="recent">Recent Invitations</TabsTrigger>
        </TabsList>
        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Schedule Invitations</CardTitle>
              <CardDescription>
                Send invitations to users on the waitlist based on their
                priority score.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="count">Number of invitations</Label>
                  <Input
                    id="count"
                    type="number"
                    min="1"
                    max="100"
                    value={invitationCount}
                    onChange={(e) =>
                      setInvitationCount(parseInt(e.target.value) || 1)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Users will be selected based on priority score.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Schedule date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDate ? (
                          format(selectedDate, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={selectedDate}
                        onSelect={setSelectedDate}
                        initialFocus
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-sm text-muted-foreground">
                    Invitations will be sent at 9:00 AM in the user&apos;s
                    timezone.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Custom message (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to the invitation email..."
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>

              <Button
                onClick={handleSendInvitations}
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Schedule Invitations
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invitations</CardTitle>
              <CardDescription>
                View and manage recently sent invitations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {invitationsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invitationsError ? (
                <div className="py-8 text-center text-red-500">
                  Failed to load invitations. Please try again.
                </div>
              ) : invitations && invitations.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Sent
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Status
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invitations.map((invitation) => (
                        <tr
                          key={invitation.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {invitation.email}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            {format(
                              new Date(invitation.sentAt || Date.now()),
                              "PPP"
                            )}
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-sm">
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                invitation.status === "SENT"
                                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                                  : invitation.status === "OPENED"
                                    ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                                    : invitation.status === "CLICKED"
                                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                                      : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                              }`}
                            >
                              {invitation.status}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleResendInvitation(invitation.id)
                              }
                            >
                              Resend
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No invitations have been sent yet.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
