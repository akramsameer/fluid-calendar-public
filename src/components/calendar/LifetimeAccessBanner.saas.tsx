"use client";

import * as React from "react";
import { useEffect, useState } from "react";

import { type VariantProps, cva } from "class-variance-authority";
import { Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import { useLifetimeStatusQuery } from "@/lib/services/subscription.saas";
import { cn } from "@/lib/utils";

const bannerVariants = cva("relative w-full", {
    variants: {
        variant: {
            default: "bg-background border border-border",
            muted: "dark bg-muted",
            border: "border-b border-border",
        },
        size: {
            sm: "px-4 py-2",
            default: "px-4 py-3",
            lg: "px-4 py-3 md:py-2",
        },
        rounded: {
            none: "",
            default: "rounded-lg",
        },
    },
    defaultVariants: {
        variant: "default",
        size: "default",
        rounded: "none",
    },
});

interface BannerProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
    icon?: React.ReactNode;
    action?: React.ReactNode;
    onClose?: () => void;
    isClosable?: boolean;
    layout?: "row" | "center" | "complex";
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
    (
        {
            className,
            variant,
            size,
            rounded,
            icon,
            action,
            onClose,
            isClosable,
            layout = "row",
            children,
            ...props
        },
        ref
    ) => {
        const innerContent = (
            <div
                className={cn(
                    "flex gap-2",
                    layout === "center" && "justify-center",
                    layout === "complex" && "md:items-center"
                )}
            >
                {layout === "complex" ? (
                    <div className="flex grow gap-3 md:items-center">
                        {icon && (
                            <div className="flex shrink-0 items-center gap-3 max-md:mt-0.5">
                                {icon}
                            </div>
                        )}
                        <div
                            className={cn(
                                "flex grow",
                                layout === "complex" &&
                                "flex-col justify-between gap-3 md:flex-row md:items-center"
                            )}
                        >
                            {children}
                        </div>
                    </div>
                ) : (
                    <>
                        {icon && (
                            <div className="flex shrink-0 items-center gap-3">{icon}</div>
                        )}
                        <div className="flex grow items-center justify-between gap-3">
                            {children}
                        </div>
                    </>
                )}
                {(action || isClosable) && (
                    <div className="flex items-center gap-3">
                        {action}
                        {isClosable && (
                            <Button
                                variant="ghost"
                                className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent"
                                onClick={onClose}
                                aria-label="Close banner"
                            >
                                <X
                                    size={16}
                                    strokeWidth={2}
                                    className="opacity-60 transition-opacity group-hover:opacity-100"
                                    aria-hidden="true"
                                />
                            </Button>
                        )}
                    </div>
                )}
            </div>
        );

        return (
            <div
                ref={ref}
                className={cn(bannerVariants({ variant, size, rounded }), className)}
                {...props}
            >
                {innerContent}
            </div>
        );
    }
);
Banner.displayName = "Banner";

export const LifetimeAccessBanner: React.FC = () => {
    const { data: lifetimeStatus } = useLifetimeStatusQuery();
    const hasLifetimeAccess = lifetimeStatus?.hasLifetimeAccess;

    const [isVisible, setIsVisible] = useState(false);
    const [hasCheckedStorage, setHasCheckedStorage] = useState(false);

    useEffect(() => {
        // Check if the banner has been dismissed before
        const bannerDismissed = localStorage.getItem(
            "lifetimeAccessBannerDismissed"
        );
        if (bannerDismissed === "true") {
            setIsVisible(false);
        } else if (hasLifetimeAccess === false) {
            // Only show banner if we've confirmed user doesn't have lifetime access
            setIsVisible(true);
        }
        setHasCheckedStorage(true);
    }, [hasLifetimeAccess]);

    const handleDismiss = () => {
        // Save the dismissal in localStorage
        localStorage.setItem("lifetimeAccessBannerDismissed", "true");
        setIsVisible(false);
    };

    // Don't render anything if user has lifetime access or banner should be hidden
    if (hasLifetimeAccess || !isVisible || !hasCheckedStorage) {
        return null;
    }

    return (
        <Banner variant="muted" className="dark text-foreground">
            <div className="flex w-full gap-2 md:items-center">
                <div className="flex grow gap-3 md:items-center">
                    <div
                        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 max-md:mt-0.5"
                        aria-hidden="true"
                    >
                        <Sparkles className="opacity-80" size={16} strokeWidth={2} />
                    </div>
                    <div className="flex grow flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div className="space-y-0.5">
                            <p className="text-sm font-medium">Upgrade to Lifetime Access</p>
                            <p className="text-sm text-muted-foreground">
                                Get unlimited access to all features forever with a one-time
                                payment.
                            </p>
                        </div>
                        <div className="flex gap-2 max-md:flex-wrap">
                            <Button size="sm" className="text-sm" asChild>
                                <a href="/beta">Buy Lifetime Access</a>
                            </Button>
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    className="group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent"
                    onClick={handleDismiss}
                    aria-label="Close banner"
                >
                    <X
                        size={16}
                        strokeWidth={2}
                        className="opacity-60 transition-opacity group-hover:opacity-100"
                        aria-hidden="true"
                    />
                </Button>
            </div>
        </Banner>
    );
}; 