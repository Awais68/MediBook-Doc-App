"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import { registerAction } from "@/server/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const RULES: { label: string; test: (v: string) => boolean }[] = [
  { label: "At least 8 characters", test: (v) => v.length >= 8 },
  { label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { label: "One number", test: (v) => /\d/.test(v) },
];

export function RegisterForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") ?? "/dashboard";

  const [pending, setPending] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const payload = {
      name: String(form.get("name") ?? ""),
      email,
      phone: String(form.get("phone") ?? "") || undefined,
      password,
      confirmPassword: String(form.get("confirmPassword") ?? ""),
    };

    setPending(true);
    setErrors({});
    const res = await registerAction(payload);

    if (!res.ok) {
      setPending(false);
      setErrors(res.fieldErrors ?? {});
      toast.error(res.error);
      return;
    }

    // Sign the new account straight in so they land on the dashboard.
    const signInRes = await signIn("credentials", { email, password, redirect: false });
    setPending(false);

    if (signInRes?.error) {
      toast.success("Account created — please sign in.");
      router.push("/login");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm">
      <h1 className="text-xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-muted-foreground">Takes under a minute. You can add family members later.</p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <Label htmlFor="name" required>
            Full name
          </Label>
          <Input id="name" name="name" autoComplete="name" placeholder="Ahmed Raza" required />
          {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
        </div>

        <div>
          <Label htmlFor="email" required>
            Email
          </Label>
          <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email}</p> : null}
        </div>

        <div>
          <Label htmlFor="phone">Mobile number</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="03001234567" />
          <p className="mt-1 text-xs text-muted-foreground">Used for appointment reminders. Optional.</p>
          {errors.phone ? <p className="mt-1 text-xs text-destructive">{errors.phone}</p> : null}
        </div>

        <div>
          <Label htmlFor="password" required>
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <ul className="mt-2 grid grid-cols-2 gap-1">
            {RULES.map((r) => {
              const ok = r.test(password);
              return (
                <li
                  key={r.label}
                  className={cn("flex items-center gap-1 text-xs", ok ? "text-emerald-600" : "text-muted-foreground")}
                >
                  {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {r.label}
                </li>
              );
            })}
          </ul>
          {errors.password ? <p className="mt-1 text-xs text-destructive">{errors.password}</p> : null}
        </div>

        <div>
          <Label htmlFor="confirmPassword" required>
            Confirm password
          </Label>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
          {errors.confirmPassword ? <p className="mt-1 text-xs text-destructive">{errors.confirmPassword}</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Create account
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <GoogleButton callbackUrl={callbackUrl} />

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
