"use client";

import { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/hooks/use-admin";

interface ArticleStats {
  clusters: {
    total: number;
    pending: number;
    generating: number;
    published: number;
    needsReview: number;
    failed: number;
    skipped: number;
  };
  ai: {
    totalCost: number;
    totalTokens: number;
    totalCalls: number;
  };
}

interface ArticleCluster {
  id: string;
  slug: string;
  title: string;
  clusterType: string;
  status: string;
  priorityScore: number;
  generationAttempts: number;
  errorMessage?: string;
  publishedAt?: string;
  createdAt: string;
  article?: {
    id: string;
    slug: string;
    published: boolean;
  };
  logs: {
    id: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    durationMs?: number;
    wordCount?: number;
    errorMessage?: string;
  }[];
}

interface ArticleListResponse {
  clusters: ArticleCluster[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "generating", label: "Generating" },
  { value: "published", label: "Published" },
  { value: "needs_review", label: "Needs Review" },
  { value: "failed", label: "Failed" },
  { value: "skipped", label: "Skipped" },
];

const CLUSTER_TYPE_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "use_case", label: "Use Case" },
  { value: "productivity_tip", label: "Productivity Tip" },
  { value: "feature_guide", label: "Feature Guide" },
  { value: "comparison", label: "Comparison" },
  { value: "integration", label: "Integration" },
  { value: "industry", label: "Industry" },
  { value: "role", label: "Role" },
  { value: "problem_solution", label: "Problem Solution" },
  { value: "best_practice", label: "Best Practice" },
  { value: "seasonal", label: "Seasonal" },
  { value: "template", label: "Template" },
  { value: "long_tail", label: "Long Tail" },
];

function getStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "published":
      return "default";
    case "needs_review":
      return "secondary";
    case "failed":
      return "destructive";
    case "generating":
      return "outline";
    default:
      return "outline";
  }
}

