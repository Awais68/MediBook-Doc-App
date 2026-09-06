"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, MailCheck } from "lucide-react";
import { forgotPasswordAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ForgotPasswordForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setPending(true);
    const res = await forgotPasswordAction({ email });
    setPending(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setSentTo(res.data.email);
  }

  if (sentTo) {
    return (
      <div className="rounded-xl border bg-background p-6 text-center shadow-sm">
        <MailCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 text-xl font-bold">Check your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          If an account exists for <span className="font-medium text-foreground">{sentTo}</span>, we&apos;ve sent a
          6-digit reset code. It expires in 10 minutes.
        </p>
        <Button className="mt-5 w-full" onClick={() => router.push(`/reset-password?email=${encodeURIComponent(sentTo)}`)}>
          Enter the code
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm">
      <h1 className="text-xl font-bold">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted-foreground">We&apos;ll email you a code to set a new one.</p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Send reset code
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
