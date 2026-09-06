"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, X } from "lucide-react";
import { updatePatientProfileAction } from "@/server/actions/patient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { PAKISTAN_CITIES } from "@/lib/constants";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** A comma/enter-separated tag input — allergies, conditions, medicines. */
function TagInput({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = React.useState("");

  function commit() {
    const items = draft
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!items.length) return;
    onChange(Array.from(new Set([...value, ...items])).slice(0, 30));
    setDraft("");
  }

  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder={hint}
        />
        <Button type="button" variant="outline" onClick={commit}>
          Add
        </Button>
      </div>
      {value.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1">
              {v}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={`Remove ${v}`}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type ProfileFormData = {
  name: string;
  gender: string | null;
  dateOfBirth: string;
  city: string | null;
  cnic: string;
  bloodGroup: string;
  heightCm: number | null;
  weightKg: number | null;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
};

export function ProfileForm({ initial }: { initial: ProfileFormData }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const [gender, setGender] = React.useState(initial.gender ?? "");
  const [city, setCity] = React.useState(initial.city ?? "");
  const [bloodGroup, setBloodGroup] = React.useState(initial.bloodGroup);
  const [allergies, setAllergies] = React.useState(initial.allergies);
  const [conditions, setConditions] = React.useState(initial.chronicConditions);
  const [medications, setMedications] = React.useState(initial.currentMedications);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setErrors({});

    const res = await updatePatientProfileAction({
      name: String(form.get("name") ?? ""),
      gender: gender || undefined,
      dateOfBirth: String(form.get("dateOfBirth") ?? ""),
      city: city || undefined,
      cnic: String(form.get("cnic") ?? ""),
      bloodGroup,
      heightCm: form.get("heightCm") ? Number(form.get("heightCm")) : undefined,
      weightKg: form.get("weightKg") ? Number(form.get("weightKg")) : undefined,
      allergies,
      chronicConditions: conditions,
      currentMedications: medications,
      emergencyContactName: String(form.get("emergencyContactName") ?? ""),
      emergencyContactPhone: String(form.get("emergencyContactPhone") ?? ""),
      address: String(form.get("address") ?? ""),
    });

    setPending(false);
    if (!res.ok) {
      setErrors(res.fieldErrors ?? {});
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Profile saved.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4">
        <h2 className="font-semibold">Personal details</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="name" required>
              Full name
            </Label>
            <Input id="name" name="name" defaultValue={initial.name} required />
            {errors.name ? <p className="mt-1 text-xs text-destructive">{errors.name}</p> : null}
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of birth</Label>
            <Input id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={initial.dateOfBirth} />
          </div>
          <div>
            <Label>Gender</Label>
            <Select value={gender} onValueChange={setGender}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MALE">Male</SelectItem>
                <SelectItem value="FEMALE">Female</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>City</Label>
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {PAKISTAN_CITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="cnic">CNIC</Label>
            <Input id="cnic" name="cnic" defaultValue={initial.cnic} placeholder="35202-1234567-1" />
            {errors.cnic ? <p className="mt-1 text-xs text-destructive">{errors.cnic}</p> : null}
          </div>
          <div>
            <Label>Blood group</Label>
            <Select value={bloodGroup} onValueChange={setBloodGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Not known" />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_GROUPS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="address">Address</Label>
          <Textarea id="address" name="address" rows={2} defaultValue={initial.address} maxLength={300} />
        </div>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="font-semibold">Health profile</h2>
          <p className="text-sm text-muted-foreground">
            Doctors you book see this at the start of a consultation — it saves repeating your history every visit.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="heightCm">Height (cm)</Label>
            <Input
              id="heightCm"
              name="heightCm"
              type="number"
              min={30}
              max={260}
              defaultValue={initial.heightCm ?? ""}
            />
          </div>
          <div>
            <Label htmlFor="weightKg">Weight (kg)</Label>
            <Input id="weightKg" name="weightKg" type="number" min={1} max={400} defaultValue={initial.weightKg ?? ""} />
          </div>
        </div>

        <TagInput label="Allergies" hint="Penicillin, dust…" value={allergies} onChange={setAllergies} />
        <TagInput label="Chronic conditions" hint="Diabetes, hypertension…" value={conditions} onChange={setConditions} />
        <TagInput
          label="Current medications"
          hint="Metformin 500mg…"
          value={medications}
          onChange={setMedications}
        />
      </section>

      <Separator />

      <section className="space-y-4">
        <h2 className="font-semibold">Emergency contact</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="emergencyContactName">Name</Label>
            <Input id="emergencyContactName" name="emergencyContactName" defaultValue={initial.emergencyContactName} />
          </div>
          <div>
            <Label htmlFor="emergencyContactPhone">Phone</Label>
            <Input
              id="emergencyContactPhone"
              name="emergencyContactPhone"
              type="tel"
              defaultValue={initial.emergencyContactPhone}
            />
          </div>
        </div>
      </section>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        Save profile
      </Button>
    </form>
  );
}
