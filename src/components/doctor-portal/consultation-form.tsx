"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FREQUENCIES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { saveConsultationAction } from "@/server/actions/clinical";

type Medicine = {
  drugName: string;
  strength: string;
  form: string;
  dosage: string;
  frequency: string;
  durationDays: string;
  instructions: string;
};

type LabTest = { testName: string; instructions: string };

export type ConsultationDraft = {
  chiefComplaint: string;
  historyOfIllness: string;
  examination: string;
  diagnosis: string;
  clinicalNotes: string;
  advice: string;
  bloodPressure: string;
  pulseBpm: string;
  temperatureC: string;
  spo2: string;
  weightKg: string;
  heightCm: string;
  bloodSugar: string;
  followUpAfterDays: string;
  followUpReason: string;
  prescriptionNotes: string;
  medicines: Medicine[];
  labTests: LabTest[];
};

const EMPTY_MEDICINE: Medicine = {
  drugName: "",
  strength: "",
  form: "",
  dosage: "",
  frequency: "",
  durationDays: "",
  instructions: "",
};

/** Blank strings are meaningless to the API — drop them so Zod optionals stay optional. */
function clean<T extends Record<string, unknown>>(obj: T) {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== "" && v !== undefined) out[k] = v;
  return out;
}

export function ConsultationForm({
  appointmentId,
  initial,
  readOnly = false,
}: {
  appointmentId: string;
  initial: ConsultationDraft;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<ConsultationDraft>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const set = <K extends keyof ConsultationDraft>(key: K, value: ConsultationDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setMedicine = (i: number, key: keyof Medicine, value: string) =>
    setDraft((d) => ({
      ...d,
      medicines: d.medicines.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)),
    }));

  function submit(markCompleted: boolean) {
    const medicines = draft.medicines
      .filter((m) => m.drugName.trim())
      .map((m) => clean({ ...m, durationDays: m.durationDays || undefined }));
    const labTests = draft.labTests.filter((t) => t.testName.trim()).map((t) => clean(t));

    const payload = {
      appointmentId,
      ...clean({
        chiefComplaint: draft.chiefComplaint,
        historyOfIllness: draft.historyOfIllness,
        examination: draft.examination,
        diagnosis: draft.diagnosis,
        clinicalNotes: draft.clinicalNotes,
        advice: draft.advice,
        bloodPressure: draft.bloodPressure,
        pulseBpm: draft.pulseBpm,
        temperatureC: draft.temperatureC,
        spo2: draft.spo2,
        weightKg: draft.weightKg,
        heightCm: draft.heightCm,
        bloodSugar: draft.bloodSugar,
        followUpAfterDays: draft.followUpAfterDays,
        followUpReason: draft.followUpReason,
        prescriptionNotes: draft.prescriptionNotes,
      }),
      medicines,
      labTests,
      markCompleted,
    };

    start(async () => {
      const res = await saveConsultationAction(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        { toast.error(res.error); return; }
      }
      setErrors({});
      toast.success(res.message ?? (markCompleted ? "Visit completed." : "Draft saved."));
      router.refresh();
    });
  }

  const err = (key: string) =>
    errors[key] ? <p className="mt-1 text-xs text-destructive">{errors[key]}</p> : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Clinical notes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="chiefComplaint">Chief complaint</Label>
            <Input
              id="chiefComplaint"
              disabled={readOnly}
              value={draft.chiefComplaint}
              onChange={(e) => set("chiefComplaint", e.target.value)}
              placeholder="Fever and body aches for 3 days"
            />
            {err("chiefComplaint")}
          </div>
          <div>
            <Label htmlFor="historyOfIllness">History of present illness</Label>
            <Textarea
              id="historyOfIllness"
              rows={3}
              disabled={readOnly}
              value={draft.historyOfIllness}
              onChange={(e) => set("historyOfIllness", e.target.value)}
            />
            {err("historyOfIllness")}
          </div>
          <div>
            <Label htmlFor="examination">Examination</Label>
            <Textarea
              id="examination"
              rows={3}
              disabled={readOnly}
              value={draft.examination}
              onChange={(e) => set("examination", e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="diagnosis">Diagnosis</Label>
            <Input
              id="diagnosis"
              disabled={readOnly}
              value={draft.diagnosis}
              onChange={(e) => set("diagnosis", e.target.value)}
              placeholder="Acute viral pharyngitis"
            />
            {err("diagnosis")}
          </div>
          <div>
            <Label htmlFor="advice">Advice for the patient</Label>
            <Textarea
              id="advice"
              rows={2}
              disabled={readOnly}
              value={draft.advice}
              onChange={(e) => set("advice", e.target.value)}
              placeholder="Plenty of fluids, rest, return if fever crosses 102°F"
            />
          </div>
          <div>
            <Label htmlFor="clinicalNotes">Private notes (not shown to the patient)</Label>
            <Textarea
              id="clinicalNotes"
              rows={2}
              disabled={readOnly}
              value={draft.clinicalNotes}
              onChange={(e) => set("clinicalNotes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vitals</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {(
            [
              ["bloodPressure", "BP (mmHg)", "120/80"],
              ["pulseBpm", "Pulse (bpm)", "78"],
              ["temperatureC", "Temp (°C)", "37.2"],
              ["spo2", "SpO₂ (%)", "98"],
              ["weightKg", "Weight (kg)", "72"],
              ["heightCm", "Height (cm)", "170"],
              ["bloodSugar", "Blood sugar (mg/dL)", "110"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                disabled={readOnly}
                inputMode={key === "bloodPressure" ? "text" : "decimal"}
                value={draft[key]}
                placeholder={placeholder}
                onChange={(e) => set(key, e.target.value)}
              />
              {err(key)}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Prescription</CardTitle>
          {!readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setDraft((d) => ({ ...d, medicines: [...d.medicines, { ...EMPTY_MEDICINE }] }))}
            >
              <Plus className="mr-1 h-4 w-4" /> Add medicine
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {draft.medicines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No medicines added.</p>
          ) : (
            draft.medicines.map((m, i) => (
              <div key={i} className="rounded-lg border p-4">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <Label>Medicine</Label>
                    <Input
                      disabled={readOnly}
                      value={m.drugName}
                      placeholder="Panadol"
                      onChange={(e) => setMedicine(i, "drugName", e.target.value)}
                    />
                    {err(`medicines.${i}.drugName`)}
                  </div>
                  <div>
                    <Label>Strength</Label>
                    <Input
                      disabled={readOnly}
                      value={m.strength}
                      placeholder="500mg"
                      onChange={(e) => setMedicine(i, "strength", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Form</Label>
                    <Input
                      disabled={readOnly}
                      value={m.form}
                      placeholder="Tablet"
                      onChange={(e) => setMedicine(i, "form", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Dosage</Label>
                    <Input
                      disabled={readOnly}
                      value={m.dosage}
                      placeholder="1 tab"
                      onChange={(e) => setMedicine(i, "dosage", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Frequency</Label>
                    <Select
                      disabled={readOnly}
                      value={m.frequency || undefined}
                      onValueChange={(v) => setMedicine(i, "frequency", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {FREQUENCIES.map((f) => (
                          <SelectItem key={f} value={f}>
                            {f}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Duration (days)</Label>
                    <Input
                      disabled={readOnly}
                      inputMode="numeric"
                      value={m.durationDays}
                      placeholder="5"
                      onChange={(e) => setMedicine(i, "durationDays", e.target.value)}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    <Label>Instructions</Label>
                    <Input
                      disabled={readOnly}
                      value={m.instructions}
                      placeholder="After meals"
                      onChange={(e) => setMedicine(i, "instructions", e.target.value)}
                    />
                  </div>
                </div>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-destructive"
                    onClick={() =>
                      setDraft((d) => ({ ...d, medicines: d.medicines.filter((_, idx) => idx !== i) }))
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" /> Remove
                  </Button>
                ) : null}
              </div>
            ))
          )}

          <Separator />
          <div>
            <Label htmlFor="prescriptionNotes">Prescription notes</Label>
            <Textarea
              id="prescriptionNotes"
              rows={2}
              disabled={readOnly}
              value={draft.prescriptionNotes}
              onChange={(e) => set("prescriptionNotes", e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Lab tests</CardTitle>
          {!readOnly ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft((d) => ({ ...d, labTests: [...d.labTests, { testName: "", instructions: "" }] }))
              }
            >
              <Plus className="mr-1 h-4 w-4" /> Add test
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {draft.labTests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tests ordered.</p>
          ) : (
            draft.labTests.map((t, i) => (
              <div key={i} className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <Label>Test</Label>
                  <Input
                    disabled={readOnly}
                    value={t.testName}
                    placeholder="CBC"
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        labTests: d.labTests.map((x, idx) =>
                          idx === i ? { ...x, testName: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </div>
                <div className="min-w-48 flex-1">
                  <Label>Instructions</Label>
                  <Input
                    disabled={readOnly}
                    value={t.instructions}
                    placeholder="Fasting sample"
                    onChange={(e) =>
                      setDraft((d) => ({
                        ...d,
                        labTests: d.labTests.map((x, idx) =>
                          idx === i ? { ...x, instructions: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </div>
                {!readOnly ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() =>
                      setDraft((d) => ({ ...d, labTests: d.labTests.filter((_, idx) => idx !== i) }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Follow-up plan</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="followUpAfterDays">Review after (days)</Label>
            <Input
              id="followUpAfterDays"
              inputMode="numeric"
              disabled={readOnly}
              value={draft.followUpAfterDays}
              placeholder="7"
              onChange={(e) => set("followUpAfterDays", e.target.value)}
            />
            {err("followUpAfterDays")}
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="followUpReason">Reason</Label>
            <Input
              id="followUpReason"
              disabled={readOnly}
              value={draft.followUpReason}
              placeholder="Recheck blood pressure after starting medication"
              onChange={(e) => set("followUpReason", e.target.value)}
            />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-3">
            The patient gets a reminder and a one-tap follow-up booking link — charged at your
            follow-up fee if it falls inside the validity window.
          </p>
        </CardContent>
      </Card>

      {!readOnly ? (
        <div className="sticky bottom-4 flex flex-wrap gap-3 rounded-xl border bg-background/95 p-4 shadow-lg backdrop-blur">
          <Button variant="outline" loading={pending} onClick={() => submit(false)}>
            Save draft
          </Button>
          <Button loading={pending} onClick={() => submit(true)}>
            Save &amp; complete visit
          </Button>
          <p className="w-full text-xs text-muted-foreground sm:w-auto sm:self-center">
            Completing the visit issues the prescription and unlocks the patient&apos;s review.
          </p>
        </div>
      ) : null}
    </div>
  );
}
