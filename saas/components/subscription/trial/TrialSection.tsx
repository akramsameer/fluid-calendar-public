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
import { ClockIcon } from "lucide-react";

import { TrialActivationButton } from "../TrialActivationButton";

interface TrialSectionProps {
    className?: string;
    isTrialing?: boolean;
    isLoading?: boolean;
}

export function TrialSection({ className, isTrialing = false, isLoading = false }: TrialSectionProps) {
    return (
        <Card className={`flex flex-col h-full ${className || ""}`}>
            <CardHeader className="text-center pb-2">
                <Badge className="uppercase w-max self-center mb-3 bg-blue-500">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    14-Day Free Trial
                </Badge>
                <CardTitle className="!mb-7">Try Advanced Free</CardTitle>
                <div className="font-bold text-4xl flex flex-col items-center">
                    <span className="flex items-baseline text-blue-600">
                        $0
                    </span>
                </div>
            </CardHeader>
            <CardDescription className="text-center w-11/12 mx-auto">
                Experience all Advanced features <span className="font-semibold text-blue-600">without adding credit card</span>
            </CardDescription>
            <CardContent className="flex-grow">
                <ul className="mt-7 space-y-2.5 text-sm">
                    <TrialFeatureItem>Unlimited Calendar Providers</TrialFeatureItem>
                    <TrialFeatureItem>Team Collaboration</TrialFeatureItem>
                    <TrialFeatureItem>Advanced Analytics</TrialFeatureItem>
                    <TrialFeatureItem>Custom Integrations</TrialFeatureItem>
                    <TrialFeatureItem>24/7 Support</TrialFeatureItem>
                </ul>
            </CardContent>
            <CardFooter>
                {isTrialing ? (
                    <Button
                        className="w-full"
                        variant="outline"
                        disabled={true}
                        size="lg"
                    >
                        Current Plan
                    </Button>
                ) : (
                    <TrialActivationButton className="w-full" size="lg" disabled={isLoading}>
                        {isLoading ? "Creating..." : "Start 14-Day Free Trial"}
                    </TrialActivationButton>
                )}
            </CardFooter>
        </Card>
    );
}

interface TrialFeatureItemProps {
    children: React.ReactNode;
}

function TrialFeatureItem({ children }: TrialFeatureItemProps) {
    return (
        <li className="flex space-x-2">
            <ClockIcon className="flex-shrink-0 mt-0.5 h-4 w-4 text-blue-500" />
            <span className="text-muted-foreground">{children}</span>
        </li>
    );
} 