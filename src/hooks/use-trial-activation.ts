"use client";

import { useState } from "react";

import { toast } from "sonner";

import { subscriptionService } from "@/lib/services/subscription.saas";

export function useTrialActivation() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activateTrial = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await subscriptionService.activateTrial();

      if (data.success) {
        toast.success("Trial activated!", {
          description:
            "You now have 14 days of Advanced plan access. Redirecting to calendar...",
          duration: 3000,
        });

        // Redirect to calendar after successful trial activation
        setTimeout(() => {
          window.location.href = "/calendar";
        }, 1500);

        return true;
      } else {
        throw new Error(data.message || "Failed to activate trial");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An unexpected error occurred";

      setError(errorMessage);

      toast.error("Trial activation failed", {
        description: errorMessage,
        duration: 5000,
      });

      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => setError(null);

  return {
    activateTrial,
    isLoading,
    error,
    clearError,
  };
}
