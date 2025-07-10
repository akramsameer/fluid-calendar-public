"use client";

import { useState } from "react";

import { CheckIcon, ClockIcon, XIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface TrialActivationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
    isLoading?: boolean;
}

export function TrialActivationDialog({
    isOpen,
    onClose,
    onConfirm,
    isLoading = false,
}: TrialActivationDialogProps) {
    const [isActivating, setIsActivating] = useState(false);

    const handleConfirm = async () => {
        try {
            setIsActivating(true);
            await onConfirm();
        } finally {
            setIsActivating(false);
        }
    };



    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <Badge className="bg-blue-500 hover:bg-blue-600">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            14-Day Free Trial
                        </Badge>
                    </div>
                    <DialogTitle className="text-xl">
                        Start Your Advanced Plan Trial?
                    </DialogTitle>
                    <DialogDescription className="text-base">
                        You&apos;ll get instant access to all Advanced plan features for 14 days.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Simple confirmation message */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 text-center">
                        <p className="text-blue-900 font-medium">
                            Ready to start your free trial?
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                            No credit card required • Cancel anytime
                        </p>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isActivating || isLoading}
                        className="w-full sm:w-auto"
                    >
                        <XIcon className="w-4 h-4 mr-2" />
                        Maybe Later
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isActivating || isLoading}
                        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
                    >
                        {isActivating || isLoading ? (
                            <>
                                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                Activating...
                            </>
                        ) : (
                            <>
                                <CheckIcon className="w-4 h-4 mr-2" />
                                Start Free Trial
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
} 