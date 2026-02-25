"use client";

import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { isSaasEnabled } from "@/lib/config";
import { logger } from "@/lib/logger";
import { subscriptionService } from "@/lib/services/subscription";

import { useSubscription } from "@/hooks/useSubscription";

const LOG_SOURCE = "SubscriptionGuard";

// Routes that don't require subscription (public routes)
const PUBLIC_ROUTES = [
    "/auth",
    "/pricing",
    "/subscription",
    "/beta",
    "/terms",
    "/privacy",
    "/setup",
    "/api",
    "/_next",
    "/favicon",
];

// Routes that are specifically for subscription/payment flows
const SUBSCRIPTION_FLOW_ROUTES = [
    "/subscription/success",
    "/subscription/lifetime/success",
    "/subscription/lifetime/setup-password",
];

interface SubscriptionGuardProps {
    children: React.ReactNode;
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { data: session, status: sessionStatus } = useSession();
    const queryClient = useQueryClient();

    // IMPORTANT: Always call all hooks before any conditional logic
    // This ensures consistent hook call order on every render
    const { hasActiveSubscription, loading: subscriptionLoading, error } = useSubscription();
    const redirectTriggered = useRef(false);

    // Calculate route types after all hooks are called
    const isPublicRoute = PUBLIC_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    const isSubscriptionFlowRoute = SUBSCRIPTION_FLOW_ROUTES.some(route =>
        pathname.startsWith(route)
    );

    // Prefetch subscription data when session becomes available
    // This eliminates loading delays when users navigate to protected routes
    useEffect(() => {
        // Only prefetch if SAAS is enabled and user is authenticated
        if (!isSaasEnabled || !session?.user?.email) {
            return;
        }

        // Prefetch subscription data in the background using the subscription service
        // The useSubscription hook will benefit from this prefetched data
        queryClient.prefetchQuery({
            queryKey: ["subscription", session.user.email],
            queryFn: subscriptionService.getSubscriptionStatus,
            staleTime: 1000 * 60 * 10, // Consider data fresh for 10 minutes
        }).catch((error) => {
            // Silently handle prefetch errors - they'll be handled by the main query
            logger.info("Subscription prefetch failed, will retry in main query", {
                userId: session.user?.email || "unknown",
                error: error?.message || "Unknown error",
            }, LOG_SOURCE);
        });
    }, [session?.user?.email, queryClient]);

    // Background subscription check effect - always register the effect
    useEffect(() => {
        // Only trigger redirect if all conditions are met
        if (
            isSaasEnabled && // SAAS features enabled
            !isPublicRoute && // Not a public route
            !isSubscriptionFlowRoute && // Not a subscription flow route
            session && // User is authenticated
            !subscriptionLoading && // Subscription check complete
            !redirectTriggered.current && // Haven't redirected yet
            !hasActiveSubscription && // No active subscription
            !error // No API errors
        ) {
            redirectTriggered.current = true;

            logger.info("User without subscription trying to access protected route", {
                userId: session.user?.email || "unknown",
                pathname,
            }, LOG_SOURCE);

            // Redirect to pricing with return URL
            const redirectUrl = `/pricing?redirect=${encodeURIComponent(pathname)}`;
            router.push(redirectUrl);
        }
    }, [
        isPublicRoute,
        isSubscriptionFlowRoute,
        session,
        subscriptionLoading,
        hasActiveSubscription,
        error,
        pathname,
        router,
    ]);

    // Now handle rendering logic after all hooks are called

    // 1. If SAAS features are disabled, don't apply any subscription checks
    if (!isSaasEnabled) {
        logger.info("SAAS features disabled, bypassing subscription check", {}, LOG_SOURCE);
        return <>{children}</>;
    }

    // 2. Allow public routes and subscription flow routes
    if (isPublicRoute || isSubscriptionFlowRoute) {
        return <>{children}</>;
    }

    // 3. If user is not authenticated, let the auth middleware handle it
    if (sessionStatus === "loading") {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!session) {
        // User is not authenticated, let auth middleware handle redirect
        return <>{children}</>;
    }

    // 4. OPTIMISTIC RENDERING: 
    // Render the app immediately while subscription check happens in background
    // This gives users with subscriptions instant access without any loading state

    // If subscription is loading and we haven't determined the status yet, 
    // optimistically render the children (for better UX)
    if (subscriptionLoading) {
        logger.info("Optimistically rendering while checking subscription in background", {
            userId: session.user?.email || "unknown",
            pathname,
        }, LOG_SOURCE);
        return <>{children}</>;
    }

    // If there's an error checking subscription, allow access (fail open)
    // This prevents API issues from blocking legitimate users
    if (error) {
        logger.warn("Subscription check failed, allowing access", {
            userId: session.user?.email || "unknown",
            pathname,
            error: error.message,
        }, LOG_SOURCE);
        return <>{children}</>;
    }

    // 5. Subscription check complete
    if (hasActiveSubscription) {
        logger.info("User with active subscription accessing protected route", {
            userId: session.user?.email || "unknown",
            pathname,
        }, LOG_SOURCE);
        return <>{children}</>;
    }

    // 6. User doesn't have subscription - redirect will be triggered by useEffect
    // Show a brief transition message while redirect is happening
    return (
        <div className="flex min-h-screen items-center justify-center">
            <div className="text-center">
                <div className="animate-pulse text-muted-foreground mb-2">
                    Checking access...
                </div>
                <div className="text-sm text-muted-foreground">
                    Redirecting to subscription options
                </div>
            </div>
        </div>
    );
} 