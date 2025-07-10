import { useSession } from "next-auth/react";

import { useQuery } from "@tanstack/react-query";

import { subscriptionService } from "@/lib/services/subscription.saas";

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan?: string;
  status?: string;
  loading: boolean;
  error?: Error;
}

/**
 * Hook to check user's subscription status
 * Optimized for performance with aggressive caching and background updates
 */
export function useSubscription(): SubscriptionStatus {
  const { data: session, status: sessionStatus } = useSession();

  // Only fetch subscription data if user is authenticated
  const {
    data: subscriptionData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["subscription", session?.user?.email],
    queryFn: subscriptionService.getSubscriptionStatus,
    enabled: !!session?.user?.email, // Only run query if user is authenticated
    staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    retry: (failureCount, error) => {
      // Don't retry on authentication errors (401/403)
      if (error instanceof Error) {
        if (error.message.includes("Authentication required")) return false;
        if (error.message.includes("401")) return false;
        if (error.message.includes("403")) return false;
      }
      // Retry other errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000), // Exponential backoff
    refetchOnWindowFocus: true, // Refresh when user returns to tab
    refetchOnMount: false, // Don't refetch if we have cached data
    refetchInterval: 1000 * 60 * 5, // Background refresh every 5 minutes
    refetchIntervalInBackground: false, // Don't refetch when tab is not active
  });

  // If session is loading, show loading state only initially
  // After first load, we'll use cached data and update in background
  if (sessionStatus === "loading" && !subscriptionData) {
    return {
      hasActiveSubscription: false,
      loading: true,
    };
  }

  // If no session, user is not authenticated
  if (!session) {
    return {
      hasActiveSubscription: false,
      loading: false,
    };
  }

  // If we have cached data, return it immediately (even if stale)
  // The query will update in the background if needed
  if (subscriptionData) {
    return {
      hasActiveSubscription: subscriptionData.hasActiveSubscription || false,
      plan: subscriptionData.plan,
      status: subscriptionData.status,
      loading: false, // Don't show loading if we have cached data
      error: error ? (error as Error) : undefined,
    };
  }

  // Only show loading if we're actually fetching for the first time
  if (isLoading) {
    return {
      hasActiveSubscription: false,
      loading: true,
      error: error ? (error as Error) : undefined,
    };
  }

  // If there's an error and no cached data, return error state
  if (error) {
    // If it's an authentication error, don't treat it as a regular error
    // This should be handled by the authentication flow
    if (error.message.includes("Authentication required")) {
      return {
        hasActiveSubscription: false,
        loading: false,
        // Don't expose auth errors as regular errors - let auth middleware handle
      };
    }

    return {
      hasActiveSubscription: false,
      loading: false,
      error: error as Error,
    };
  }

  // Fallback - should rarely reach here
  return {
    hasActiveSubscription: false,
    loading: false,
  };
}
