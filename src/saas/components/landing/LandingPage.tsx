"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error("Failed to join waitlist");
      }

      setIsSubmitted(true);
      setEmail("");
    } catch (error) {
      // Ignore the specific error, just show a generic message
      console.error(error);
      setError("Failed to join waitlist. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* GitHub Button in Top Right */}
      <div className="absolute top-4 right-4">
        <Link
          href="https://github.com/fluidcalendar/fluidcalendar"
          target="_blank"
        >
          <Button size="sm" className="bg-black text-white hover:bg-gray-800">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              className="mr-2"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.012 8.012 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
            View on GitHub
          </Button>
        </Link>
      </div>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 py-12">
        {/* Logo */}
        <div className="mb-8">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-16 w-16"
          >
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
        </div>

        {/* Title and Description */}
        <h1 className="text-5xl md:text-6xl font-bold mb-6 text-center">
          <span className="text-gray-200">Welcome to </span>
          <span className="text-blue-600">FluidCalendar</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4 text-center">
          The open-source intelligent calendar that adapts to your workflow.
          Experience seamless task scheduling powered by AI, designed to make
          your time management effortless.
        </p>
        <p className="text-lg text-gray-500 mb-8 text-center">
          Your open-source alternative to Motion
        </p>

        {/* GitHub Button */}
        <div className="mb-8">
          <Link
            href="https://github.com/fluidcalendar/fluidcalendar"
            target="_blank"
          >
            <Button className="px-8 py-6 text-lg bg-blue-600 hover:bg-blue-700">
              View on GitHub
            </Button>
          </Link>
        </div>

        {/* Waitlist Form */}
        <div className="w-full max-w-md bg-gray-50 p-8 rounded-lg border border-gray-200 mb-16">
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <Button
              onClick={handleSubmit}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Joining..." : "Join Waitlist"}
            </Button>
            {isSubmitted && (
              <div className="text-green-600 flex items-center justify-center gap-2 mt-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Thanks for joining! We&apos;ll be in touch soon.</span>
              </div>
            )}
          </div>
        </div>

        {/* Features Section */}
        <div className="w-full max-w-6xl">
          {/* AI-Powered Scheduling */}
          <div className="bg-white p-8 rounded-lg shadow-sm mb-8 flex">
            <div className="text-blue-600 mr-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                AI-Powered Scheduling
              </h3>
              <p className="text-gray-600">
                FluidCalendar&apos;s intelligent AI adapts to your work style,
                automatically scheduling tasks for optimal productivity.
              </p>
            </div>
          </div>

          {/* Seamless Integration */}
          <div className="bg-white p-8 rounded-lg shadow-sm mb-8 flex">
            <div className="text-blue-600 mr-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Seamless Integration
              </h3>
              <p className="text-gray-600">
                Sync with Google Calendar, Outlook, and other popular calendar
                services without missing a beat.
              </p>
            </div>
          </div>

          {/* Smart Time Management */}
          <div className="bg-white p-8 rounded-lg shadow-sm mb-8 flex">
            <div className="text-blue-600 mr-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Smart Time Management
              </h3>
              <p className="text-gray-600">
                Let FluidCalendar optimize your schedule, finding the perfect
                time slots for your tasks and meetings.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
