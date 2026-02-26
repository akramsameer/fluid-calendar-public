import { useMutation, useQuery } from "@tanstack/react-query";

import {
  LifetimeSubscriptionRequest,
  subscriptionService,
} from "../services/subscription";

interface SubscriptionStatus {
  hasActiveSubscription: boolean;
  plan?: string;
  status?: string;
  loading: boolean;
  error?: Error;
}

export function useSubscription(): SubscriptionStatus {
  const { data, isLoading, error } = useQuery({
    queryKey: ["subscription-status"],
    queryFn: subscriptionService.getSubscriptionStatus,
    retry: false,
  });

  return {
    hasActiveSubscription: data?.hasActiveSubscription ?? false,
    plan: data?.plan,
    status: data?.status,
    loading: isLoading,
    error: error instanceof Error ? error : undefined,
  };
}

export const useLifetimeSubscription = () => {
  return useMutation({
    mutationFn: (data: LifetimeSubscriptionRequest) =>
      subscriptionService.createLifetimeCheckout(data),
  });
};
