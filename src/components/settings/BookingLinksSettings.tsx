"use client";

import { useEffect, useState, useCallback } from "react";
import { Copy, ExternalLink, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { SettingsSection } from "./SettingsSection";
import { BookingFeatureAccess } from "@/types/booking";

interface BookingLink {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  duration: number;
  enabled: boolean;
  selectedCalendars: string;
  targetCalendarId: string;
  minNotice: number;
  maxFutureDays: number;
  bufferBefore: number;
  bufferAfter: number;
  videoProvider: string | null;
  _count?: {
    bookings: number;
  };
}

interface CalendarFeed {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
}

interface BookingLinkFormData {
  name: string;
  slug: string;
  description: string;
  duration: number;
  selectedCalendars: string[];
  targetCalendarId: string;
  minNotice: number;
  maxFutureDays: number;
  videoProvider: string | null;
}

export function BookingLinksSettings() {
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([]);
  const [username, setUsername] = useState<string | null>(null);
  const [featureAccess, setFeatureAccess] = useState<BookingFeatureAccess | null>(null);
  const [calendars, setCalendars] = useState<CalendarFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [isUsernameDialogOpen, setIsUsernameDialogOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState("");

  // Form state for creating/editing booking links
  const [formData, setFormData] = useState<BookingLinkFormData>({
    name: "",
    slug: "",
    description: "",
    duration: 30,
    selectedCalendars: [],
    targetCalendarId: "",
    minNotice: 60,
    maxFutureDays: 60,
    videoProvider: null,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch booking links and calendars in parallel
      const [linksRes, calendarsRes, accessRes] = await Promise.all([
        fetch("/api/booking-links"),
        fetch("/api/feeds"),
        fetch("/api/booking-links/access"),
      ]);

      if (linksRes.ok) {
        const data = await linksRes.json();
        setBookingLinks(data.bookingLinks || []);
        setUsername(data.username || null);
      }

      if (calendarsRes.ok) {
        const cals = await calendarsRes.json();
        setCalendars(cals.filter((c: CalendarFeed) => c.enabled));
      }

      if (accessRes.ok) {
        const access = await accessRes.json();
        setFeatureAccess(access);
      }
    } catch (error) {
      console.error("Failed to fetch booking links data:", error);
      toast.error("Failed to load booking links");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateBookingLink = async () => {
    if (!formData.name || !formData.slug || !formData.targetCalendarId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch("/api/booking-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          selectedCalendars:
            formData.selectedCalendars.length > 0
              ? formData.selectedCalendars
              : [formData.targetCalendarId],
          videoProvider: formData.videoProvider,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create booking link");
      }

      toast.success("Booking link created successfully");

      setIsCreateDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create booking link");
    }
  };

  const handleEditBookingLink = (link: BookingLink) => {
    const selectedCals = JSON.parse(link.selectedCalendars || "[]");
    setFormData({
      name: link.name,
      slug: link.slug,
      description: link.description || "",
      duration: link.duration,
      selectedCalendars: selectedCals,
      targetCalendarId: link.targetCalendarId,
      minNotice: link.minNotice,
      maxFutureDays: link.maxFutureDays,
      videoProvider: link.videoProvider,
    });
    setEditingLinkId(link.id);
    setIsEditDialogOpen(true);
  };

  const handleUpdateBookingLink = async () => {
    if (!editingLinkId || !formData.name || !formData.slug || !formData.targetCalendarId) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const res = await fetch(`/api/booking-links/${editingLinkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          duration: formData.duration,
          selectedCalendars: formData.selectedCalendars,
          targetCalendarId: formData.targetCalendarId,
          minNotice: formData.minNotice,
          maxFutureDays: formData.maxFutureDays,
          videoProvider: formData.videoProvider,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update booking link");
      }

      toast.success("Booking link updated successfully");
      setIsEditDialogOpen(false);
      setEditingLinkId(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update booking link");
    }
  };

  const handleToggleEnabled = async (id: string, enabled: boolean) => {
    try {
      const res = await fetch(`/api/booking-links/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!res.ok) {
        throw new Error("Failed to update booking link");
      }

      setBookingLinks((prev) =>
        prev.map((link) => (link.id === id ? { ...link, enabled } : link))
      );

      toast.success(`Booking link ${enabled ? "enabled" : "disabled"}`);
    } catch {
      toast.error("Failed to update booking link");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this booking link?")) {
      return;
    }

    try {
      const res = await fetch(`/api/booking-links/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete booking link");
      }

      setBookingLinks((prev) => prev.filter((link) => link.id !== id));

      toast.success("Booking link deleted");
    } catch {
      toast.error("Failed to delete booking link");
    }
  };

  const handleUpdateUsername = async () => {
    try {
      const res = await fetch("/api/user/username", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: editingUsername }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update username");
      }

      const data = await res.json();
      setUsername(data.username);
      setIsUsernameDialogOpen(false);

      toast.success("Username updated successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update username");
    }
  };

  const handleGenerateUsername = async () => {
    try {
      const res = await fetch("/api/user/username", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Failed to generate username");
      }

      const data = await res.json();
      setUsername(data.username);

      toast.success("Username generated successfully");
    } catch {
      toast.error("Failed to generate username");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Link copied to clipboard");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      duration: 30,
      selectedCalendars: [],
      targetCalendarId: "",
      minNotice: 60,
      maxFutureDays: 60,
      videoProvider: null,
    });
  };

  const getBookingUrl = (slug: string) => {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/book/${username}/${slug}`;
  };

  if (loading) {
    return (
      <SettingsSection
        title="Booking Links"
        description="Create shareable booking links for scheduling meetings"
      >
        <div className="flex items-center justify-center p-8">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </SettingsSection>
    );
  }

  return (
    <div className="space-y-6">
      {/* Username Section */}
      <SettingsSection
        title="Booking URL"
        description="Your unique URL for booking links"
      >
        <div className="flex items-center justify-between">
          <div>
            {username ? (
              <div className="flex items-center gap-2">
                <code className="rounded bg-muted px-2 py-1 text-sm">
                  /book/{username}/...
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingUsername(username);
                    setIsUsernameDialogOpen(true);
                  }}
                >
                  Change
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">No username set</span>
                <Button variant="outline" size="sm" onClick={handleGenerateUsername}>
                  Generate Username
                </Button>
              </div>
            )}
          </div>
        </div>
      </SettingsSection>

      {/* Booking Links List */}
      <SettingsSection
        title="Your Booking Links"
        description="Manage your booking links for scheduling"
      >
        {featureAccess && !featureAccess.canCreateBookingLink && (
          <div className="mb-4 rounded-md bg-yellow-50 p-4 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You have reached your booking link limit ({featureAccess.maxBookingLinks}).
              Upgrade your plan to create more.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {bookingLinks.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8">
              <p className="mb-4 text-muted-foreground">
                No booking links yet. Create one to get started.
              </p>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button disabled={!username || (featureAccess !== null && !featureAccess.canCreateBookingLink)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Booking Link
                  </Button>
                </DialogTrigger>
                <BookingLinkFormDialog
                  formData={formData}
                  setFormData={setFormData}
                  calendars={calendars}
                  onSubmit={handleCreateBookingLink}
                  onClose={() => setIsCreateDialogOpen(false)}
                  isEdit={false}
                  featureAccess={featureAccess}
                />
              </Dialog>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      disabled={!username || (featureAccess !== null && !featureAccess.canCreateBookingLink)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create Booking Link
                    </Button>
                  </DialogTrigger>
                  <BookingLinkFormDialog
                    formData={formData}
                    setFormData={setFormData}
                    calendars={calendars}
                    onSubmit={handleCreateBookingLink}
                    onClose={() => setIsCreateDialogOpen(false)}
                    isEdit={false}
                    featureAccess={featureAccess}
                  />
                </Dialog>
              </div>

              {bookingLinks.map((link) => (
                <Card key={link.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{link.name}</CardTitle>
                          <Badge variant={link.enabled ? "default" : "secondary"}>
                            {link.enabled ? "Active" : "Disabled"}
                          </Badge>
                        </div>
                        <CardDescription>{link.duration} minute meeting</CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={link.enabled}
                          onCheckedChange={(checked) =>
                            handleToggleEnabled(link.id, checked)
                          }
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEditBookingLink(link)}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => copyToClipboard(getBookingUrl(link.slug))}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Link
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a
                                href={getBookingUrl(link.slug)}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Preview
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(link.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <code className="rounded bg-muted px-2 py-1">
                        {getBookingUrl(link.slug)}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => copyToClipboard(getBookingUrl(link.slug))}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    {link._count && link._count.bookings > 0 && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {link._count.bookings} booking{link._count.bookings !== 1 ? "s" : ""}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </SettingsSection>

      {/* Username Edit Dialog */}
      <Dialog open={isUsernameDialogOpen} onOpenChange={setIsUsernameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Username</DialogTitle>
            <DialogDescription>
              Your username is used in your booking link URLs.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={editingUsername}
                onChange={(e) => setEditingUsername(e.target.value.toLowerCase())}
                placeholder="your-username"
              />
              <p className="text-xs text-muted-foreground">
                Only lowercase letters, numbers, and hyphens allowed.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUsernameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUsername}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Booking Link Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open);
        if (!open) {
          setEditingLinkId(null);
          resetForm();
        }
      }}>
        <BookingLinkFormDialog
          formData={formData}
          setFormData={setFormData}
          calendars={calendars}
          onSubmit={handleUpdateBookingLink}
          onClose={() => {
            setIsEditDialogOpen(false);
            setEditingLinkId(null);
            resetForm();
          }}
          isEdit={true}
          featureAccess={featureAccess}
        />
      </Dialog>
    </div>
  );
}

// Booking Link Form Dialog Component (used for both Create and Edit)
function BookingLinkFormDialog({
  formData,
  setFormData,
  calendars,
  onSubmit,
  onClose,
  isEdit,
  featureAccess,
}: {
  formData: BookingLinkFormData;
  setFormData: React.Dispatch<React.SetStateAction<BookingLinkFormData>>;
  calendars: CalendarFeed[];
  onSubmit: () => void;
  onClose: () => void;
  isEdit: boolean;
  featureAccess: BookingFeatureAccess | null;
}) {
  const toggleCalendarSelection = (calId: string) => {
    const current = formData.selectedCalendars;
    if (current.includes(calId)) {
      setFormData({ ...formData, selectedCalendars: current.filter((id) => id !== calId) });
    } else {
      setFormData({ ...formData, selectedCalendars: [...current, calId] });
    }
  };

  return (
    <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Booking Link" : "Create Booking Link"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update your booking link settings."
            : "Create a new booking link that others can use to schedule meetings with you."}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="30 Minute Meeting"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">URL Slug *</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) =>
              setFormData({
                ...formData,
                slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              })
            }
            placeholder="30min"
          />
          <p className="text-xs text-muted-foreground">
            This will be part of your booking URL
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="A quick chat to discuss..."
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="duration">Duration *</Label>
          <Select
            value={String(formData.duration)}
            onValueChange={(val) => setFormData({ ...formData, duration: Number(val) })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="15">15 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
              <SelectItem value="45">45 minutes</SelectItem>
              <SelectItem value="60">60 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetCalendar">Target Calendar *</Label>
          <Select
            value={formData.targetCalendarId}
            onValueChange={(val) => setFormData({ ...formData, targetCalendarId: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a calendar" />
            </SelectTrigger>
            <SelectContent>
              {calendars.map((cal) => (
                <SelectItem key={cal.id} value={cal.id}>
                  {cal.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Events will be created in this calendar
          </p>
        </div>

        <div className="space-y-2">
          <Label>Calendars to check for conflicts</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Select which calendars to check for busy times. If none selected, all calendars will be checked.
          </p>
          <div className="space-y-2 max-h-32 overflow-y-auto border rounded-md p-2">
            {calendars.map((cal) => (
              <div key={cal.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`cal-${cal.id}`}
                  checked={formData.selectedCalendars.includes(cal.id)}
                  onCheckedChange={() => toggleCalendarSelection(cal.id)}
                />
                <label
                  htmlFor={`cal-${cal.id}`}
                  className="text-sm cursor-pointer flex-1"
                >
                  {cal.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="minNotice">Min Notice (minutes)</Label>
            <Input
              id="minNotice"
              type="number"
              value={formData.minNotice}
              onChange={(e) =>
                setFormData({ ...formData, minNotice: Number(e.target.value) })
              }
              min={0}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxFutureDays">Max Future Days</Label>
            <Input
              id="maxFutureDays"
              type="number"
              value={formData.maxFutureDays}
              onChange={(e) =>
                setFormData({ ...formData, maxFutureDays: Number(e.target.value) })
              }
              min={1}
              max={365}
            />
          </div>
        </div>

        {/* Video Conferencing */}
        <div className="space-y-2">
          <Label htmlFor="videoProvider">Video Conferencing</Label>
          {featureAccess?.canUseVideoConferencing ? (
            <>
              <Select
                value={formData.videoProvider || "none"}
                onValueChange={(val) =>
                  setFormData({ ...formData, videoProvider: val === "none" ? null : val })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select video provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No video link</SelectItem>
                  <SelectItem value="google_meet">Google Meet</SelectItem>
                  <SelectItem value="teams">Microsoft Teams</SelectItem>
                </SelectContent>
              </Select>
              {formData.videoProvider === "google_meet" && (
                <p className="text-xs text-amber-600">
                  Note: Google Meet links are only created when the target calendar is a Google Calendar.
                </p>
              )}
              {formData.videoProvider === "teams" && (
                <p className="text-xs text-amber-600">
                  Note: Teams links are only created when the target calendar is an Outlook Calendar.
                </p>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground p-2 border rounded-md bg-muted/50">
              Video conferencing is available on premium plans.{" "}
              <a href="/pricing" className="text-primary underline">
                Upgrade
              </a>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Automatically add a video meeting link to bookings
          </p>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onSubmit}>{isEdit ? "Save" : "Create"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
