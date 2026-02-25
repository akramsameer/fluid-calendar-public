"use client";

import { useId, useState } from "react";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useMutation } from "@tanstack/react-query";
import { Check, Eye, EyeOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { setupPassword } from "@/lib/saas/services/client/setupPasswordClientService";

interface PasswordSetupFormProps {
  onSubmit?: (password: string) => void;
}

function PasswordSetupForm({ onSubmit }: PasswordSetupFormProps) {
  const passwordId = useId();
  const confirmPasswordId = useId();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);
  const [formErrors, setFormErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const togglePasswordVisibility = () => setIsPasswordVisible((prev) => !prev);
  const toggleConfirmPasswordVisibility = () =>
    setIsConfirmPasswordVisible((prev) => !prev);

  const checkStrength = (pass: string) => {
    const requirements = [
      { regex: /.{8,}/, text: "At least 8 characters" },
      { regex: /[0-9]/, text: "At least 1 number" },
      { regex: /[a-z]/, text: "At least 1 lowercase letter" },
      { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
    ];

    return requirements.map((req) => ({
      met: req.regex.test(pass),
      text: req.text,
    }));
  };

  const strength = checkStrength(password);
  const strengthScore = strength.filter((req) => req.met).length;

  const getStrengthColor = (score: number) => {
    if (score === 0) return "bg-border";
    if (score <= 1) return "bg-red-500";
    if (score <= 2) return "bg-orange-500";
    if (score === 3) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getStrengthText = (score: number) => {
    if (score === 0) return "Enter a password";
    if (score <= 2) return "Weak password";
    if (score === 3) return "Medium password";
    return "Strong password";
  };

  const validateForm = () => {
    const errors: {
      password?: string;
      confirmPassword?: string;
    } = {};

    if (!password) {
      errors.password = "Password is required";
    } else if (strengthScore < 3) {
      errors.password = "Password is too weak";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      onSubmit?.(password);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor={passwordId}>Password</Label>
          <div className="relative">
            <Input
              id={passwordId}
              className="pe-9"
              placeholder="Create a password"
              type={isPasswordVisible ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!formErrors.password}
              aria-describedby={`${passwordId}-description`}
            />
            <button
              className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={togglePasswordVisibility}
              aria-label={isPasswordVisible ? "Hide password" : "Show password"}
              aria-pressed={isPasswordVisible}
            >
              {isPasswordVisible ? (
                <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Eye size={16} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
          {formErrors.password && (
            <p className="text-sm text-destructive mt-1">
              {formErrors.password}
            </p>
          )}
        </div>

        <div>
          <div
            className="h-1 w-full overflow-hidden rounded-full bg-border"
            role="progressbar"
            aria-valuenow={strengthScore}
            aria-valuemin={0}
            aria-valuemax={4}
            aria-label="Password strength"
          >
            <div
              className={`h-full ${getStrengthColor(strengthScore)} transition-all duration-500 ease-out`}
              style={{ width: `${(strengthScore / 4) * 100}%` }}
            ></div>
          </div>

          <p
            id={`${passwordId}-description`}
            className="mt-2 text-sm font-medium text-foreground"
          >
            {getStrengthText(strengthScore)}
          </p>

          <ul className="space-y-1.5 mt-2" aria-label="Password requirements">
            {strength.map((req, index) => (
              <li key={index} className="flex items-center gap-2">
                {req.met ? (
                  <Check
                    size={16}
                    className="text-emerald-500"
                    aria-hidden="true"
                  />
                ) : (
                  <X
                    size={16}
                    className="text-muted-foreground/80"
                    aria-hidden="true"
                  />
                )}
                <span
                  className={`text-xs ${req.met ? "text-emerald-600" : "text-muted-foreground"}`}
                >
                  {req.text}
                  <span className="sr-only">
                    {req.met ? " - Requirement met" : " - Requirement not met"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor={confirmPasswordId}>Confirm Password</Label>
          <div className="relative">
            <Input
              id={confirmPasswordId}
              className="pe-9"
              placeholder="Confirm your password"
              type={isConfirmPasswordVisible ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={!!formErrors.confirmPassword}
            />
            <button
              className="absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-lg text-muted-foreground/80 outline-offset-2 transition-colors hover:text-foreground focus:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring/70 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={toggleConfirmPasswordVisibility}
              aria-label={
                isConfirmPasswordVisible ? "Hide password" : "Show password"
              }
              aria-pressed={isConfirmPasswordVisible}
            >
              {isConfirmPasswordVisible ? (
                <EyeOff size={16} strokeWidth={2} aria-hidden="true" />
              ) : (
                <Eye size={16} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
          </div>
          {formErrors.confirmPassword && (
            <p className="text-sm text-destructive mt-1">
              {formErrors.confirmPassword}
            </p>
          )}
        </div>

        <Button type="submit" className="w-full">
          Set Password & Continue
        </Button>
      </div>
    </form>
  );
}

function PasswordSetupPage() {
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : undefined;
  const initialName = searchParams?.get("name") || "";
  const email = searchParams?.get("email") || "";
  const [name, setName] = useState(initialName);
  const [nameError, setNameError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: async ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => {
      return setupPassword({ name, email, password });
    },
    onSuccess: async (_data, variables) => {
      setSuccess(true);
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password: variables.password,
      });
      if (result?.ok) {
        router.push("/calendar");
      }
    },
  });

  const handleSubmit = (password: string) => {
    if (!name || name.trim() === "") {
      setNameError("Name is required");
      return;
    }
    setNameError("");
    mutation.mutate({ name, email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set Your Password</CardTitle>
          <CardDescription>
            Create a secure password for your new lifetime subscription
          </CardDescription>
          {email && (
            <div className="mt-4 text-sm text-muted-foreground">
              <div>
                <span className="font-medium">Email:</span> {email}
              </div>
            </div>
          )}
          <div className="mt-4">
            <Label htmlFor="name-input">Name</Label>
            <Input
              id="name-input"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
            {nameError && (
              <p className="text-sm text-destructive mt-1">{nameError}</p>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="text-green-600 text-center py-4">
              Account setup successful!
            </div>
          ) : (
            <>
              <PasswordSetupForm onSubmit={handleSubmit} />
              {mutation.isPending && (
                <div className="text-center text-sm text-muted-foreground mt-2">
                  Setting up your account...
                </div>
              )}
              {mutation.error && (
                <div className="text-center text-sm text-destructive mt-2">
                  {mutation.error.message}
                </div>
              )}
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">
            By setting your password, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default PasswordSetupPage;
