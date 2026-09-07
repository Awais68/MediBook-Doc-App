"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DAY_NAMES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  addScheduleAction,
  deleteScheduleAction,
  addTimeOffAction,
  deleteTimeOffAction,
  upsertPracticeAction,
} from "@/server/actions/doctor";

export type PracticeOption = { id: string; label: string };

export type PracticeValues = {
  id?: string;
  hospitalId: string;
  consultationFee: number;
  followUpFee: number;
  followUpValidDays: number;
  slotDurationMinutes: number;
  roomNumber?: string | null;
  acceptsCashAtClinic: boolean;
  acceptsOnlinePayment: boolean;
  isActive: boolean;
};

export function AddSessionDialog({ practices }: { practices: PracticeOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    doctorHospitalId: practices[0]?.id ?? "",
    dayOfWeek: "1",
    startTime: "17:00",
    endTime: "21:00",
    slotDurationMinutes: "",
    maxPatients: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={practices.length === 0}>
          <Plus className="mr-1 h-4 w-4" /> Add session
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a weekly session</DialogTitle>
          <DialogDescription>
            Slots are generated from this window — you never create them by hand.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Location</Label>
            <Select
              value={form.doctorHospitalId}
              onValueChange={(v) => setForm((f) => ({ ...f, doctorHospitalId: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Pick a location" /></SelectTrigger>
              <SelectContent>
                {practices.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Day</Label>
            <Select value={form.dayOfWeek} onValueChange={(v) => setForm((f) => ({ ...f, dayOfWeek: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DAY_NAMES.map((d, i) => (
                  <SelectItem key={d} value={String(i)}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="startTime">Start</Label>
              <Input
                id="startTime"
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End</Label>
              <Input
                id="endTime"
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="slotDurationMinutes">Slot minutes</Label>
              <Input
                id="slotDurationMinutes"
                inputMode="numeric"
                placeholder="Location default"
                value={form.slotDurationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, slotDurationMinutes: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="maxPatients">Max patients</Label>
              <Input
                id="maxPatients"
                inputMode="numeric"
                placeholder="No cap"
                value={form.maxPatients}
                onChange={(e) => setForm((f) => ({ ...f, maxPatients: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await addScheduleAction({
                  doctorHospitalId: form.doctorHospitalId,
                  dayOfWeek: form.dayOfWeek,
                  startTime: form.startTime,
                  endTime: form.endTime,
                  ...(form.slotDurationMinutes ? { slotDurationMinutes: form.slotDurationMinutes } : {}),
                  ...(form.maxPatients ? { maxPatients: form.maxPatients } : {}),
                });
                if (!res.ok) { toast.error(res.error); return; }
                toast.success(res.message ?? "Session added.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Add session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteSessionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteScheduleAction(id);
          if (!res.ok) { toast.error(res.error); return; }
          toast.success(res.message ?? "Removed.");
          router.refresh();
        })
      }
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function AddTimeOffDialog({ practices }: { practices: PracticeOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    date: "",
    doctorHospitalId: "all",
    isFullDay: true,
    startTime: "17:00",
    endTime: "19:00",
    reason: "",
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="mr-1 h-4 w-4" /> Add time off
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block time off</DialogTitle>
          <DialogDescription>
            Patients already booked inside this window get notified to reschedule.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <Label>Location</Label>
            <Select
              value={form.doctorHospitalId}
              onValueChange={(v) => setForm((f) => ({ ...f, doctorHospitalId: v }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All locations</SelectItem>
                {practices.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="isFullDay" className="cursor-pointer">Full day</Label>
            <Switch
              id="isFullDay"
              checked={form.isFullDay}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isFullDay: v }))}
            />
          </div>
          {!form.isFullDay ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="offStart">From</Label>
                <Input
                  id="offStart"
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="offEnd">To</Label>
                <Input
                  id="offEnd"
                  type="time"
                  value={form.endTime}
                  onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
                />
              </div>
            </div>
          ) : null}
          <div>
            <Label htmlFor="reason">Reason (optional)</Label>
            <Input
              id="reason"
              value={form.reason}
              placeholder="Conference in Lahore"
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await addTimeOffAction({
                  date: form.date,
                  doctorHospitalId: form.doctorHospitalId === "all" ? null : form.doctorHospitalId,
                  isFullDay: form.isFullDay,
                  ...(form.isFullDay ? {} : { startTime: form.startTime, endTime: form.endTime }),
                  ...(form.reason ? { reason: form.reason } : {}),
                });
                if (!res.ok) { toast.error(res.error); return; }
                toast.success(res.message ?? "Time off saved.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteTimeOffButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-destructive"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await deleteTimeOffAction(id);
          if (!res.ok) { toast.error(res.error); return; }
          toast.success(res.message ?? "Removed.");
          router.refresh();
        })
      }
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}

export function PracticeDialog({
  hospitals,
  practice,
  trigger,
}: {
  hospitals: { id: string; name: string; city: string }[];
  practice?: PracticeValues;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    hospitalId: practice?.hospitalId ?? hospitals[0]?.id ?? "",
    consultationFee: String(practice?.consultationFee ?? 2000),
    followUpFee: String(practice?.followUpFee ?? 0),
    followUpValidDays: String(practice?.followUpValidDays ?? 14),
    slotDurationMinutes: String(practice?.slotDurationMinutes ?? 15),
    roomNumber: practice?.roomNumber ?? "",
    acceptsCashAtClinic: practice?.acceptsCashAtClinic ?? true,
    acceptsOnlinePayment: practice?.acceptsOnlinePayment ?? true,
    isActive: practice?.isActive ?? true,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{practice ? "Edit location" : "Add a practice location"}</DialogTitle>
          <DialogDescription>Fees and slot length are set per location.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label>Hospital / clinic</Label>
            <Select
              value={form.hospitalId}
              onValueChange={(v) => setForm((f) => ({ ...f, hospitalId: v }))}
              disabled={Boolean(practice)}
            >
              <SelectTrigger><SelectValue placeholder="Pick one" /></SelectTrigger>
              <SelectContent>
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>{h.name} — {h.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="consultationFee">Consultation fee (PKR)</Label>
              <Input
                id="consultationFee"
                inputMode="numeric"
                value={form.consultationFee}
                onChange={(e) => setForm((f) => ({ ...f, consultationFee: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="followUpFee">Follow-up fee (0 = free)</Label>
              <Input
                id="followUpFee"
                inputMode="numeric"
                value={form.followUpFee}
                onChange={(e) => setForm((f) => ({ ...f, followUpFee: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="followUpValidDays">Follow-up valid (days)</Label>
              <Input
                id="followUpValidDays"
                inputMode="numeric"
                value={form.followUpValidDays}
                onChange={(e) => setForm((f) => ({ ...f, followUpValidDays: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="slotDurationMinutes">Slot length (min)</Label>
              <Input
                id="slotDurationMinutes"
                inputMode="numeric"
                value={form.slotDurationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, slotDurationMinutes: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="roomNumber">Room / floor (optional)</Label>
            <Input
              id="roomNumber"
              value={form.roomNumber}
              onChange={(e) => setForm((f) => ({ ...f, roomNumber: e.target.value }))}
            />
          </div>

          {(
            [
              ["acceptsCashAtClinic", "Accept cash at clinic"],
              ["acceptsOnlinePayment", "Accept online payment"],
              ["isActive", "Location is active"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border p-3">
              <Label htmlFor={key} className="cursor-pointer">{label}</Label>
              <Switch
                id={key}
                checked={form[key]}
                onCheckedChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
              />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await upsertPracticeAction({
                  id: practice?.id,
                  hospitalId: form.hospitalId,
                  consultationFee: Number(form.consultationFee),
                  followUpFee: Number(form.followUpFee),
                  followUpValidDays: Number(form.followUpValidDays),
                  slotDurationMinutes: Number(form.slotDurationMinutes),
                  roomNumber: form.roomNumber || undefined,
                  acceptsCashAtClinic: form.acceptsCashAtClinic,
                  acceptsOnlinePayment: form.acceptsOnlinePayment,
                  isActive: form.isActive,
                });
                if (!res.ok) { toast.error(res.error); return; }
                toast.success(res.message ?? "Saved.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Save location
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
