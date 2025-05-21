// Tanstack Query hook for lifetime status
import { useQuery } from "@tanstack/react-query";

import { api } from "./api";

export interface LifetimeSubscriptionRequest {
  email: string;
  name?: string;
}

export interface LifetimeSubscriptionResponse {
  url: string;
}

export const subscriptionService = {
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
};

export function useLifetimeStatusQuery() {
  return useQuery({
    queryKey: ["lifetime-status"],
    queryFn: subscriptionService.getLifetimeStatus,
  });
}
