"use client";

import TeamManagement from "@/saas/components/TeamManagement";

/**
 * SAAS version of the Teams page
 * This uses the TeamManagement component directly
 */
export default function TeamsPage() {
  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Team Settings</h2>

      {/* Use the TeamManagement component directly */}
      <TeamManagement />

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
