"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatPKR } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { refundPaymentAction } from "@/server/actions/admin";

export function RefundButton({ paymentId, amount }: { paymentId: string; amount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(amount));
  const [pending, start] = useTransition();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Refund</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Refund this payment</DialogTitle>
          <DialogDescription>
            Full amount is {formatPKR(amount)}. A partial refund is allowed — enter a smaller number.
            The gateway settles separately; this records the decision.
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="refundAmount">Amount (PKR)</Label>
          <Input
            id="refundAmount"
            inputMode="numeric"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const n = Number(value);
                if (!n || n <= 0 || n > amount) {
                  toast.error("Enter an amount between 1 and the paid total.");
                  return;
                }
                const res = await refundPaymentAction(paymentId, n);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(res.message ?? "Refund recorded.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Record refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
