import { logger } from "@/lib/logger";

import { createStandardStore } from "../lib/store-factory";

const LOG_SOURCE = "WaitlistStore";

// Types
export type WaitlistStatus = "WAITING" | "INVITED" | "REGISTERED";

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  status: WaitlistStatus;
  createdAt: string;
  invitedAt: string | null;
  registeredAt: string | null;
  referralCode: string;
  referredBy: string | null;
  referralCount: number;
  priorityScore: number;
  lastVisitedAt: string | null;
  notes: string | null;
  invitationToken: string | null;
  invitationExpiry: string | null;
}

export interface WaitlistStats {
  totalWaitlist: number;
  invitedUsers: number;
  conversionRate: number;
  activeUsers: number;
  monthlyGrowth: number;
  lastMonthTotal: number;
}

export interface InvitationRecord {
  id: string;
  email: string;
  sentAt: string;
  status: "SENT" | "OPENED" | "CLICKED" | "REGISTERED";
  expiresAt: string;
}

export interface BetaSettings {
  id: string;
  maxActiveUsers: number;
  invitationValidDays: number;
  autoInviteEnabled: boolean;
  autoInviteCount: number;
  autoInviteFrequency: "DAILY" | "WEEKLY" | "MONTHLY";
  referralBoostAmount: number;
  maxReferralBoost: number;
  showQueuePosition: boolean;
  showTotalWaitlist: boolean;
  invitationEmailTemplate: string;
  waitlistConfirmationTemplate: string;
  reminderEmailTemplate: string;
}

export interface WaitlistFilters {
  status: WaitlistStatus | null;
  search: string;
  sortField: keyof WaitlistEntry | null;
  sortDirection: "asc" | "desc";
  page: number;
  pageSize: number;
}

// Enhanced TypeScript interfaces for better type safety
interface WaitlistState {
  // Entries
  entries: WaitlistEntry[];
  totalEntries: number;
  selectedEntries: string[];
  filters: WaitlistFilters;
  entriesLoading: boolean;
  entriesError: string | null;

  // Stats
  stats: WaitlistStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Invitations
  invitations: InvitationRecord[];
  invitationsLoading: boolean;
  invitationsError: string | null;

  // Settings
  settings: BetaSettings | null;
  settingsLoading: boolean;
  settingsError: string | null;
}

interface WaitlistActions {
  // Data fetching actions
  fetchStats: () => Promise<void>;
  fetchEntries: () => Promise<void>;
  fetchInvitations: () => Promise<void>;
  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Partial<BetaSettings>) => Promise<void>;

  // Filter and selection actions
  setFilters: (filters: Partial<WaitlistFilters>) => void;
  selectEntry: (id: string, selected: boolean) => void;
  selectAllEntries: (selected: boolean) => void;

  // Invitation management actions
  sendInvitations: (
    count: number,
    date: Date,
    message?: string
  ) => Promise<void>;
  inviteSpecificEntries: (
    ids: string[],
    date: Date,
    message?: string
  ) => Promise<{ invitedCount: number }>;
  resendInvitation: (id: string) => Promise<void>;
  resendInvitations: (ids: string[]) => Promise<{ resendCount: number }>;

  // Entry management actions
  deleteEntries: (ids: string[]) => Promise<void>;
  boostEntries: (ids: string[], amount: number) => Promise<void>;
  exportEntries: (ids: string[]) => Promise<void>;
}

