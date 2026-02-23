"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { useAdmin } from "@/hooks/use-admin";

export default function AdminPage() {
  const { isAdmin, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="container mx-auto py-10">
        <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>
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
      <h1 className="mb-6 text-3xl font-bold">Admin Dashboard</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Job Management</CardTitle>
            <CardDescription>View and manage background jobs</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Monitor job statistics, view job details, and trigger jobs
              manually.
            </p>
            <Button asChild>
              <Link href="/admin/jobs">Manage Jobs</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO Articles</CardTitle>
            <CardDescription>
              Manage AI-generated SEO content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="mb-4">
              Generate, review, and publish SEO articles. Monitor generation
              costs and quality.
            </p>
            <Button asChild>
              <Link href="/admin/articles">Manage Articles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
