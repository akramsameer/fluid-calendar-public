import { Suspense } from "react";
import PricingCards from "./components/PricingCards";
import { Metadata } from "next";
import { AppNav } from "@/components/navigation/AppNav";

export const metadata: Metadata = {
    title: "Pricing - Fluid Calendar",
    description: "Choose the perfect plan for your calendar management needs",
};

interface PricingPageProps {
    searchParams: Promise<{
        redirect?: string;
        error?: string;
        reason?: string;
    }>;
}

export default async function PricingPage({ searchParams }: PricingPageProps) {
    const { redirect, error, reason } = await searchParams;

    return (
        <div className="flex min-h-screen flex-col">
            <AppNav />
            <div className="container mx-auto px-4 py-8 max-w-7xl">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">
                        Choose Your Plan
                    </h1>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Get started with Fluid Calendar today. Upgrade or downgrade at any time.
                    </p>

                    {/* Show upgrade prompt if user hit calendar provider limit */}
                    {error === "upgrade_required" && (
                        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
                            <p className="text-yellow-800 font-medium">
                                Upgrade Required
                            </p>
                            <p className="text-yellow-700 text-sm mt-1">
                                {reason || "You've reached your calendar provider limit. Upgrade to add more providers."}
                            </p>
                        </div>
                    )}
                </div>

                <Suspense fallback={<div>Loading pricing...</div>}>
                    <PricingCards redirectUrl={redirect} />
                </Suspense>
            </div>
        </div>
    );
} 