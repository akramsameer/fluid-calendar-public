import { Metadata } from "next";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";

import { BookingPageClient } from "./client";

interface PageProps {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { username, slug } = await params;

  // Find the user and booking link
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { name: true },
  });

  if (!user) {
    return {
      title: "Booking Not Found | FluidCalendar",
    };
  }

  const bookingLink = await prisma.bookingLink.findFirst({
    where: {
      user: { username: username.toLowerCase() },
      slug: slug.toLowerCase(),
    },
    select: { name: true, description: true },
  });

  if (!bookingLink) {
    return {
      title: "Booking Not Found | FluidCalendar",
    };
  }

  return {
    title: `${bookingLink.name} with ${user.name || username} | FluidCalendar`,
    description: bookingLink.description || `Schedule a meeting with ${user.name || username}`,
  };
}

export default async function BookingPage({ params }: PageProps) {
  const { username, slug } = await params;

  // Verify the booking link exists
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase() },
    select: { id: true, name: true },
  });

  if (!user) {
    notFound();
  }

  const bookingLink = await prisma.bookingLink.findFirst({
    where: {
      userId: user.id,
      slug: slug.toLowerCase(),
    },
    select: {
      id: true,
      name: true,
      description: true,
      duration: true,
      enabled: true,
    },
  });

  if (!bookingLink) {
    notFound();
  }

  // If disabled, show disabled message
  if (!bookingLink.enabled) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto max-w-md px-4 text-center">
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
            Booking Unavailable
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This booking link is currently unavailable. Please contact{" "}
            {user.name || username} directly to schedule a meeting.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BookingPageClient
      username={username}
      slug={slug}
      bookingLink={{
        id: bookingLink.id,
        name: bookingLink.name,
        description: bookingLink.description,
        duration: bookingLink.duration,
      }}
      hostName={user.name || username}
    />
  );
}
