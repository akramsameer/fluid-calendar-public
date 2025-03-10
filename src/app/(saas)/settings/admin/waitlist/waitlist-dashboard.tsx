"use client";

import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WaitlistTable } from "./waitlist-table";
import { BetaSettings } from "./beta-settings";
import { InvitationManager } from "./invitation-manager";
import {
  UsersIcon,
  SettingsIcon,
  MailIcon,
  TrendingUpIcon,
} from "lucide-react";
import { useWaitlistStore } from "@/store/waitlist.saas";
import { Skeleton } from "@/components/ui/skeleton";

export function WaitlistDashboard() {
  const [activeTab, setActiveTab] = useState("entries");
  const { stats, statsLoading, fetchStats } = useWaitlistStore();

  // Fetch stats on component mount
  useEffect(() => {
    fetchStats();

    // Set up polling for stats every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchStats]);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Waitlist
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.totalWaitlist || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.monthlyGrowth
                    ? stats.monthlyGrowth > 0
                      ? `+${stats.monthlyGrowth}% from last month`
                      : `${stats.monthlyGrowth}% from last month`
                    : "No previous data"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invited Users</CardTitle>
            <MailIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.invitedUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats?.lastMonthTotal
                    ? `${stats.lastMonthTotal} new in the last month`
                    : "No data available"}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.conversionRate || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  Of invited users who registered
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Beta Users
            </CardTitle>
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {stats?.activeUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Users actively using the beta
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList>
          <TabsTrigger value="entries" className="flex items-center gap-2">
            <UsersIcon className="h-4 w-4" />
            <span>Waitlist Entries</span>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <MailIcon className="h-4 w-4" />
            <span>Invitations</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="entries" className="space-y-4">
          <WaitlistTable />
        </TabsContent>
        <TabsContent value="invitations" className="space-y-4">
          <InvitationManager />
        </TabsContent>
        <TabsContent value="settings" className="space-y-4">
          <BetaSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
