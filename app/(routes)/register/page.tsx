"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/logo";
import { register } from "@/app/action/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(formData: FormData) {
    setIsLoading(true);

    try {
      const result = await register(formData);

      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Account created successfully");
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Logo />
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight">
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Or{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              sign in to existing account
            </Link>
          </p>
        </div>

        <form action={handleSubmit} className="mt-8 space-y-6">
          <div className="space-y-4 rounded-md shadow-sm">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                placeholder="John Doe"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                className="mt-1"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Must be at least 6 characters
              </p>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </form>
      </div>
    </div>
  );
}
