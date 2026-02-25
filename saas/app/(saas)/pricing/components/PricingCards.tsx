"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { CheckIcon, StarIcon, Clock } from "lucide-react";
import { useState } from "react";

import { SubscriptionPlan } from "@prisma/client";

import { TrialSection } from "@/components/subscription";
import { useEarlyBirdStatus } from "@/hooks/use-early-bird-status";
import { useCalendarProviderCount } from "@/hooks/use-calendar-provider-count";
import { useCheckoutMutation } from "@/lib/services/subscription";
import { getButtonState, getPlanEnum } from "@/lib/utils/plan-comparison";
import { validatePlanDowngrade } from "@/lib/utils/plan-validation";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

// Plan configurations based on the subscription schema
const PLANS = {
    BASIC: {
        name: "Basic",
        monthlyPrice: 5,
        yearlyPrice: 50,
        calendarProviders: 1,
        features: [
            "1 Calendar Provider",
            "Basic Calendar Sync",
            "Task Management",
            "Email Support"
        ]
    },
    PRO: {
        name: "Pro",
        monthlyPrice: 9,
        yearlyPrice: 90,
        calendarProviders: 2,
        features: [
            "Everything in Basic",
            "2 Calendar Providers",
            "Advanced Scheduling",
            "Priority Support",
            "Calendar Analytics"
        ]
    },
    ADVANCED: {
        name: "Advanced",
        monthlyPrice: 19,
        yearlyPrice: 190,
        calendarProviders: null, // unlimited
        features: [
            "Everything in Pro",
            "Unlimited Calendar Providers",
            "Team Collaboration",
            "Advanced Analytics",
            "Custom Integrations",
            "24/7 Support"
        ]
    }
};



interface PricingCardsProps {
    redirectUrl?: string;
}

