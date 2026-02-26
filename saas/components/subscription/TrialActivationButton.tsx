"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { useTrialActivation } from "@/hooks/use-trial-activation";

import { TrialActivationDialog } from "./TrialActivationDialog";

interface TrialActivationButtonProps {
    children?: React.ReactNode;
    className?: string;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
    size?: "default" | "sm" | "lg" | "icon";
    disabled?: boolean;
}

export function TrialActivationButton({
    children = "Start 14-Day Free Trial",
    className,
    variant = "default",
    size = "lg",
    disabled = false,
}: TrialActivationButtonProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { activateTrial, isLoading } = useTrialActivation();

    const handleButtonClick = () => {
        setIsDialogOpen(true);
    };

    const handleDialogClose = () => {
        setIsDialogOpen(false);
    };

    const handleTrialConfirm = async () => {
        const success = await activateTrial();
        if (success) {
            setIsDialogOpen(false);
        }
        // Dialog stays open if activation fails so user can retry
    };

    return (
        <>
            <Button
                onClick={handleButtonClick}
                disabled={disabled || isLoading}
                className={className}
                variant={variant}
                size={size}
            >
                {children}
            </Button>

            <TrialActivationDialog
                isOpen={isDialogOpen}
                onClose={handleDialogClose}
                onConfirm={handleTrialConfirm}
                isLoading={isLoading}
            />
        </>
    );
} 