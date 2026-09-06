"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { completeMockPaymentAction } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn, formatPKR } from "@/lib/utils";

const METHODS = [
  { id: "jazzcash", label: "JazzCash", hint: "Mobile account" },
  { id: "easypaisa", label: "Easypaisa", hint: "Mobile account" },
  { id: "card", label: "Debit / Credit card", hint: "Visa, Mastercard" },
] as const;

export function MockCheckout({
  providerRef,
  amount,
  appointmentId,
}: {
  providerRef: string;
  amount: number;
  appointmentId: string;
}) {
  const router = useRouter();
  const [method, setMethod] = React.useState<string>("jazzcash");
  const [pending, setPending] = React.useState<"pay" | "fail" | null>(null);

  async function settle(success: boolean) {
    setPending(success ? "pay" : "fail");
    const res = await completeMockPaymentAction(providerRef, success);
    setPending(null);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    if (success) {
      toast.success(res.message ?? "Payment successful.");
      router.push(`/appointments/${appointmentId}`);
    } else {
      toast.error("Payment declined. You can retry or switch to pay-at-clinic.");
      router.push(`/appointments/${appointmentId}`);
    }
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <RadioGroup value={method} onValueChange={setMethod}>
        {METHODS.map((m) => (
          <label
            key={m.id}
            htmlFor={m.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
              method === m.id && "border-primary bg-primary/5"
            )}
          >
            <RadioGroupItem value={m.id} id={m.id} />
            <span>
              <span className="font-medium">{m.label}</span>
              <span className="block text-xs text-muted-foreground">{m.hint}</span>
            </span>
          </label>
        ))}
      </RadioGroup>

      <Separator />

      {method === "card" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="card-number">Card number</Label>
            <Input id="card-number" placeholder="4242 4242 4242 4242" inputMode="numeric" />
          </div>
          <div>
            <Label htmlFor="exp">Expiry</Label>
            <Input id="exp" placeholder="12/29" />
          </div>
          <div>
            <Label htmlFor="cvc">CVC</Label>
            <Input id="cvc" placeholder="123" inputMode="numeric" maxLength={4} />
          </div>
        </div>
      ) : (
        <div>
          <Label htmlFor="wallet">Mobile account number</Label>
          <Input id="wallet" placeholder="03001234567" inputMode="tel" />
        </div>
      )}

      <Button className="w-full" size="lg" disabled={pending !== null} onClick={() => settle(true)}>
        {pending === "pay" ? <Loader2 className="animate-spin" /> : <Lock />}
        Pay {formatPKR(amount)}
      </Button>

      <Button
        variant="outline"
        className="w-full"
        disabled={pending !== null}
        onClick={() => settle(false)}
      >
        {pending === "fail" ? <Loader2 className="animate-spin" /> : null}
        Simulate a failed payment
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        Sandbox checkout — no real money moves. Swap <code>PAYMENT_PROVIDER</code> to go live.
      </p>
    </div>
  );
}
