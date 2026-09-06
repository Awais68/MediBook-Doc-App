"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarClock, Loader2, XCircle } from "lucide-react";
import type { DayAvailability } from "@/lib/services/availability";
import {
  cancelAppointmentAction,
  loadAvailabilityAction,
  rescheduleAppointmentAction,
} from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function CancelAppointmentButton({
  appointmentId,
  refundNote,
}: {
  appointmentId: string;
  refundNote: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function submit() {
    setPending(true);
    const res = await cancelAppointmentAction({ appointmentId, reason: reason.trim() || undefined });
    setPending(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Appointment cancelled.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="text-destructive hover:text-destructive">
          <XCircle />
          Cancel appointment
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancel this appointment?</DialogTitle>
          <DialogDescription>{refundNote}</DialogDescription>
        </DialogHeader>

        <div>
          <Label htmlFor="cancel-reason">Reason (optional)</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Helps the clinic understand why the slot freed up."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Keep it
          </Button>
          <Button variant="destructive" onClick={submit} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Cancel appointment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function RescheduleButton({
  appointmentId,
  doctorHospitalId,
}: {
  appointmentId: string;
  doctorHospitalId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [days, setDays] = React.useState<DayAvailability[] | null>(null);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [slot, setSlot] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (!open || days) return;
    loadAvailabilityAction(doctorHospitalId, 21).then((res) => {
      if (!res.ok) {
        toast.error(res.error);
        setDays([]);
        return;
      }
      setDays(res.data);
      setSelectedDate(res.data.find((d) => d.availableCount > 0)?.date ?? null);
    });
  }, [open, days, doctorHospitalId]);

  const openDays = (days ?? []).filter((d) => d.availableCount > 0);
  const currentDay = openDays.find((d) => d.date === selectedDate);

  async function submit() {
    if (!slot) return;
    setPending(true);
    const res = await rescheduleAppointmentAction({ appointmentId, startAt: slot });
    setPending(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Rescheduled.");
    setOpen(false);
    router.push(`/appointments/${res.data.appointmentId}`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <CalendarClock />
          Reschedule
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pick a new time</DialogTitle>
          <DialogDescription>
            Your current slot is released only once the new one is confirmed.
          </DialogDescription>
        </DialogHeader>

        {!days ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : openDays.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No open slots in the next three weeks at this location.
          </p>
        ) : (
          <>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {openDays.map((d) => {
                const date = new Date(`${d.date}T12:00:00`);
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => {
                      setSelectedDate(d.date);
                      setSlot(null);
                    }}
                    className={cn(
                      "flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-xs",
                      selectedDate === d.date ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    <span className="opacity-80">{date.toLocaleDateString("en-PK", { weekday: "short" })}</span>
                    <span className="text-sm font-semibold">{date.getDate()}</span>
                  </button>
                );
              })}
            </div>

            <div className="max-h-64 space-y-3 overflow-y-auto">
              {currentDay?.sessions.map((s) => {
                const openSlots = s.slots.filter((x) => x.available);
                if (!openSlots.length) return null;
                return (
                  <div key={s.label}>
                    <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">{s.label}</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {openSlots.map((x) => (
                        <button
                          key={x.startAt}
                          type="button"
                          onClick={() => setSlot(x.startAt)}
                          className={cn(
                            "rounded-lg border py-2 text-xs font-medium",
                            slot === x.startAt ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                          )}
                        >
                          {x.time}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
            Back
          </Button>
          <Button onClick={submit} disabled={!slot || pending}>
            {pending ? <Loader2 className="animate-spin" /> : null}
            Confirm new time
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
