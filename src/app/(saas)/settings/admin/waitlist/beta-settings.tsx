"use client";

import { useEffect, useState } from "react";

import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import { useWaitlistStore } from "@/store/waitlist.saas";

export function BetaSettings() {
  const {
    settings,
    settingsLoading,
    settingsError,
    fetchSettings,
    updateSettings,
  } = useWaitlistStore();

  // Local state for form values
  const [maxActiveUsers, setMaxActiveUsers] = useState(100);
  const [invitationValidDays, setInvitationValidDays] = useState(7);
  const [autoInviteEnabled, setAutoInviteEnabled] = useState(false);
  const [autoInviteCount, setAutoInviteCount] = useState(10);
  const [autoInviteFrequency, setAutoInviteFrequency] = useState("WEEKLY");
  const [referralBoostAmount, setReferralBoostAmount] = useState(1);
  const [maxReferralBoost, setMaxReferralBoost] = useState(10);
  const [showQueuePosition, setShowQueuePosition] = useState(true);
  const [showTotalWaitlist, setShowTotalWaitlist] = useState(true);
  const [invitationTemplate, setInvitationTemplate] = useState("");
  const [waitlistTemplate, setWaitlistTemplate] = useState("");
  const [reminderTemplate, setReminderTemplate] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Fetch settings on component mount
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setMaxActiveUsers(settings.maxActiveUsers);
      setInvitationValidDays(settings.invitationValidDays);
      setAutoInviteEnabled(settings.autoInviteEnabled);
      setAutoInviteCount(settings.autoInviteCount);
      setAutoInviteFrequency(settings.autoInviteFrequency);
      setReferralBoostAmount(settings.referralBoostAmount);
      setMaxReferralBoost(settings.maxReferralBoost);
      setShowQueuePosition(settings.showQueuePosition);
      setShowTotalWaitlist(settings.showTotalWaitlist);
      setInvitationTemplate(settings.invitationEmailTemplate);
      setWaitlistTemplate(settings.waitlistConfirmationTemplate);
      setReminderTemplate(settings.reminderEmailTemplate);
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);

      await updateSettings({
        maxActiveUsers,
        invitationValidDays,
        autoInviteEnabled,
        autoInviteCount,
        autoInviteFrequency: autoInviteFrequency as
          | "DAILY"
          | "WEEKLY"
          | "MONTHLY",
        referralBoostAmount,
        maxReferralBoost,
        showQueuePosition,
        showTotalWaitlist,
        invitationEmailTemplate: invitationTemplate,
        waitlistConfirmationTemplate: waitlistTemplate,
        reminderEmailTemplate: reminderTemplate,
      });

      toast.success("Beta settings saved successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Show loading state while fetching settings
  if (settingsLoading && !settings) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // Show error state
  if (settingsError) {
    return (
      <div className="rounded-md bg-destructive/10 p-6 text-destructive">
        <h3 className="mb-2 text-lg font-medium">Error loading settings</h3>
        <p>{settingsError}</p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => fetchSettings()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General Settings</TabsTrigger>
          <TabsTrigger value="referrals">Referral Settings</TabsTrigger>
          <TabsTrigger value="emails">Email Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>
                Configure general settings for the beta program.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="maxUsers">Maximum active beta users</Label>
                  <Input
                    id="maxUsers"
                    type="number"
                    min={1}
                    value={maxActiveUsers}
                    onChange={(e) =>
                      setMaxActiveUsers(parseInt(e.target.value) || 1)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Limit the number of active beta users.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="validDays">Invitation validity (days)</Label>
                  <Input
                    id="validDays"
                    type="number"
                    min={1}
                    max={30}
                    value={invitationValidDays}
                    onChange={(e) =>
                      setInvitationValidDays(parseInt(e.target.value) || 1)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Number of days before an invitation expires.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoInvite">Automatic invitations</Label>
                  <Switch
                    id="autoInvite"
                    checked={autoInviteEnabled}
                    onCheckedChange={setAutoInviteEnabled}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Automatically send invitations to users on the waitlist.
                </p>
              </div>

              {autoInviteEnabled && (
                <div className="grid gap-4 border-l-2 border-gray-100 pl-6 dark:border-gray-800 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="autoCount">Users per batch</Label>
                    <Input
                      id="autoCount"
                      type="number"
                      min={1}
                      max={100}
                      value={autoInviteCount}
                      onChange={(e) =>
                        setAutoInviteCount(parseInt(e.target.value) || 1)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="autoFrequency">Frequency</Label>
                    <Select
                      value={autoInviteFrequency}
                      onValueChange={setAutoInviteFrequency}
                    >
                      <SelectTrigger id="autoFrequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Daily</SelectItem>
                        <SelectItem value="WEEKLY">Weekly</SelectItem>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showPosition">Show queue position</Label>
                  <Switch
                    id="showPosition"
                    checked={showQueuePosition}
                    onCheckedChange={setShowQueuePosition}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Show users their position in the waitlist.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="showTotal">Show total waitlist size</Label>
                  <Switch
                    id="showTotal"
                    checked={showTotalWaitlist}
                    onCheckedChange={setShowTotalWaitlist}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Show users the total number of people in the waitlist.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Referral Settings</CardTitle>
              <CardDescription>
                Configure settings for the referral system.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="boostAmount">Referral boost amount</Label>
                  <Input
                    id="boostAmount"
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={referralBoostAmount}
                    onChange={(e) =>
                      setReferralBoostAmount(parseFloat(e.target.value) || 0.1)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Priority score boost per successful referral.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxBoost">Maximum referral boost</Label>
                  <Input
                    id="maxBoost"
                    type="number"
                    min={1}
                    value={maxReferralBoost}
                    onChange={(e) =>
                      setMaxReferralBoost(parseInt(e.target.value) || 1)
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Maximum priority boost a user can get from referrals.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="emails" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Customize email templates for the beta program.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="invitationEmail">Invitation Email</Label>
                <Textarea
                  id="invitationEmail"
                  value={invitationTemplate}
                  onChange={(e) => setInvitationTemplate(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Available variables: {`{{name}}`}, {`{{invitationLink}}`},{" "}
                  {`{{expirationDate}}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="waitlistEmail">
                  Waitlist Confirmation Email
                </Label>
                <Textarea
                  id="waitlistEmail"
                  value={waitlistTemplate}
                  onChange={(e) => setWaitlistTemplate(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Available variables: {`{{name}}`}, {`{{position}}`},{" "}
                  {`{{referralLink}}`}, {`{{statusLink}}`}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reminderEmail">Invitation Reminder Email</Label>
                <Textarea
                  id="reminderEmail"
                  value={reminderTemplate}
                  onChange={(e) => setReminderTemplate(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <p className="text-sm text-muted-foreground">
                  Available variables: {`{{name}}`}, {`{{invitationLink}}`},{" "}
                  {`{{expirationDate}}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Button
        onClick={handleSaveSettings}
        className="w-full sm:w-auto"
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </>
        )}
      </Button>
    </div>
  );
}
