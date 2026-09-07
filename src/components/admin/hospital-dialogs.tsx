"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PAKISTAN_CITIES } from "@/lib/constants";
import { FACILITY_TYPE_LABEL } from "@/lib/labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  upsertHospitalAction,
  toggleHospitalAction,
  upsertSpecialtyAction,
} from "@/server/actions/admin";

export type HospitalValues = {
  id: string;
  name: string;
  type: keyof typeof FACILITY_TYPE_LABEL;
  address: string;
  area: string | null;
  city: string;
  province: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  facilities: string[];
};

export function HospitalDialog({
  hospital,
  trigger,
}: {
  hospital?: HospitalValues;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    name: hospital?.name ?? "",
    type: hospital?.type ?? "HOSPITAL",
    address: hospital?.address ?? "",
    area: hospital?.area ?? "",
    city: hospital?.city ?? PAKISTAN_CITIES[0],
    province: hospital?.province ?? "",
    phone: hospital?.phone ?? "",
    email: hospital?.email ?? "",
    description: hospital?.description ?? "",
    facilities: (hospital?.facilities ?? []).join(", "),
  });

  const err = (k: string) =>
    errors[k] ? <p className="mt-1 text-xs text-destructive">{errors[k]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{hospital ? "Edit facility" : "Add a facility"}</DialogTitle>
          <DialogDescription>Doctors attach their practice to these records.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            {err("name")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as HospitalValues["type"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FACILITY_TYPE_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>City</Label>
              <Select value={form.city} onValueChange={(v) => setForm((f) => ({ ...f, city: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAKISTAN_CITIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
            {err("address")}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="area">Area</Label>
              <Input id="area" value={form.area} placeholder="Gulberg III" onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="province">Province</Label>
              <Input id="province" value={form.province} placeholder="Punjab" onChange={(e) => setForm((f) => ({ ...f, province: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              {err("email")}
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="facilities">Facilities (comma separated)</Label>
            <Input
              id="facilities"
              value={form.facilities}
              placeholder="Pharmacy, Lab, Parking, ICU"
              onChange={(e) => setForm((f) => ({ ...f, facilities: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const res = await upsertHospitalAction(
                  {
                    name: form.name,
                    type: form.type,
                    address: form.address,
                    area: form.area || undefined,
                    city: form.city,
                    province: form.province || undefined,
                    phone: form.phone || undefined,
                    email: form.email,
                    description: form.description || undefined,
                    facilities: form.facilities
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                  hospital?.id,
                );
                if (!res.ok) {
                  setErrors(res.fieldErrors ?? {});
                  toast.error(res.error);
                  return;
                }
                setErrors({});
                toast.success(res.message ?? "Saved.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Save facility
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ToggleHospitalButton({ id, isActive }: { id: string; isActive: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleHospitalAction(id, !isActive);
          if (!res.ok) {
            toast.error(res.error);
            return;
          }
          toast.success(res.message ?? "Updated.");
          router.refresh();
        })
      }
    >
      {isActive ? "Deactivate" : "Activate"}
    </Button>
  );
}

export function SpecialtyDialog({
  specialty,
  trigger,
}: {
  specialty?: { id: string; name: string; description: string | null; icon: string | null; sortOrder: number };
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: specialty?.name ?? "",
    description: specialty?.description ?? "",
    icon: specialty?.icon ?? "",
    sortOrder: String(specialty?.sortOrder ?? 0),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{specialty ? "Edit specialty" : "Add a specialty"}</DialogTitle>
          <DialogDescription>
            The slug is derived from the name and is used in search URLs — renaming an existing
            specialty changes its public URL.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div>
            <Label htmlFor="specName">Name</Label>
            <Input id="specName" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="specDesc">Description</Label>
            <Textarea id="specDesc" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="specIcon">Icon (emoji or name)</Label>
              <Input id="specIcon" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="specSort">Sort order</Label>
              <Input id="specSort" inputMode="numeric" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: e.target.value }))} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            loading={pending}
            disabled={form.name.trim().length < 2}
            onClick={() =>
              start(async () => {
                const res = await upsertSpecialtyAction(
                  {
                    name: form.name.trim(),
                    description: form.description || undefined,
                    icon: form.icon || undefined,
                    sortOrder: Number(form.sortOrder) || 0,
                  },
                  specialty?.id,
                );
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success(res.message ?? "Saved.");
                setOpen(false);
                router.refresh();
              })
            }
          >
            Save specialty
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
