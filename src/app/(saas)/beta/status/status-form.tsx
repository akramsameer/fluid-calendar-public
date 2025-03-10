"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import WaitlistStatus from "./waitlist-status";

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

interface WaitlistStatusData {
  found: boolean;
  position: number;
  totalWaitlist: number;
  referralCount: number;
  referralCode: string;
  status: string;
  estimatedTime?: string;
}

export default function StatusForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusData, setStatusData] = useState<WaitlistStatusData | null>(null);
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: email || "",
    },
  });

  // If email is provided in URL, automatically check status
  useEffect(() => {
    if (email) {
      handleSubmit(onSubmit)();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/waitlist/status?email=${encodeURIComponent(data.email)}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to check waitlist status");
      }

      if (result.found) {
        setStatusData(result);
      } else {
        toast.error("Email not found in waitlist");
      }
    } catch (error) {
      console.error("Error checking waitlist status:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to check waitlist status"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (statusData) {
    return (
      <WaitlistStatus data={statusData} onBack={() => setStatusData(null)} />
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            {...register("email")}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            "Check Status"
          )}
        </Button>
      </form>
    </div>
  );
}
