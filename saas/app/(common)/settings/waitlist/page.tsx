"use client";

import { WaitlistDashboard } from "../../(saas)/settings/admin/waitlist/waitlist-dashboard";

import AccessDeniedMessage from "@/components/auth/AccessDeniedMessage";

import { useAdmin } from "@/hooks/use-admin";

/**
 * SAAS version of the Waitlist Admin page
 * This uses the WaitlistDashboard component directly
 */
export default function WaitlistPage() {
  const { isAdmin } = useAdmin();

  // Only render the dashboard for admin users
  if (!isAdmin) {
    return (
      <AccessDeniedMessage message="You do not have permission to access the waitlist management dashboard." />
    );
  }

  return (
    <div>
      <h2 className="mb-6 text-3xl font-bold">Beta Waitlist Management</h2>

      {/* Use the WaitlistDashboard component directly */}
      <WaitlistDashboard />

      {/* Additional content that's always visible */}
      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">About Beta Waitlist</h2>
        <p className="text-gray-700">
          The beta waitlist allows you to manage user access to your beta
          program. You can view waitlist entries, send invitations, and
          configure waitlist settings.
        </p>
      </div>
    </div>
  );
}