function formatDuration(ms?: number): string {
  if (!ms) return "-";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

export default function ArticlesAdminPage() {
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [previewCluster, setPreviewCluster] = useState<ArticleCluster | null>(null);
  const [showReseedConfirm, setShowReseedConfirm] = useState(false);

  // Fetch stats
  const { data: stats } = useQuery<ArticleStats>({
    queryKey: ["article-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/articles/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: isAdmin,
  });

  // Fetch articles list
  const { data: articlesData, isLoading } = useQuery<ArticleListResponse>({
    queryKey: ["articles", statusFilter, typeFilter, searchQuery, page],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("clusterType", typeFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", page.toString());
      params.set("limit", "20");

      const res = await fetch(`/api/admin/articles?${params}`);
      if (!res.ok) throw new Error("Failed to fetch articles");
      return res.json();
    },
    enabled: isAdmin,
  });

  // Generate mutation
  const generateMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      const res = await fetch(`/api/admin/articles/${clusterId}/generate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to generate");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
    },
  });

  // Publish mutation
  const publishMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      const res = await fetch(`/api/admin/articles/${clusterId}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to publish");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
    },
  });

  // Skip mutation
  const skipMutation = useMutation({
    mutationFn: async (clusterId: string) => {
      const res = await fetch(`/api/admin/articles/${clusterId}/skip`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to skip");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
    },
  });

  // Seed mutation
  const seedMutation = useMutation({
    mutationFn: async (options: { force?: boolean }) => {
      const params = new URLSearchParams();
      if (options.force) params.set("force", "true");
      const res = await fetch(`/api/admin/articles/seed?${params}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to seed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article-stats"] });
    },
  });

  // Fetch full article for preview
  const { data: previewData } = useQuery({
    queryKey: ["article-preview", previewCluster?.id],
    queryFn: async () => {
      if (!previewCluster?.id) return null;
      const res = await fetch(`/api/admin/articles/${previewCluster.id}`);
      if (!res.ok) throw new Error("Failed to fetch article");
      return res.json();
    },
    enabled: !!previewCluster?.id,
  });

  if (isAdminLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="mb-6 text-3xl font-bold">Article Management</h1>
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="mb-6 text-3xl font-bold">Access Denied</h1>
        <div className="flex flex-col items-center justify-center p-8 text-center">
          <h2 className="mb-4 text-2xl font-bold">Admin Access Required</h2>
          <p className="text-muted-foreground">
            You need administrator privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Article Management</h1>
        <div className="flex gap-2">
          {stats && stats.clusters.total === 0 ? (
            <Button
              onClick={() => seedMutation.mutate({})}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? "Seeding..." : "Seed Clusters"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setShowReseedConfirm(true)}
              disabled={seedMutation.isPending}
            >
              {seedMutation.isPending ? "Seeding..." : "Reseed Clusters"}
            </Button>
          )}
        </div>
      </div>

      {/* Reseed Confirmation Dialog */}
      <Dialog open={showReseedConfirm} onOpenChange={setShowReseedConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reseed Article Clusters?</DialogTitle>
            <DialogDescription>
              This will delete all existing clusters, articles, and generation logs,
              then create ~1,000 new cluster templates. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReseedConfirm(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                seedMutation.mutate({ force: true });
                setShowReseedConfirm(false);
              }}
            >
              Yes, Reseed All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Seed Result Message */}
      {seedMutation.isSuccess && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
          <p className="text-green-800 dark:text-green-200">
            Successfully seeded {seedMutation.data.inserted} clusters
            {seedMutation.data.skipped > 0 && ` (${seedMutation.data.skipped} skipped)`}
          </p>
        </div>
      )}
      {seedMutation.isError && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
          <p className="text-red-800 dark:text-red-200">
            Failed to seed: {seedMutation.error?.message}
          </p>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total</CardDescription>
              <CardTitle className="text-2xl">{stats.clusters.total}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending</CardDescription>
              <CardTitle className="text-2xl text-gray-500">
                {stats.clusters.pending}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Generating</CardDescription>
              <CardTitle className="text-2xl text-blue-500">
                {stats.clusters.generating}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Published</CardDescription>
              <CardTitle className="text-2xl text-green-600">
                {stats.clusters.published}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Needs Review</CardDescription>
              <CardTitle className="text-2xl text-yellow-600">
                {stats.clusters.needsReview}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Failed</CardDescription>
              <CardTitle className="text-2xl text-red-600">
                {stats.clusters.failed}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>AI Cost</CardDescription>
              <CardTitle className="text-2xl">
                ${stats.ai.totalCost.toFixed(2)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-48">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {CLUSTER_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Input
                placeholder="Search by title or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles Table */}
      <Card>
        <CardHeader>
          <CardTitle>Articles</CardTitle>
          <CardDescription>
            {articlesData?.pagination.total || 0} total articles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-32 items-center justify-center">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Last Gen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articlesData?.clusters.map((cluster) => (
                    <TableRow key={cluster.id}>
                      <TableCell>
                        <div className="font-medium">{cluster.title}</div>
                        <div className="text-sm text-muted-foreground">
                          /learn/{cluster.slug}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {cluster.clusterType.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(cluster.status)}>
                          {cluster.status.replace("_", " ")}
                        </Badge>
                        {cluster.errorMessage && (
                          <p className="mt-1 text-xs text-red-500">
                            {cluster.errorMessage.substring(0, 50)}...
                          </p>
                        )}
                      </TableCell>
                      <TableCell>{cluster.priorityScore}</TableCell>
                      <TableCell>
                        {cluster.logs[0] ? (
                          <div className="text-sm">
                            <div>{formatDuration(cluster.logs[0].durationMs)}</div>
                            {cluster.logs[0].wordCount && (
                              <div className="text-muted-foreground">
                                {cluster.logs[0].wordCount} words
                              </div>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {cluster.article && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (cluster.status === "published") {
                                  window.open(`/learn/${cluster.slug}`, "_blank");
                                } else {
                                  setPreviewCluster(cluster);
                                }
                              }}
                            >
                              {cluster.status === "published" ? "View" : "Preview"}
                            </Button>
                          )}
                          {(cluster.status === "pending" ||
                            cluster.status === "failed") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateMutation.mutate(cluster.id)}
                              disabled={generateMutation.isPending}
                            >
                              Generate
                            </Button>
                          )}
                          {cluster.status === "needs_review" && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => publishMutation.mutate(cluster.id)}
                              disabled={publishMutation.isPending}
                            >
                              Publish
                            </Button>
                          )}
                          {cluster.status !== "published" &&
                            cluster.status !== "skipped" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => skipMutation.mutate(cluster.id)}
                                disabled={skipMutation.isPending}
                              >
                                Skip
                              </Button>
                            )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {articlesData && articlesData.pagination.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {articlesData.pagination.page} of{" "}
                    {articlesData.pagination.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) =>
                          Math.min(articlesData.pagination.totalPages, p + 1)
                        )
                      }
                      disabled={page === articlesData.pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewCluster} onOpenChange={() => setPreviewCluster(null)}>
        <DialogContent className="max-h-[80vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{previewCluster?.title}</DialogTitle>
            <DialogDescription>
              /learn/{previewCluster?.slug}
            </DialogDescription>
          </DialogHeader>
          {previewData?.article?.content && (
            <div
              className="prose prose-sm max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: previewData.article.content }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
