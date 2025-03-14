"use client";

import { useAdmin } from "@/hooks/use-admin";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobRecord, JobStatus, User } from "@prisma/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type JobWithUser = JobRecord & {
  user: Pick<User, "name" | "email"> | null;
};

type JobStats = {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  pendingJobs: number;
};

export default function JobsPage() {
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const [stats, setStats] = useState<JobStats | null>(null);
  const [recentJobs, setRecentJobs] = useState<JobWithUser[]>([]);
  const [failedJobs, setFailedJobs] = useState<JobWithUser[]>([]);
  const [pendingJobs, setPendingJobs] = useState<JobWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function fetchData() {
    if (!isAdmin) return;

    try {
      setIsRefreshing(true);

      // Fetch job stats
      const statsResponse = await fetch("/api/admin/jobs/stats");
      const statsData = await statsResponse.json();
      setStats(statsData);

      // Fetch recent jobs
      const recentResponse = await fetch("/api/admin/jobs/recent");
      const recentData = await recentResponse.json();
      setRecentJobs(recentData);

      // Fetch failed jobs
      const failedResponse = await fetch(
        "/api/admin/jobs/recent?status=FAILED"
      );
      const failedData = await failedResponse.json();
      setFailedJobs(failedData);

      // Fetch pending jobs
      const pendingResponse = await fetch(
        "/api/admin/jobs/recent?status=PENDING"
      );
      const pendingData = await pendingResponse.json();
      setPendingJobs(pendingData);
    } catch (error) {
      console.error("Failed to fetch job data:", error);
      toast.error("Failed to fetch job data");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [isAdmin]);

  async function triggerDailySummary(formData: FormData) {
    const userId = formData.get("userId") as string;
    const email = formData.get("email") as string;
    const date = formData.get("date") as string;

    if (!userId || !email) {
      toast.error("User ID and email are required");
      return;
    }

    try {
      const response = await fetch("/api/admin/jobs/trigger-daily-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, email, date }),
      });

      if (response.ok) {
        toast.success("Daily summary job triggered successfully");
      } else {
        const error = await response.text();
        toast.error(`Failed to trigger job: ${error}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Error: ${error.message}`
          : "Failed to trigger job"
      );
    }
  }

  if (isAdminLoading || isLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Background Jobs</h1>
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Loading job data...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-6">Access Denied</h1>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Admin Access Required</h2>
          <p className="text-muted-foreground">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Background Jobs</h1>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.totalJobs}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">
                {stats.completedJobs}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-red-600">
                {stats.failedJobs}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">
                {stats.pendingJobs}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Trigger Daily Summary Email</CardTitle>
          <CardDescription>
            Send a test daily summary email to a user
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              triggerDailySummary(new FormData(e.currentTarget));
            }}
            className="flex flex-col md:flex-row gap-4"
          >
            <div className="flex-1">
              <label
                htmlFor="userId"
                className="block text-sm font-medium mb-1"
              >
                User ID
              </label>
              <input
                type="text"
                id="userId"
                name="userId"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="User ID"
                required
              />
            </div>
            <div className="flex-1">
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="Email address"
                required
              />
            </div>
            <div className="flex-1">
              <label htmlFor="date" className="block text-sm font-medium mb-1">
                Date (Optional)
              </label>
              <input
                type="date"
                id="date"
                name="date"
                className="w-full px-3 py-2 border rounded-md"
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div className="flex items-end">
              <Button type="submit">Send Daily Summary</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Tabs defaultValue="recent" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="recent">Recent Jobs</TabsTrigger>
          <TabsTrigger value="failed">Failed Jobs</TabsTrigger>
          <TabsTrigger value="pending">Pending Jobs</TabsTrigger>
        </TabsList>

        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={isRefreshing}
          >
            {isRefreshing ? "Refreshing..." : "Refresh Jobs"}
          </Button>
        </div>

        <TabsContent value="recent">
          <JobsTable jobs={recentJobs} onRetrySuccess={fetchData} />
        </TabsContent>

        <TabsContent value="failed">
          <JobsTable jobs={failedJobs} onRetrySuccess={fetchData} />
        </TabsContent>

        <TabsContent value="pending">
          <JobsTable jobs={pendingJobs} onRetrySuccess={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function JobsTable({
  jobs,
  onRetrySuccess,
}: {
  jobs: JobWithUser[];
  onRetrySuccess: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState<Record<string, boolean>>({});
  const [selectedJob, setSelectedJob] = useState<JobWithUser | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  async function retryJob(jobId: string, queueName: string) {
    if (isRetrying[jobId]) return;

    setIsRetrying((prev) => ({ ...prev, [jobId]: true }));

    try {
      const response = await fetch("/api/admin/jobs/retry", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ jobId, queueName }),
      });

      if (response.ok) {
        await response.json();
        toast.success(`Job retried successfully`);
        onRetrySuccess(); // Refresh the job list
      } else {
        const error = await response.json();
        toast.error(`Failed to retry job: ${error.error}`);
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? `Error: ${error.message}`
          : "Failed to retry job"
      );
    } finally {
      setIsRetrying((prev) => ({ ...prev, [jobId]: false }));
    }
  }

  function viewJobDetails(job: JobWithUser) {
    setSelectedJob(job);
    setIsDetailsModalOpen(true);
  }

  function closeDetailsModal() {
    setIsDetailsModalOpen(false);
    setSelectedJob(null);
  }

  if (jobs.length === 0) {
    return <p className="text-center py-8 text-gray-500">No jobs found</p>;
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">Queue</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-left">Created</th>
              <th className="px-4 py-2 text-left">Attempts</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr key={job.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-mono text-xs">{job.jobId}</td>
                <td className="px-4 py-2">{job.queueName}</td>
                <td className="px-4 py-2">{job.name}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={job.status} />
                </td>
                <td className="px-4 py-2">
                  {job.user ? (
                    <div>
                      <div>{job.user.name}</div>
                      <div className="text-xs text-gray-500">
                        {job.user.email}
                      </div>
                    </div>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-4 py-2">
                  <div title={new Date(job.createdAt).toLocaleString()}>
                    {formatDistanceToNow(new Date(job.createdAt), {
                      addSuffix: true,
                    })}
                  </div>
                </td>
                <td className="px-4 py-2">
                  {job.attempts}/{job.maxAttempts}
                </td>
                <td className="px-4 py-2 space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewJobDetails(job)}
                  >
                    View
                  </Button>
                  {job.status === JobStatus.FAILED && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryJob(job.jobId, job.queueName)}
                      disabled={isRetrying[job.jobId]}
                    >
                      {isRetrying[job.jobId] ? "Retrying..." : "Retry"}
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <JobDetailsModal
        job={selectedJob}
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
      />
    </>
  );
}

function StatusBadge({ status }: { status: JobStatus }) {
  let variant: "default" | "destructive" | "outline" | "secondary" = "default";

  switch (status) {
    case JobStatus.COMPLETED:
      variant = "default";
      break;
    case JobStatus.FAILED:
      variant = "destructive";
      break;
    case JobStatus.ACTIVE:
      variant = "default";
      break;
    case JobStatus.PENDING:
    case JobStatus.DELAYED:
      variant = "secondary";
      break;
    default:
      variant = "outline";
  }

  return <Badge variant={variant}>{status}</Badge>;
}

interface JobDetailsModalProps {
  job: JobWithUser | null;
  isOpen: boolean;
  onClose: () => void;
}

function JobDetailsModal({ job, isOpen, onClose }: JobDetailsModalProps) {
  if (!job) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>
            Detailed information about job {job.jobId}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-1">
            <h4 className="text-sm font-medium">ID</h4>
            <p className="text-sm font-mono break-all">{job.jobId}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Queue</h4>
            <p className="text-sm">{job.queueName}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Name</h4>
            <p className="text-sm">{job.name}</p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Status</h4>
            <StatusBadge status={job.status} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Created</h4>
            <p className="text-sm">
              {new Date(job.createdAt).toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Updated</h4>
            <p className="text-sm">
              {new Date(job.updatedAt).toLocaleString()}
            </p>
          </div>
          {job.startedAt && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Started</h4>
              <p className="text-sm">
                {new Date(job.startedAt).toLocaleString()}
              </p>
            </div>
          )}
          {job.finishedAt && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">Finished</h4>
              <p className="text-sm">
                {new Date(job.finishedAt).toLocaleString()}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <h4 className="text-sm font-medium">Attempts</h4>
            <p className="text-sm">
              {job.attempts}/{job.maxAttempts}
            </p>
          </div>
          {job.user && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium">User</h4>
              <p className="text-sm">
                {job.user.name} ({job.user.email})
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Data</h4>
          <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs">
            {JSON.stringify(job.data, null, 2)}
          </pre>
        </div>

        {job.result && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Result</h4>
            <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-xs">
              {JSON.stringify(job.result, null, 2)}
            </pre>
          </div>
        )}

        {job.error && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Error</h4>
            <div className="bg-red-50 p-4 rounded-md text-red-800 text-sm">
              {job.error}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