// Using our enhanced store factory
export const useWaitlistStore = createStandardStore({
  name: "waitlist-store",
  initialState: {
    // Entries
    entries: [],
    totalEntries: 0,
    selectedEntries: [],
    filters: {
      status: null,
      search: "",
      sortField: "createdAt" as keyof WaitlistEntry,
      sortDirection: "desc" as const,
      page: 1,
      pageSize: 10,
    },
    entriesLoading: false,
    entriesError: null,

    // Stats
    stats: null,
    statsLoading: false,
    statsError: null,

    // Invitations
    invitations: [],
    invitationsLoading: false,
    invitationsError: null,

    // Settings
    settings: null,
    settingsLoading: false,
    settingsError: null,
  } as WaitlistState,

  storeCreator: (set, get) =>
    ({
      fetchStats: async () => {
        try {
          set({ statsLoading: true, statsError: null });
          const response = await fetch("/api/waitlist/stats");

          if (!response.ok) {
            throw new Error(`Failed to fetch stats: ${response.statusText}`);
          }

          const data = await response.json();
          set({ stats: data, statsLoading: false });

          logger.info("Fetched waitlist stats", { data }, LOG_SOURCE);
        } catch (error) {
          logger.error(
            "Error fetching waitlist stats",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
          set({
            statsError:
              error instanceof Error ? error.message : "Failed to fetch stats",
            statsLoading: false,
          });
        }
      },

      fetchEntries: async () => {
        try {
          const { filters } = get();
          set({ entriesLoading: true, entriesError: null });

          // Build query params
          const params = new URLSearchParams();
          if (filters.status) params.append("status", filters.status);
          if (filters.search) params.append("search", filters.search);
          if (filters.sortField) params.append("sortField", filters.sortField);
          params.append("sortDirection", filters.sortDirection);
          params.append("page", filters.page.toString());
          params.append("pageSize", filters.pageSize.toString());

          const response = await fetch(
            `/api/waitlist/entries?${params.toString()}`
          );

          if (!response.ok) {
            throw new Error(`Failed to fetch entries: ${response.statusText}`);
          }

          const data = await response.json();
          set({
            entries: data.entries,
            totalEntries: data.total,
            entriesLoading: false,
          });

          logger.info(
            "Fetched waitlist entries",
            {
              count: data.entries.length,
              total: data.total,
              filters: JSON.stringify(filters),
            },
            LOG_SOURCE
          );
        } catch (error) {
          logger.error(
            "Error fetching waitlist entries",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
          set({
            entriesError:
              error instanceof Error
                ? error.message
                : "Failed to fetch entries",
            entriesLoading: false,
          });
        }
      },

      fetchInvitations: async () => {
        try {
          set({ invitationsLoading: true, invitationsError: null });
          const response = await fetch("/api/waitlist/invitations");

          if (!response.ok) {
            throw new Error(
              `Failed to fetch invitations: ${response.statusText}`
            );
          }

          const data = await response.json();
          set({ invitations: data, invitationsLoading: false });

          logger.info(
            "Fetched waitlist invitations",
            { count: data.length },
            LOG_SOURCE
          );
        } catch (error) {
          logger.error(
            "Error fetching waitlist invitations",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
          set({
            invitationsError:
              error instanceof Error
                ? error.message
                : "Failed to fetch invitations",
            invitationsLoading: false,
          });
        }
      },

      fetchSettings: async () => {
        try {
          set({ settingsLoading: true, settingsError: null });
          const response = await fetch("/api/waitlist/settings");

          if (!response.ok) {
            throw new Error(`Failed to fetch settings: ${response.statusText}`);
          }

          const data = await response.json();
          set({ settings: data, settingsLoading: false });

          logger.info("Fetched waitlist settings", { data }, LOG_SOURCE);
        } catch (error) {
          logger.error(
            "Error fetching waitlist settings",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
          set({
            settingsError:
              error instanceof Error
                ? error.message
                : "Failed to fetch settings",
            settingsLoading: false,
          });
        }
      },

      updateSettings: async (settings: Partial<BetaSettings>) => {
        try {
          set({ settingsLoading: true, settingsError: null });
          const response = await fetch("/api/waitlist/settings", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(settings),
          });

          if (!response.ok) {
            throw new Error(
              `Failed to update settings: ${response.statusText}`
            );
          }

          const data = await response.json();
          set({ settings: data, settingsLoading: false });

          logger.info(
            "Updated waitlist settings",
            { updatedFields: Object.keys(settings) },
            LOG_SOURCE
          );
        } catch (error) {
          logger.error(
            "Error updating waitlist settings",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
          set({
            settingsError:
              error instanceof Error
                ? error.message
                : "Failed to update settings",
            settingsLoading: false,
          });
        }
      },

      setFilters: (filters: Partial<WaitlistFilters>) => {
        set((state) => {
          // Create the updated filters object
          const updatedFilters = { ...state.filters, ...filters };

          // Reset page to 1 if any filter changes except page itself
          if (filters.page === undefined) {
            updatedFilters.page = 1;
          }

          return { filters: updatedFilters };
        });

        // Fetch entries with the updated filters
        setTimeout(() => {
          (get() as WaitlistState & WaitlistActions).fetchEntries();
        }, 0);
      },

      selectEntry: (id: string, selected: boolean) => {
        set((state) => ({
          selectedEntries: selected
            ? [...state.selectedEntries, id]
            : state.selectedEntries.filter((entryId) => entryId !== id),
        }));
      },

      selectAllEntries: (selected: boolean) => {
        set((state) => ({
          selectedEntries: selected
            ? state.entries.map((entry) => entry.id)
            : [],
        }));
      },

      sendInvitations: async (count: number, date: Date, message?: string) => {
        try {
          set({ entriesLoading: true, entriesError: null });
          const response = await fetch("/api/waitlist/bulk/invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              count,
              scheduledDate: date.toISOString(),
              message,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `Failed to send invitations: ${response.statusText}`
            );
          }

          const data = await response.json();

          // Refresh entries and invitations
          await (get() as WaitlistState & WaitlistActions).fetchEntries();
          await (get() as WaitlistState & WaitlistActions).fetchInvitations();
          await (get() as WaitlistState & WaitlistActions).fetchStats();

          logger.info(
            "Sent bulk invitations",
            { count: data.invitedCount },
            LOG_SOURCE
          );
        } catch (error) {
          logger.error(
            "Error sending bulk invitations",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
          set({
            entriesError:
              error instanceof Error
                ? error.message
                : "Failed to send invitations",
            entriesLoading: false,
          });
        }
      },

      inviteSpecificEntries: async (
        ids: string[],
        date: Date,
        message?: string
      ) => {
        try {
          set({ entriesLoading: true, entriesError: null });
          const response = await fetch("/api/waitlist/bulk/invite", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              count: ids.length,
              scheduledDate: date.toISOString(),
              message,
              specificIds: ids,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `Failed to invite specific entries: ${response.statusText}`
            );
          }

          const data = await response.json();

          // Refresh entries and invitations
          await (get() as WaitlistState & WaitlistActions).fetchEntries();
          await (get() as WaitlistState & WaitlistActions).fetchInvitations();
          await (get() as WaitlistState & WaitlistActions).fetchStats();

          logger.info(
            "Invited specific entries",
            { count: data.invitedCount, ids },
            LOG_SOURCE
          );

          return data;
        } catch (error) {
          logger.error(
            "Error inviting specific entries",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              ids,
            },
            LOG_SOURCE
          );
          set({
            entriesError:
              error instanceof Error
                ? error.message
                : "Failed to invite specific entries",
            entriesLoading: false,
          });
          return { invitedCount: 0 };
        }
      },

      resendInvitation: async (id: string) => {
        try {
          set({ invitationsLoading: true, invitationsError: null });
          const response = await fetch(
            `/api/waitlist/invitations/${id}/resend`,
            {
              method: "POST",
            }
          );

          if (!response.ok) {
            throw new Error(
              `Failed to resend invitation: ${response.statusText}`
            );
          }

          // Refresh invitations
          await (get() as WaitlistState & WaitlistActions).fetchInvitations();

          logger.info("Resent invitation", { id }, LOG_SOURCE);
        } catch (error) {
          logger.error(
            "Error resending invitation",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              id,
            },
            LOG_SOURCE
          );
          set({
            invitationsError:
              error instanceof Error
                ? error.message
                : "Failed to resend invitation",
            invitationsLoading: false,
          });
        }
      },

      resendInvitations: async (ids: string[]) => {
        try {
          set({ entriesLoading: true, entriesError: null });

          if (ids.length === 0) {
            return { resendCount: 0 };
          }

          // Use the bulk resend API endpoint
          const response = await fetch("/api/waitlist/bulk/resend", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
          });

          if (!response.ok) {
            throw new Error(
              `Failed to resend invitations: ${response.statusText}`
            );
          }

          const data = await response.json();

          // Refresh entries and invitations
          await (get() as WaitlistState & WaitlistActions).fetchEntries();
          await (get() as WaitlistState & WaitlistActions).fetchInvitations();

          logger.info(
            "Resent invitations in bulk",
            { totalAttempted: ids.length, successfulResends: data.resendCount },
            LOG_SOURCE
          );

          set({ entriesLoading: false });
          return { resendCount: data.resendCount };
        } catch (error) {
          logger.error(
            "Error resending invitations in bulk",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              ids,
            },
            LOG_SOURCE
          );
          set({
            entriesError:
              error instanceof Error
                ? error.message
                : "Failed to resend invitations in bulk",
            entriesLoading: false,
          });
          return { resendCount: 0 };
        }
      },

      deleteEntries: async (ids: string[]) => {
        try {
          set({ entriesLoading: true, entriesError: null });
          const response = await fetch("/api/waitlist/bulk/delete", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
          });

          if (!response.ok) {
            throw new Error(`Failed to delete entries: ${response.statusText}`);
          }

          // Refresh entries and stats
          await (get() as WaitlistState & WaitlistActions).fetchEntries();
          await (get() as WaitlistState & WaitlistActions).fetchStats();

          // Clear selection
          set({ selectedEntries: [] });

          logger.info(
            "Deleted waitlist entries",
            { count: ids.length },
            LOG_SOURCE
          );
        } catch (error) {
          logger.error(
            "Error deleting waitlist entries",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              ids,
            },
            LOG_SOURCE
          );
          set({
            entriesError:
              error instanceof Error
                ? error.message
                : "Failed to delete entries",
            entriesLoading: false,
          });
        }
      },

      boostEntries: async (ids: string[], amount: number) => {
        try {
          set({ entriesLoading: true, entriesError: null });
          const response = await fetch("/api/waitlist/bulk/boost", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids, amount }),
          });

          if (!response.ok) {
            throw new Error(`Failed to boost entries: ${response.statusText}`);
          }

          // Refresh entries
          await (get() as WaitlistState & WaitlistActions).fetchEntries();

          // Clear selection
          set({ selectedEntries: [] });

          logger.info(
            "Boosted waitlist entries",
            { count: ids.length, amount },
            LOG_SOURCE
          );
        } catch (error) {
          logger.error(
            "Error boosting waitlist entries",
            {
              error: error instanceof Error ? error.message : "Unknown error",
              ids,
            },
            LOG_SOURCE
          );
          set({
            entriesError:
              error instanceof Error
                ? error.message
                : "Failed to boost entries",
            entriesLoading: false,
          });
        }
      },

      exportEntries: async (ids: string[]) => {
        try {
          set({ entriesLoading: true, entriesError: null });

          const response = await fetch("/api/waitlist/bulk/export", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
          });

          if (!response.ok) {
            throw new Error(`Failed to export entries: ${response.statusText}`);
          }

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `waitlist-export-${
            new Date().toISOString().split("T")[0]
          }.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();

          set({ entriesLoading: false });

          logger.info(
            "Exported waitlist entries",
            { count: ids.length > 0 ? ids.length : "all" },
            LOG_SOURCE
          );
        } catch (error) {
          logger.error(
            "Error exporting waitlist entries",
            { error: error instanceof Error ? error.message : "Unknown error" },
            LOG_SOURCE
          );
          set({
            entriesError:
              error instanceof Error
                ? error.message
                : "Failed to export entries",
            entriesLoading: false,
          });
        }
      },
    }) satisfies WaitlistActions,

  // Custom clear that resets data but preserves settings and filters
  customClear: (set) => {
    set({
      entries: [],
      selectedEntries: [],
      totalEntries: 0,
      entriesLoading: false,
      entriesError: null,
      stats: null,
      statsLoading: false,
      statsError: null,
      invitations: [],
      invitationsLoading: false,
      invitationsError: null,
      // Keep settings and filters as they are user preferences
    });
  },
});
