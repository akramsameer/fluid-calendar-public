"use client";

import { useState } from "react";

import { ArrowLeft, Award, Clock, Share2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface WaitlistStatusData {
  position: number;
  totalWaitlist: number;
  referralCount: number;
  referralCode: string;
  estimatedTime?: string;
  status: string;
}

interface WaitlistStatusProps {
  data: WaitlistStatusData;
  onBack: () => void;
}

export default function WaitlistStatus({ data, onBack }: WaitlistStatusProps) {
  const [copied, setCopied] = useState(false);

  const referralLink = `${window.location.origin}/beta?ref=${data.referralCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success("Referral link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(
      `I just joined the FluidCalendar beta waitlist! Join using my referral link to get early access: ${referralLink}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const shareOnFacebook = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        referralLink
      )}`,
      "_blank"
    );
  };

  return (
    <div className="space-y-8">
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <Users className="mr-2 h-5 w-5 text-blue-500" />
            <h3 className="text-lg font-medium">Your Position</h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              #{data.position}
            </span>
            <span className="ml-2 text-gray-500 dark:text-gray-400">
              of {data.totalWaitlist}
            </span>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className="h-full rounded-full bg-blue-500"
              style={{
                width: `${Math.max(
                  5,
                  Math.min(
                    100,
                    100 - (data.position / data.totalWaitlist) * 100
                  )
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <Award className="mr-2 h-5 w-5 text-green-500" />
            <h3 className="text-lg font-medium">Your Referrals</h3>
          </div>
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-green-600 dark:text-green-400">
              {data.referralCount}
            </span>
            <span className="ml-2 text-gray-500 dark:text-gray-400">
              people joined using your link
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Each referral moves you up in the queue!
          </p>
        </div>
      </div>

      {data.estimatedTime && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-4 flex items-center">
            <Clock className="mr-2 h-5 w-5 text-purple-500" />
            <h3 className="text-lg font-medium">Estimated Wait Time</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {data.estimatedTime}
          </p>
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center">
          <Share2 className="mr-2 h-5 w-5 text-blue-500" />
          <h3 className="text-lg font-medium">Share Your Referral Link</h3>
        </div>
        <p className="mb-4 text-gray-600 dark:text-gray-400">
          Share this link with friends to move up in the waitlist:
        </p>
        <div className="mb-4 flex items-center">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 rounded-l-md border bg-gray-50 p-2 text-sm dark:bg-gray-900"
          />
          <Button
            onClick={copyReferralLink}
            className="rounded-l-none"
            variant={copied ? "outline" : "default"}
          >
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
        <div className="flex space-x-2">
          <Button onClick={shareOnTwitter} variant="outline" size="sm">
            Share on Twitter
          </Button>
          <Button onClick={shareOnFacebook} variant="outline" size="sm">
            Share on Facebook
          </Button>
        </div>
      </div>

      {data.status === "INVITED" && (
        <div className="rounded-lg border border-green-100 bg-green-50 p-6 dark:border-green-800 dark:bg-green-900/30">
          <h3 className="text-lg font-medium text-green-800 dark:text-green-300">
            You&apos;ve Been Invited!
          </h3>
          <p className="mt-2 text-green-700 dark:text-green-400">
            Check your email for an invitation to join the FluidCalendar beta.
          </p>
          <Button className="mt-4" variant="outline">
            Resend Invitation
          </Button>
        </div>
      )}
    </div>
  );
}
