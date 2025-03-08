"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Open source version of the Teams page
 * This shows a message about upgrading to SAAS for team features
 */
export default function TeamsPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Team Settings</h2>

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>
            Team management is a premium feature available in the SAAS version.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p>With team management, you can:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Create and manage teams</li>
              <li>Assign team members to calendars</li>
              <li>Set permissions for team members</li>
              <li>Share calendars and tasks with your team</li>
            </ul>
            <Button className="w-full">
              <a
                href="https://fluidcalendar.com/pricing"
                target="_blank"
                rel="noopener noreferrer"
              >
                Upgrade to SAAS Version
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional content that's always visible */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">About Teams</h2>
        <p className="text-gray-700">
          Teams allow you to collaborate with others on calendars and tasks. You
          can share calendars, assign tasks, and manage permissions for team
          members.
        </p>
      </div>
    </div>
  );
}
