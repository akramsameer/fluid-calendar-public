// Tanstack Query hook for lifetime status
import { SubscriptionPlan } from "@prisma/client";
import { useMutation, useQuery } from "@tanstack/react-query";

import { TrialActivationResponse } from "@/types/subscription";

import { api } from "@/lib/services/api";

export interface LifetimeSubscriptionRequest {
  email: string;
  name?: string;
}

export interface LifetimeSubscriptionResponse {
  url: string;
}

// Universal checkout interfaces
export interface CheckoutRequest {
  plan: SubscriptionPlan;
  successUrl?: string;
  cancelUrl?: string;
  trialDays?: number;
}

export interface CheckoutResponse {
  sessionId?: string;
  url?: string;
  plan: SubscriptionPlan;
  trialDays?: number;
  isEarlyBird?: boolean;
  success?: boolean;
  message?: string;
  redirectUrl?: string;
}

export interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan?: string;
  status?: string;
}

export const subscriptionService = {
  // Get subscription status
  getSubscriptionStatus: async (): Promise<SubscriptionStatus> => {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout

    try {
      const response = await fetch("/api/subscription/status", {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 401) {
        throw new Error("Authentication required");
      }

      if (!response.ok) {
        throw new Error(
          `Failed to fetch subscription status: ${response.status}`
        );
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error("Request timeout - subscription check took too long");
      }
      
      throw error;
    }
  },

  // Universal checkout method
  createCheckout: async (data: CheckoutRequest): Promise<CheckoutResponse> => {
    const response = await fetch("/api/subscription/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create checkout session");
    }

    return response.json();
  },

  // Legacy lifetime checkout method (kept for backward compatibility)
  createLifetimeCheckout: async (
    data: LifetimeSubscriptionRequest
  ): Promise<LifetimeSubscriptionResponse> => {
    const response = await api.post<LifetimeSubscriptionResponse>(
      "/subscription/lifetime",
      data
    );
    return response.data;
  },

  getLifetimeStatus: async (): Promise<{ hasLifetimeAccess: boolean }> => {
    const res = await fetch("/api/subscription/lifetime/status");
    if (!res.ok) throw new Error("Failed to fetch lifetime status");
    return res.json();
  },

  activateTrial: async (): Promise<TrialActivationResponse> => {
    const response = await fetch("/api/subscription/trial/activate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to activate trial");
    }

    return response.json();
  },
};

// React Query hooks
export function useCheckoutMutation() {
  return useMutation({
    mutationFn: subscriptionService.createCheckout,
    onSuccess: (data) => {
      // Redirect to appropriate URL
      if (data.url) {
        window.location.href = data.url;
      } else if (data.redirectUrl) {
        // For FREE plan, redirect to app
        window.location.href = data.redirectUrl;
      }
    },
    onError: (error) => {
      console.error("Checkout creation failed:", error);
    },
  });
}

export function useLifetimeStatusQuery() {
  return useQuery({
    queryKey: ["lifetime-status"],
    queryFn: subscriptionService.getLifetimeStatus,
  });
}

export function useTrialActivationMutation() {
  return useMutation({
    mutationFn: subscriptionService.activateTrial,
    onSuccess: (data) => {
      // Optionally invalidate related queries here
      console.log("Trial activated successfully:", data);
    },
    onError: (error) => {
      console.error("Trial activation failed:", error);
    },
  });
}
