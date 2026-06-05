"use client";

import { useActionState } from "react";
import { signIn, type LoginState } from "./actions";
import { Input, Label } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/SubmitButton";

const initial: LoginState = { error: null };

export default function LoginPage() {
  const [state, formAction] = useActionState(signIn, initial);

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold">Life HQ</h1>
          <p className="mt-1 text-sm text-muted">Sign in to your dashboard</p>
        </div>

        <form
          action={formAction}
          className="space-y-4 rounded-card border border-border bg-surface p-6"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
            />
          </div>

          {state.error ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <SubmitButton className="w-full">Sign in</SubmitButton>
        </form>
      </div>
    </div>
  );
}
