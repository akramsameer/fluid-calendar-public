import { useMutation } from "@tanstack/react-query";

import {
  LifetimeSubscriptionRequest,
  subscriptionService,
} from "../services/subscription";

export const useLifetimeSubscription = () => {
  return useMutation({
    mutationFn: (data: LifetimeSubscriptionRequest) =>
      subscriptionService.createLifetimeCheckout(data),
  });
};
