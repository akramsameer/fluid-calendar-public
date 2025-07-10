import { useQuery } from "@tanstack/react-query";

interface EarlyBirdStatus {
  isEarlyBird: boolean;
  currentPrice: number;
  earlyBirdPrice: number;
  regularPrice: number;
  remainingSlots: number;
  lifetimeCount: number;
}

async function fetchEarlyBirdStatus(): Promise<EarlyBirdStatus> {
  const response = await fetch("/api/subscription/early-bird-status");

  if (!response.ok) {
    throw new Error("Failed to fetch early bird status");
  }

  return response.json();
}

export function useEarlyBirdStatus() {
  return useQuery({
    queryKey: ["early-bird-status"],
    queryFn: fetchEarlyBirdStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}
