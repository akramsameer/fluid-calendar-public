"use client";

import { useEffect } from "react";

import { format } from "date-fns";
import {
  ChevronDown,
  Download,
  Mail,
  MoreHorizontal,
  Search,
  Star,
  Trash,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { WaitlistEntry, useWaitlistStore } from "@saas/stores/waitlist";

// TODO: Implement modal dialogs for bulk actions:
// 1. Bulk invite modal - to collect date and custom message
// 2. Boost priority modal - to specify boost amount
// 3. Confirmation modal for delete action

export function WaitlistTable() {
  const {
    entries,
    totalEntries,
    selectedEntries,
    filters,
    entriesLoading,
    entriesError,
    fetchEntries,
    setFilters,
    selectEntry,
    selectAllEntries,
    deleteEntries,
    boostEntries,
    exportEntries,
    inviteSpecificEntries,
    resendInvitations,
  } = useWaitlistStore();

  // Fetch entries on component mount
  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Fetch entries when filters change
  useEffect(() => {
    fetchEntries();
  }, [filters, fetchEntries]);

  // Handle sort toggle
  const toggleSort = (field: keyof WaitlistEntry) => {
    if (filters.sortField === field) {
      setFilters({
        sortDirection: filters.sortDirection === "asc" ? "desc" : "asc",
      });
    } else {
      setFilters({
        sortField: field,
        sortDirection: "desc",
      });
    }
  };

  // Handle bulk selection
  const toggleSelectAll = () => {
    selectAllEntries(selectedEntries.length !== entries.length);
  };

  const toggleSelectEntry = (id: string, selected: boolean) => {
    selectEntry(id, selected);
  };

  // Individual entry actions
  const handleInviteEntry = async (entryId: string) => {
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await inviteSpecificEntries([entryId], tomorrow);
      toast.success(`Invited user successfully`);
      // No need to call fetchEntries() as it's already called in inviteSpecificEntries
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitation"
      );
    }
  };

  const handleResendInvitation = async (entryId: string) => {
    try {
      const result = await resendInvitations([entryId]);
      if (result.resendCount > 0) {
        toast.success(`Invitation resent successfully`);
      } else {
        toast.error("Failed to resend invitation");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resend invitation"
      );
    }
  };

  const handleBoostEntry = async (entryId: string) => {
    try {
      await boostEntries([entryId], 1);
      toast.success(`Boosted priority for user`);
      fetchEntries(); // Refresh the entries
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to boost priority"
      );
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        await deleteEntries([entryId]);
        toast.success(`Deleted user successfully`);
        fetchEntries(); // Refresh the entries
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to delete entry"
        );
      }
    }
  };

  // Bulk actions
  const handleBulkInvite = async () => {
    if (selectedEntries.length === 0) {
      toast.error("No entries selected");
      return;
    }

    try {
      // For now, we'll use default values
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Use the store method to send invitations
      const result = await inviteSpecificEntries(selectedEntries, tomorrow);

      toast.success(
        `Invited ${
          result.invitedCount || selectedEntries.length
        } users successfully`
      );

      // No need to call fetchEntries() as it's already called in inviteSpecificEntries
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send invitations"
      );
    }
  };

  // Count selected entries by status
  const countSelectedByStatus = (status: string) => {
    return selectedEntries.filter(
      (id) => entries.find((entry) => entry.id === id)?.status === status
    ).length;
  };

  const handleBulkResend = async () => {
    const invitedEntries = selectedEntries.filter(
      (id) => entries.find((entry) => entry.id === id)?.status === "INVITED"
    );

    if (invitedEntries.length === 0) {
      toast.error("No invited users selected");
      return;
    }

    try {
      const result = await resendInvitations(invitedEntries);
      toast.success(`Resent ${result.resendCount} invitations successfully`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to resend invitations"
      );
    }
  };

  const handleBulkDelete = async () => {
    if (selectedEntries.length === 0) {
      toast.error("No entries selected");
      return;
    }

    // Add confirmation dialog
    if (
      !confirm(
        `Are you sure you want to delete ${selectedEntries.length} entries? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await deleteEntries(selectedEntries);
      toast.success(`Deleted ${selectedEntries.length} entries`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete entries"
      );
    }
  };

  const handleBulkExport = async () => {
    if (selectedEntries.length === 0) {
      toast.error("No entries selected");
      return;
    }

    try {
      await exportEntries(selectedEntries);
      toast.success(`Exported ${selectedEntries.length} entries`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to export entries"
      );
    }
  };

  const handleBoostPriority = async () => {
    if (selectedEntries.length === 0) {
      toast.error("No entries selected");
      return;
    }

    try {
      await boostEntries(selectedEntries, 1);
      toast.success(`Boosted priority for ${selectedEntries.length} entries`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to boost entries"
      );
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return format(new Date(dateString), "MMM d, yyyy");
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "WAITING":
        return (
          <Badge
            variant="outline"
            className="border-yellow-200 bg-yellow-50 text-yellow-700"
          >
            Waiting
          </Badge>
        );
      case "INVITED":
        return (
          <Badge
            variant="outline"
            className="border-blue-200 bg-blue-50 text-blue-700"
          >
            Invited
          </Badge>
        );
      case "REGISTERED":
        return (
          <Badge
            variant="outline"
            className="border-green-200 bg-green-50 text-green-700"
          >
            Registered
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-gray-200 bg-gray-50 text-gray-700"
          >
            {status}
          </Badge>
        );
    }
  };

  // Render loading state
  if (entriesLoading && entries.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Render error state
  if (entriesError && entries.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="mb-4 text-red-500">Failed to load waitlist entries</p>
        <Button onClick={() => fetchEntries()}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search emails or names..."
              className="w-[250px] pl-8"
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="ml-2">
                Status <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setFilters({ status: null })}>
                All
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilters({ status: "WAITING" })}
              >
                Waiting
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilters({ status: "INVITED" })}
              >
                Invited
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilters({ status: "REGISTERED" })}
              >
                Registered
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2">
          {selectedEntries.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkInvite}
                className="flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                <span>Invite</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkResend}
                className="flex items-center gap-1"
              >
                <Mail className="h-4 w-4" />
                <span>
                  Resend{" "}
                  {countSelectedByStatus("INVITED") > 0
                    ? `(${countSelectedByStatus("INVITED")})`
                    : ""}
                </span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBoostPriority}
                className="flex items-center gap-1"
              >
                <Star className="h-4 w-4" />
                <span>Boost</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkExport}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="flex items-center gap-1 text-destructive"
              >
                <Trash className="h-4 w-4" />
                <span>Delete</span>
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    selectedEntries.length > 0 &&
                    selectedEntries.length === entries.length
                  }
                  onCheckedChange={toggleSelectAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("email")}
              >
                Email
                {filters.sortField === "email" && (
                  <span className="ml-2">
                    {filters.sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("name")}
              >
                Name
                {filters.sortField === "name" && (
                  <span className="ml-2">
                    {filters.sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("status")}
              >
                Status
                {filters.sortField === "status" && (
                  <span className="ml-2">
                    {filters.sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("createdAt")}
              >
                Joined
                {filters.sortField === "createdAt" && (
                  <span className="ml-2">
                    {filters.sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("referralCount")}
              >
                Referrals
                {filters.sortField === "referralCount" && (
                  <span className="ml-2">
                    {filters.sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </TableHead>
              <TableHead
                className="cursor-pointer"
                onClick={() => toggleSort("priorityScore")}
              >
                Priority
                {filters.sortField === "priorityScore" && (
                  <span className="ml-2">
                    {filters.sortDirection === "asc" ? "↑" : "↓"}
                  </span>
                )}
              </TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entriesLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex items-center justify-center">
                    <svg
                      className="-ml-1 mr-3 h-5 w-5 animate-spin text-primary"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span>Loading entries...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No entries found.
                </TableCell>
              </TableRow>
            ) : (
              entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedEntries.includes(entry.id)}
                      onCheckedChange={(checked) =>
                        toggleSelectEntry(entry.id, !!checked)
                      }
                      aria-label={`Select ${entry.email}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{entry.email}</TableCell>
                  <TableCell>{entry.name || "—"}</TableCell>
                  <TableCell>{getStatusBadge(entry.status)}</TableCell>
                  <TableCell>{formatDate(entry.createdAt)}</TableCell>
                  <TableCell>{entry.referralCount}</TableCell>
                  <TableCell>{entry.priorityScore.toFixed(1)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={() => toggleSelectEntry(entry.id, true)}
                        >
                          Select
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleInviteEntry(entry.id)}
                          disabled={entry.status !== "WAITING"}
                        >
                          Invite
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleResendInvitation(entry.id)}
                          disabled={entry.status !== "INVITED"}
                        >
                          Resend Invitation
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleBoostEntry(entry.id)}
                          disabled={entry.status !== "WAITING"}
                        >
                          Boost Priority
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* TODO: Implement pagination controls with page numbers and better UI */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {entries.length} of {totalEntries} entries
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ page: Math.max(1, filters.page - 1) })}
            disabled={filters.page <= 1 || entriesLoading}
          >
            Previous
          </Button>
          <div className="text-sm">
            Page {filters.page} of{" "}
            {Math.max(1, Math.ceil(totalEntries / filters.pageSize))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilters({ page: filters.page + 1 })}
            disabled={
              filters.page >= Math.ceil(totalEntries / filters.pageSize) ||
              entriesLoading
            }
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
