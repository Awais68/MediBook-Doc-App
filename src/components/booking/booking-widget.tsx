"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Banknote, Building2, CalendarX2, ChevronLeft, ChevronRight, CreditCard, Info, Loader2, MapPin, Video } from "lucide-react";
import type { ConsultationType, PaymentMethod } from "@prisma/client";
import type { DayAvailability } from "@/lib/services/availability";
import { bookAppointmentAction, loadAvailabilityAction, loadFamilyMembersAction } from "@/server/actions/appointments";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn, formatPKR } from "@/lib/utils";

export type BookingPractice = {
  id: string;
  consultationFee: number;
  followUpFee: number;
  followUpValidDays: number;
  cancellationHours: number;
  acceptsCashAtClinic: boolean;
  acceptsOnlinePayment: boolean;
  roomNumber: string | null;
  hospital: { name: string; city: string; area: string | null; address: string };
};

export type BookingDoctor = {
  slug: string;
  name: string;
  videoConsultEnabled: boolean;
  videoConsultFee: number | null;
};

const DAYS_PER_PAGE = 7;

export function BookingWidget({
  doctor,
  practices,
  isSignedIn,
  followUpFor,
}: {
  doctor: BookingDoctor;
  practices: BookingPractice[];
  isSignedIn: boolean;
  followUpFor?: { appointmentId: string; doctorHospitalId: string } | null;
}) {
  const router = useRouter();

  const [practiceId, setPracticeId] = React.useState(followUpFor?.doctorHospitalId ?? practices[0]?.id ?? "");
  const [days, setDays] = React.useState<DayAvailability[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [weekOffset, setWeekOffset] = React.useState(0);
  const [selectedDate, setSelectedDate] = React.useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = React.useState<{ startAt: string; time: string } | null>(null);

  const [consultationType, setConsultationType] = React.useState<ConsultationType>("IN_PERSON");
  const [paymentMethod, setPaymentMethod] = React.useState<PaymentMethod>("CASH_AT_CLINIC");
  const [reason, setReason] = React.useState("");
  const [familyMemberId, setFamilyMemberId] = React.useState("self");
  const [family, setFamily] = React.useState<{ id: string; name: string; relation: string }[]>([]);
  const [confirming, setConfirming] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const practice = practices.find((p) => p.id === practiceId) ?? practices[0];

  // Changing location invalidates the calendar and the payment default. React's
  // documented way to do that is to adjust state during render, not in an effect.
  const [syncedPracticeId, setSyncedPracticeId] = React.useState(practiceId);
  if (practiceId !== syncedPracticeId) {
    setSyncedPracticeId(practiceId);
    setLoading(true);
    setSelectedSlot(null);
    if (practice) {
      setPaymentMethod(practice.acceptsCashAtClinic ? "CASH_AT_CLINIC" : "JAZZCASH");
    }
  }

  // Availability is derived server-side, so it is always re-fetched per location.
  React.useEffect(() => {
    if (!practiceId) return;
    let cancelled = false;

    loadAvailabilityAction(practiceId, 28).then((res) => {
      if (cancelled) return;
      if (res.ok) {
        setDays(res.data);
        const firstOpen = res.data.find((d) => d.availableCount > 0);
        setSelectedDate(firstOpen?.date ?? res.data[0]?.date ?? null);
      } else {
        toast.error(res.error);
        setDays([]);
      }
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [practiceId]);

  React.useEffect(() => {
    if (!isSignedIn) return;
    loadFamilyMembersAction().then((res) => {
      if (res.ok) setFamily(res.data);
    });
  }, [isSignedIn]);

  const visibleDays = React.useMemo(
    () => (days ?? []).slice(weekOffset * DAYS_PER_PAGE, weekOffset * DAYS_PER_PAGE + DAYS_PER_PAGE),
    [days, weekOffset]
  );
  const currentDay = (days ?? []).find((d) => d.date === selectedDate);
  const maxOffset = Math.max(0, Math.ceil((days?.length ?? 0) / DAYS_PER_PAGE) - 1);

  const isFollowUp = Boolean(followUpFor);
  const fee = isFollowUp
    ? practice?.followUpFee ?? 0
    : consultationType === "VIDEO"
      ? doctor.videoConsultFee ?? practice?.consultationFee ?? 0
      : practice?.consultationFee ?? 0;

  function openConfirm() {
    if (!isSignedIn) {
      const target = `/doctors/${doctor.slug}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(target)}`);
      return;
    }
    setConfirming(true);
  }

  async function confirm() {
    if (!selectedSlot || !practice) return;
    setSubmitting(true);

    const res = await bookAppointmentAction({
      doctorHospitalId: practice.id,
      startAt: selectedSlot.startAt,
      consultationType,
      paymentMethod,
      reasonForVisit: reason.trim() || undefined,
      familyMemberId: familyMemberId === "self" ? null : familyMemberId,
      parentAppointmentId: followUpFor?.appointmentId ?? null,
    });

    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      // The slot may have just gone — refresh availability so the UI is honest.
      const refreshed = await loadAvailabilityAction(practice.id, 28);
      if (refreshed.ok) setDays(refreshed.data);
      setSelectedSlot(null);
      setConfirming(false);
      return;
    }

    toast.success(res.message ?? "Appointment booked");
    setConfirming(false);
    router.push(res.data.checkoutUrl ?? `/appointments/${res.data.appointmentId}`);
    router.refresh();
  }

  if (!practice) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-muted-foreground">
          This doctor has not published a practice location yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="overflow-hidden">
        <div className="border-b bg-muted/40 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {isFollowUp ? "Follow-up visit" : "Book an appointment"}
          </p>
          <p className="mt-1 text-2xl font-semibold">{formatPKR(fee, { free: "Free follow-up" })}</p>
          {isFollowUp ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Follow-up rate applies within {practice.followUpValidDays} days of your last visit.
            </p>
          ) : practice.followUpFee !== practice.consultationFee ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Follow-up within {practice.followUpValidDays} days: {formatPKR(practice.followUpFee, { free: "free" })}
            </p>
          ) : null}
        </div>

        <CardContent className="space-y-5 p-5">
          {/* Location */}
          {practices.length > 1 ? (
            <div>
              <Label className="mb-2 block">Hospital</Label>
              <Select value={practiceId} onValueChange={setPracticeId} disabled={isFollowUp}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {practices.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.hospital.name} — {formatPKR(p.consultationFee)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <p className="flex items-start gap-2 font-medium">
              <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              {practice.hospital.name}
            </p>
            <p className="mt-1 flex items-start gap-2 text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              {practice.hospital.address}
            </p>
            {practice.roomNumber ? <p className="mt-1 pl-6 text-muted-foreground">Room {practice.roomNumber}</p> : null}
          </div>

          {/* Consultation type */}
          {doctor.videoConsultEnabled && !isFollowUp ? (
            <div className="grid grid-cols-2 gap-2">
              {(["IN_PERSON", "VIDEO"] as ConsultationType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setConsultationType(t)}
                  className={cn(
                    "flex flex-col items-start rounded-lg border p-3 text-left text-sm transition-colors",
                    consultationType === t ? "border-primary bg-primary/5" : "hover:bg-accent"
                  )}
                >
                  <span className="flex items-center gap-1.5 font-medium">
                    {t === "VIDEO" ? <Video className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    {t === "VIDEO" ? "Video" : "In clinic"}
                  </span>
                  <span className="mt-0.5 text-muted-foreground">
                    {formatPKR(t === "VIDEO" ? doctor.videoConsultFee ?? practice.consultationFee : practice.consultationFee)}
                  </span>
                </button>
              ))}
            </div>
          ) : null}

          <Separator />

          {/* Day strip */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <Label>Choose a day</Label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
                  disabled={weekOffset === 0}
                  aria-label="Previous week"
                >
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={() => setWeekOffset((o) => Math.min(maxOffset, o + 1))}
                  disabled={weekOffset >= maxOffset}
                  aria-label="Next week"
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-1.5">
                {visibleDays.map((d) => {
                  const date = new Date(`${d.date}T12:00:00`);
                  const open = d.availableCount > 0;
                  return (
                    <button
                      key={d.date}
                      type="button"
                      disabled={!open}
                      onClick={() => {
                        setSelectedDate(d.date);
                        setSelectedSlot(null);
                      }}
                      className={cn(
                        "flex flex-col items-center rounded-lg border py-2 text-xs transition-colors",
                        selectedDate === d.date && open && "border-primary bg-primary text-primary-foreground",
                        !open && "cursor-not-allowed opacity-40",
                        open && selectedDate !== d.date && "hover:bg-accent"
                      )}
                    >
                      <span className="opacity-80">{date.toLocaleDateString("en-PK", { weekday: "short" })}</span>
                      <span className="text-sm font-semibold">{date.getDate()}</span>
                      <span className="opacity-80">{open ? `${d.availableCount}` : "—"}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Slots */}
          {!loading && currentDay ? (
            currentDay.availableCount === 0 ? (
              <div className="flex flex-col items-center rounded-lg border border-dashed py-8 text-center">
                <CalendarX2 className="mb-2 h-5 w-5 text-muted-foreground" />
                <p className="text-sm font-medium">No slots on this day</p>
                <p className="text-xs text-muted-foreground">Pick another date from the strip above.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {currentDay.sessions.map((session) => {
                  const openSlots = session.slots.filter((s) => s.available);
                  if (!openSlots.length) return null;
                  return (
                    <div key={session.label}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {session.label} · {openSlots.length} open
                      </p>
                      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                        {session.slots.map((s) => (
                          <button
                            key={s.startAt}
                            type="button"
                            disabled={!s.available}
                            onClick={() => setSelectedSlot({ startAt: s.startAt, time: s.time })}
                            className={cn(
                              "rounded-lg border py-2 text-xs font-medium transition-colors",
                              selectedSlot?.startAt === s.startAt
                                ? "border-primary bg-primary text-primary-foreground"
                                : s.available
                                  ? "hover:bg-accent"
                                  : "cursor-not-allowed text-muted-foreground/50 line-through"
                            )}
                          >
                            {s.time}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : null}

          <Button className="w-full" size="lg" disabled={!selectedSlot} onClick={openConfirm}>
            {selectedSlot ? `Continue · ${selectedSlot.time}` : "Select a time slot"}
          </Button>

          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Free cancellation up to {practice.cancellationHours} hours before your appointment.
          </p>
        </CardContent>
      </Card>

      {/* Confirmation */}
      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm your appointment</DialogTitle>
            <DialogDescription>
              {doctor.name} · {practice.hospital.name}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border bg-muted/40 p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">When</span>
              <span className="font-medium">
                {selectedSlot
                  ? new Date(selectedSlot.startAt).toLocaleString("en-PK", {
                      timeZone: "Asia/Karachi",
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })
                  : "—"}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-muted-foreground">Fee</span>
              <span className="font-semibold">{formatPKR(fee, { free: "Free follow-up" })}</span>
            </div>
            {isFollowUp ? (
              <Badge variant="success" className="mt-3">
                Follow-up rate applied
              </Badge>
            ) : null}
          </div>

          {family.length ? (
            <div>
              <Label className="mb-2 block">Patient</Label>
              <Select value={familyMemberId} onValueChange={setFamilyMemberId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Myself</SelectItem>
                  {family.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name} ({m.relation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          <div>
            <Label htmlFor="reason" className="mb-2 block">
              Reason for visit <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Chest tightness while walking, started 3 days ago"
              maxLength={300}
              rows={3}
            />
          </div>

          <div>
            <Label className="mb-2 block">Payment</Label>
            <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              {practice.acceptsCashAtClinic ? (
                <label
                  htmlFor="pay-cash"
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
                    paymentMethod === "CASH_AT_CLINIC" && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value="CASH_AT_CLINIC" id="pay-cash" />
                  <Banknote className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Pay at the clinic</span>
                    <span className="block text-xs text-muted-foreground">Cash at the reception counter</span>
                  </span>
                </label>
              ) : null}

              {practice.acceptsOnlinePayment ? (
                <label
                  htmlFor="pay-online"
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm",
                    paymentMethod !== "CASH_AT_CLINIC" && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value="JAZZCASH" id="pay-online" />
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>
                    <span className="font-medium">Pay online now</span>
                    <span className="block text-xs text-muted-foreground">JazzCash, Easypaisa or card</span>
                  </span>
                </label>
              ) : null}
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)} disabled={submitting}>
              Back
            </Button>
            <Button onClick={confirm} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin" /> : null}
              {paymentMethod === "CASH_AT_CLINIC" || fee === 0 ? "Confirm booking" : `Pay ${formatPKR(fee)}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
