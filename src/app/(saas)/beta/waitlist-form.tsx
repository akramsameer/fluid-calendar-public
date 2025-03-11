"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ValidationError {
  code: string;
  message: string;
  path: string[];
}

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  name: z.string().optional(),
  acceptTerms: z.boolean().refine((val) => val === true, {
    message: "You must accept the terms and privacy policy",
  }),
});

type FormValues = z.infer<typeof formSchema>;

export default function WaitlistForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [verificationRequired, setVerificationRequired] = useState(false);
  const searchParams = useSearchParams();
  const referralCode = searchParams.get("ref");

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      name: "",
      acceptTerms: false,
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      console.log("Submitting form data:", {
        email: data.email,
        name: data.name || undefined,
        referralCode: referralCode || null,
        acceptTerms: data.acceptTerms,
      });

      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          name: data.name || undefined,
          referralCode: referralCode || null,
          acceptTerms: data.acceptTerms,
        }),
      });

      const result = await response.json();
      console.log("API response:", result);

      if (!response.ok) {
        // Check if there are validation errors
        if (result.errors && Array.isArray(result.errors)) {
          const errorMessages = result.errors
            .map((err: ValidationError) => err.message)
            .join(", ");
          throw new Error(
            errorMessages || result.message || "Failed to join waitlist"
          );
        }
        throw new Error(result.message || "Failed to join waitlist");
      }

      setSubmittedEmail(data.email);
      setIsSuccess(true);

      // Check if verification is required
      if (result.requiresVerification) {
        setVerificationRequired(true);
        toast.success(
          "Please check your email to verify your address and complete your signup."
        );
      } else {
        toast.success("You've been added to the waitlist!");
      }
    } catch (error) {
      console.error("Error joining waitlist:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to join waitlist"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded border border-green-100 dark:border-green-800 text-center">
        {verificationRequired ? (
          <>
            <h3 className="text-lg font-medium text-green-800 dark:text-green-300">
              Check your email
            </h3>
            <p className="mt-2 text-sm text-green-700 dark:text-green-400">
              We&apos;ve sent a verification link to{" "}
              <strong>{submittedEmail}</strong>. Please check your inbox and
              click the link to complete your waitlist signup.
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-medium text-green-800 dark:text-green-300">
              You&apos;re on the waitlist!
            </h3>
            <p className="mt-2 text-sm text-green-700 dark:text-green-400">
              We&apos;ve sent a confirmation email to{" "}
              <strong>{submittedEmail}</strong> with your waitlist details.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
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

      <div>
        <Label htmlFor="name">Name (optional)</Label>
        <Input
          id="name"
          type="text"
          placeholder="Your name"
          {...register("name")}
        />
      </div>

      {referralCode && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded border border-blue-100 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            You were referred by a friend! This will give you a boost in the
            waitlist.
          </p>
        </div>
      )}

      <div className="flex items-start space-x-2">
        <Checkbox
          id="acceptTerms"
          checked={!!watch("acceptTerms")}
          onCheckedChange={(checked) => {
            setValue("acceptTerms", checked === true);
          }}
        />
        <div className="grid gap-1.5 leading-none">
          <Label
            htmlFor="acceptTerms"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            I accept the{" "}
            <a
              href="/terms"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              terms of service
            </a>{" "}
            and{" "}
            <a
              href="/privacy"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              privacy policy
            </a>
          </Label>
          {errors.acceptTerms && (
            <p className="text-sm text-red-500">{errors.acceptTerms.message}</p>
          )}
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Joining...
          </>
        ) : (
          "Join the Waitlist"
        )}
      </Button>
    </form>
  );
}