export default function PricingCards({ redirectUrl }: PricingCardsProps) {
    const [isAnnual, setIsAnnual] = useState(false);
    const checkoutMutation = useCheckoutMutation();
    const { data: earlyBirdStatus, isLoading: isEarlyBirdLoading } = useEarlyBirdStatus();
    const { data: calendarProviderData, isLoading: isProviderCountLoading } = useCalendarProviderCount();
    const subscription = useSubscription();



    const handleCheckout = (planName: string, isLifetime = false) => {
        const plan = isLifetime
            ? SubscriptionPlan.LIFETIME
            : getPlanEnum(planName, isAnnual);

        // Validate plan downgrade for trialing users
        if (isTrialing && calendarProviderData) {
            const validation = validatePlanDowngrade(
                plan,
                calendarProviderData.count,
                isTrialing
            );

            if (!validation.isValid) {
                toast.error(validation.message, {
                    description: validation.suggestedAction,
                    duration: 8000, // Show longer for important messages
                });
                return; // Prevent checkout
            }
        }

        const successUrl = redirectUrl
            ? `${window.location.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(redirectUrl)}`
            : undefined;

        checkoutMutation.mutate({
            plan,
            cancelUrl: `${window.location.origin}/pricing?canceled=true`,
            ...(successUrl && { successUrl }),
        });
    };

    const isLoading = checkoutMutation.isPending || isProviderCountLoading;

    // Helper function to get button state for each plan
    const isTrialing = subscription.status === "TRIALING";

    const getBasicButtonState = () => {
        const targetPlan = getPlanEnum("BASIC", isAnnual);
        return getButtonState(
            subscription.plan as SubscriptionPlan | null,
            targetPlan,
            subscription.hasActiveSubscription,
            isTrialing
        );
    };

    const getProButtonState = () => {
        const targetPlan = getPlanEnum("PRO", isAnnual);
        return getButtonState(
            subscription.plan as SubscriptionPlan | null,
            targetPlan,
            subscription.hasActiveSubscription,
            isTrialing
        );
    };

    const getAdvancedButtonState = () => {
        const targetPlan = getPlanEnum("ADVANCED", isAnnual);
        return getButtonState(
            subscription.plan as SubscriptionPlan | null,
            targetPlan,
            subscription.hasActiveSubscription,
            isTrialing
        );
    };

    const getLifetimeButtonState = () => {
        return getButtonState(
            subscription.plan as SubscriptionPlan | null,
            SubscriptionPlan.LIFETIME,
            subscription.hasActiveSubscription,
            isTrialing
        );
    };

    // Check if user should see trial section
    const shouldShowTrial = () => {
        // If subscription is still loading, hide trial by default
        if (subscription.loading) {
            return false;
        }

        // If user is actively trialing, always show trial card
        if (isTrialing) {
            return true;
        }

        // Hide trial if user has ANY active subscription (except trialing)
        if (subscription.hasActiveSubscription) {
            return false;
        }

        // Show trial only for users with no active subscription
        return true;
    };

    return (
        <div className="container py-4 lg:py-4">
            {/* Billing Toggle */}
            <div className="flex justify-center items-center mb-12">
                <Label htmlFor="payment-schedule" className="me-3">
                    Monthly
                </Label>
                <Switch
                    checked={isAnnual}
                    onCheckedChange={() => setIsAnnual(!isAnnual)}
                    id="payment-schedule"
                />
                <Label htmlFor="payment-schedule" className="relative ms-3">
                    Annual
                    <span className="absolute -top-10 start-auto -end-28">
                        <span className="flex items-center">
                            <svg
                                className="w-14 h-8 -me-6"
                                width={45}
                                height={25}
                                viewBox="0 0 45 25"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M43.2951 3.47877C43.8357 3.59191 44.3656 3.24541 44.4788 2.70484C44.5919 2.16427 44.2454 1.63433 43.7049 1.52119L43.2951 3.47877ZM4.63031 24.4936C4.90293 24.9739 5.51329 25.1423 5.99361 24.8697L13.8208 20.4272C14.3011 20.1546 14.4695 19.5443 14.1969 19.0639C13.9242 18.5836 13.3139 18.4152 12.8336 18.6879L5.87608 22.6367L1.92723 15.6792C1.65462 15.1989 1.04426 15.0305 0.563943 15.3031C0.0836291 15.5757 -0.0847477 16.1861 0.187863 16.6664L4.63031 24.4936ZM43.7049 1.52119C32.7389 -0.77401 23.9595 0.99522 17.3905 5.28788C10.8356 9.57127 6.58742 16.2977 4.53601 23.7341L6.46399 24.2659C8.41258 17.2023 12.4144 10.9287 18.4845 6.96211C24.5405 3.00476 32.7611 1.27399 43.2951 3.47877L43.7049 1.52119Z"
                                    fill="currentColor"
                                    className="text-muted-foreground"
                                />
                            </svg>
                            <Badge className="mt-3 uppercase">Save up to 20%</Badge>
                        </span>
                    </span>
                </Label>
            </div>

            {/* Pricing Cards Grid */}
            <div className={`grid sm:grid-cols-2 ${shouldShowTrial() ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4 lg:gap-4 xl:gap-6 lg:items-stretch max-w-full mx-auto`}>

                {/* Trial Section - Only show if user doesn't have Advanced/Lifetime */}
                {shouldShowTrial() && <TrialSection isTrialing={isTrialing} isLoading={isLoading} />}

                {/* Basic Plan */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="mb-7">{PLANS.BASIC.name}</CardTitle>
                        <div className="font-bold text-4xl flex flex-col items-center">
                            {isAnnual ? (
                                <>
                                    <span className="text-2xl line-through text-muted-foreground">
                                        ${PLANS.BASIC.monthlyPrice}
                                    </span>
                                    <span className="flex items-baseline">
                                        ${Math.round(PLANS.BASIC.yearlyPrice / 12)}
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            /month
                                        </span>
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground mt-1">
                                        ${PLANS.BASIC.yearlyPrice} billed annually
                                    </span>
                                </>
                            ) : (
                                <span className="flex items-baseline">
                                    ${PLANS.BASIC.monthlyPrice}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                        /month
                                    </span>
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardDescription className="text-center w-11/12 mx-auto">
                        Perfect for personal use
                    </CardDescription>
                    <CardContent className="flex-grow">
                        <ul className="mt-7 space-y-2.5 text-sm">
                            {PLANS.BASIC.features.map((feature, i) => (
                                <PricingFeatureItem key={i}>{feature}</PricingFeatureItem>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        {(() => {
                            const buttonState = getBasicButtonState();
                            return (
                                <Button
                                    className="w-full"
                                    variant={buttonState.variant}
                                    onClick={() => handleCheckout("BASIC")}
                                    disabled={isLoading || buttonState.disabled}
                                >
                                    {isLoading ? "Creating..." : buttonState.text}
                                </Button>
                            );
                        })()}
                    </CardFooter>
                </Card>

                {/* Pro Plan */}
                <Card className="flex flex-col h-full">
                    <CardHeader className="text-center pb-2">
                        <CardTitle className="mb-7">{PLANS.PRO.name}</CardTitle>
                        <div className="font-bold text-4xl flex flex-col items-center">
                            {isAnnual ? (
                                <>
                                    <span className="text-2xl line-through text-muted-foreground">
                                        ${PLANS.PRO.monthlyPrice}
                                    </span>
                                    <span className="flex items-baseline">
                                        ${Math.round(PLANS.PRO.yearlyPrice / 12)}
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            /month
                                        </span>
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground mt-1">
                                        ${PLANS.PRO.yearlyPrice} billed annually
                                    </span>
                                </>
                            ) : (
                                <span className="flex items-baseline">
                                    ${PLANS.PRO.monthlyPrice}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                        /month
                                    </span>
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardDescription className="text-center w-11/12 mx-auto">
                        Great for professionals
                    </CardDescription>
                    <CardContent className="flex-grow">
                        <ul className="mt-7 space-y-2.5 text-sm">
                            {PLANS.PRO.features.map((feature, i) => (
                                <PricingFeatureItem key={i}>{feature}</PricingFeatureItem>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        {(() => {
                            const buttonState = getProButtonState();
                            return (
                                <Button
                                    className="w-full"
                                    variant={buttonState.variant}
                                    onClick={() => handleCheckout("PRO")}
                                    disabled={isLoading || buttonState.disabled}
                                >
                                    {isLoading ? "Creating..." : buttonState.text}
                                </Button>
                            );
                        })()}
                    </CardFooter>
                </Card>

                {/* Advanced Plan */}
                <Card className="flex flex-col h-full relative">
                    <CardHeader className="text-center pb-2">
                        <Badge className="uppercase w-max self-center mb-3 bg-blue-500">
                            Most Popular
                        </Badge>
                        <CardTitle className="!mb-7">{PLANS.ADVANCED.name}</CardTitle>
                        <div className="font-bold text-4xl flex flex-col items-center">
                            {isAnnual ? (
                                <>
                                    <span className="text-2xl line-through text-muted-foreground">
                                        ${PLANS.ADVANCED.monthlyPrice}
                                    </span>
                                    <span className="flex items-baseline">
                                        ${Math.round(PLANS.ADVANCED.yearlyPrice / 12)}
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            /month
                                        </span>
                                    </span>
                                    <span className="text-sm font-normal text-muted-foreground mt-1">
                                        ${PLANS.ADVANCED.yearlyPrice} billed annually
                                    </span>
                                </>
                            ) : (
                                <span className="flex items-baseline">
                                    ${PLANS.ADVANCED.monthlyPrice}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                        /month
                                    </span>
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardDescription className="text-center w-11/12 mx-auto">
                        For teams and power users
                    </CardDescription>
                    <CardContent className="flex-grow">
                        <ul className="mt-7 space-y-2.5 text-sm">
                            {PLANS.ADVANCED.features.map((feature, i) => (
                                <PricingFeatureItem key={i}>{feature}</PricingFeatureItem>
                            ))}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        {(() => {
                            const buttonState = getAdvancedButtonState();
                            return (
                                <Button
                                    className="w-full"
                                    variant={buttonState.variant}
                                    onClick={() => handleCheckout("ADVANCED")}
                                    disabled={isLoading || buttonState.disabled}
                                >
                                    {isLoading ? "Creating..." : buttonState.text}
                                </Button>
                            );
                        })()}
                    </CardFooter>
                </Card>

                {/* Lifetime Plan */}
                <Card className="border-yellow-500 flex flex-col h-full">
                    <CardHeader className="text-center pb-2">
                        {earlyBirdStatus?.isEarlyBird ? (
                            <Badge className="uppercase w-max self-center mb-3 bg-yellow-500">
                                <Clock className="w-3 h-3 mr-1" />
                                Early Bird
                            </Badge>
                        ) : (
                            <Badge className="uppercase w-max self-center mb-3 bg-yellow-500">
                                <StarIcon className="w-3 h-3 mr-1" />
                                Lifetime Deal
                            </Badge>
                        )}
                        <CardTitle className="!mb-7">Lifetime</CardTitle>
                        <div className="font-bold text-4xl flex flex-col items-center">
                            {isEarlyBirdLoading ? (
                                <span className="flex items-baseline">
                                    <span className="animate-pulse bg-gray-300 h-10 w-20 rounded"></span>
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                        one-time
                                    </span>
                                </span>
                            ) : earlyBirdStatus?.isEarlyBird ? (
                                <>
                                    <span className="text-2xl line-through text-muted-foreground">
                                        ${earlyBirdStatus.regularPrice}
                                    </span>
                                    <span className="flex items-baseline">
                                        ${earlyBirdStatus.currentPrice}
                                        <span className="text-sm font-normal text-muted-foreground ml-1">
                                            one-time
                                        </span>
                                    </span>
                                    <span className="text-sm font-normal text-green-600 mt-1">
                                        Save ${earlyBirdStatus.regularPrice - earlyBirdStatus.currentPrice}!
                                    </span>
                                </>
                            ) : (
                                <span className="flex items-baseline">
                                    ${earlyBirdStatus?.currentPrice || 400}
                                    <span className="text-sm font-normal text-muted-foreground ml-1">
                                        one-time
                                    </span>
                                </span>
                            )}
                        </div>
                    </CardHeader>
                    <CardDescription className="text-center w-11/12 mx-auto">
                        {earlyBirdStatus?.isEarlyBird
                            ? "Limited time early bird pricing"
                            : "All features, forever"
                        }
                    </CardDescription>
                    <CardContent className="flex-grow">
                        <ul className="mt-7 space-y-2.5 text-sm">
                            <PricingFeatureItem>Everything in Advanced</PricingFeatureItem>
                            <PricingFeatureItem>Lifetime Updates</PricingFeatureItem>
                            <PricingFeatureItem>Priority Support</PricingFeatureItem>
                            <PricingFeatureItem>No Recurring Fees</PricingFeatureItem>
                            {earlyBirdStatus?.isEarlyBird && (
                                <PricingFeatureItem>
                                    <span className="text-green-600 font-medium">
                                        50% Early Bird Discount
                                    </span>
                                </PricingFeatureItem>
                            )}
                        </ul>
                    </CardContent>
                    <CardFooter>
                        {(() => {
                            const buttonState = getLifetimeButtonState();
                            return (
                                <Button
                                    className="w-full"
                                    variant={buttonState.variant}
                                    onClick={() => handleCheckout("", true)}
                                    disabled={isLoading || isEarlyBirdLoading || buttonState.disabled}
                                >
                                    {isLoading ? "Creating..." : buttonState.text}
                                </Button>
                            );
                        })()}
                    </CardFooter>
                </Card>
            </div>

            <div className="mt-20 lg:mt-32"></div>
        </div>
    );
}

interface PricingFeatureItemProps {
    children: React.ReactNode;
}

function PricingFeatureItem({ children }: PricingFeatureItemProps) {
    return (
        <li className="flex space-x-2">
            <CheckIcon className="flex-shrink-0 mt-0.5 h-4 w-4" />
            <span className="text-muted-foreground">{children}</span>
        </li>
    );
} 