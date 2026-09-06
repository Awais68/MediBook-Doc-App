"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { requestLoginOtpAction } from "@/server/actions/auth";
import { GoogleButton } from "@/components/auth/google-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ERRORS: Record<string, string> = {
  CredentialsSignin: "Email or password is incorrect.",
  OAuthAccountNotLinked: "That email is already registered with a password. Sign in with your password instead.",
  AccessDenied: "Your account is not allowed to sign in.",
};

export function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") ?? "/dashboard";
  const urlError = search.get("error");

  const [pending, setPending] = React.useState(false);

  // OTP flow
  const [phone, setPhone] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [code, setCode] = React.useState("");

  async function passwordLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);

    const res = await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirect: false,
    });

    setPending(false);
    if (res?.error) {
      toast.error(ERRORS[res.error] ?? "Sign in failed. Check your details and try again.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  async function sendOtp(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    const res = await requestLoginOtpAction({ phone });
    setPending(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    setOtpSent(true);
    toast.success(res.data.devCode ? `Dev code: ${res.data.devCode}` : "Code sent to your phone.");
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);

    const res = await signIn("phone-otp", { phone, code, redirect: false });

    setPending(false);
    if (res?.error) {
      toast.error("That code is wrong or has expired.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <div className="rounded-xl border bg-background p-6 shadow-sm">
      <h1 className="text-xl font-bold">Sign in to MediBook</h1>
      <p className="mt-1 text-sm text-muted-foreground">Book appointments, track visits and keep your records in one place.</p>

      {urlError ? (
        <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {ERRORS[urlError] ?? "Sign in failed. Please try again."}
        </p>
      ) : null}

      <Tabs defaultValue="phone" className="mt-5">
        <TabsList className="w-full">
          <TabsTrigger value="phone" className="flex-1">
            Phone OTP
          </TabsTrigger>
          <TabsTrigger value="password" className="flex-1">
            Password
          </TabsTrigger>
        </TabsList>

        <TabsContent value="phone" className="pt-5">
          {!otpSent ? (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <Label htmlFor="phone" required>
                  Mobile number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="03001234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  No account yet? A verified code signs you up automatically.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Send code
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <Label htmlFor="code" required>
                  6-digit code
                </Label>
                <Input
                  id="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-[0.5em]"
                  required
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Sent to {phone}</p>
              </div>
              <Button type="submit" className="w-full" disabled={pending || code.length !== 6}>
                {pending ? <Loader2 className="animate-spin" /> : null}
                Verify &amp; sign in
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => {
                  setOtpSent(false);
                  setCode("");
                }}
              >
                <ArrowLeft />
                Change number
              </Button>
            </form>
          )}
        </TabsContent>

        <TabsContent value="password" className="pt-5">
          <form onSubmit={passwordLogin} className="space-y-4">
            <div>
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label htmlFor="password" required>
                  Password
                </Label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input id="password" name="password" type="password" autoComplete="current-password" required />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      <div className="my-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or</span>
        <Separator className="flex-1" />
      </div>

      <GoogleButton callbackUrl={callbackUrl} />

      <p className="mt-5 text-center text-sm text-muted-foreground">
        New to MediBook?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Are you a doctor?{" "}
        <Link href="/apply" className="hover:underline">
          Apply to join
        </Link>
      </p>
    </div>
  );
}
