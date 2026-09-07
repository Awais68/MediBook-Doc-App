"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LANGUAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { updateDoctorProfileAction } from "@/server/actions/doctor";

export type DoctorProfileValues = {
  bio: string;
  yearsOfExperience: number;
  languages: string[];
  isAcceptingPatients: boolean;
  videoConsultEnabled: boolean;
  videoConsultFee: number | null;
  avgWaitMinutes: number;
};

export function DoctorProfileForm({ initial }: { initial: DoctorProfileValues }) {
  const router = useRouter();
  const [form, setForm] = useState({
    bio: initial.bio,
    yearsOfExperience: String(initial.yearsOfExperience),
    languages: initial.languages,
    isAcceptingPatients: initial.isAcceptingPatients,
    videoConsultEnabled: initial.videoConsultEnabled,
    videoConsultFee: initial.videoConsultFee ? String(initial.videoConsultFee) : "",
    avgWaitMinutes: String(initial.avgWaitMinutes),
  });
  const [pending, start] = useTransition();

  const toggleLanguage = (lang: string) =>
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter((l) => l !== lang)
        : [...f.languages, lang],
    }));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Public profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="bio">About you</Label>
            <Textarea
              id="bio"
              rows={6}
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {form.bio.length} characters. Patients read the first two lines before deciding.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="yearsOfExperience">Years of experience</Label>
              <Input
                id="yearsOfExperience"
                inputMode="numeric"
                value={form.yearsOfExperience}
                onChange={(e) => setForm((f) => ({ ...f, yearsOfExperience: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="avgWaitMinutes">Typical wait (minutes)</Label>
              <Input
                id="avgWaitMinutes"
                inputMode="numeric"
                value={form.avgWaitMinutes}
                onChange={(e) => setForm((f) => ({ ...f, avgWaitMinutes: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <Label>Languages</Label>
            <div className="mt-2 flex flex-wrap gap-3">
              {LANGUAGES.map((lang) => (
                <label key={lang} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.languages.includes(lang)}
                    onCheckedChange={() => toggleLanguage(lang)}
                  />
                  {lang}
                </label>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Availability &amp; consultation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="isAcceptingPatients" className="cursor-pointer">Accepting new patients</Label>
              <p className="text-xs text-muted-foreground">Turning this off hides you from search.</p>
            </div>
            <Switch
              id="isAcceptingPatients"
              checked={form.isAcceptingPatients}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isAcceptingPatients: v }))}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="videoConsultEnabled" className="cursor-pointer">Video consultation</Label>
              <p className="text-xs text-muted-foreground">Patients can book an online visit.</p>
            </div>
            <Switch
              id="videoConsultEnabled"
              checked={form.videoConsultEnabled}
              onCheckedChange={(v) => setForm((f) => ({ ...f, videoConsultEnabled: v }))}
            />
          </div>
          {form.videoConsultEnabled ? (
            <div>
              <Label htmlFor="videoConsultFee">Video consultation fee (PKR)</Label>
              <Input
                id="videoConsultFee"
                inputMode="numeric"
                value={form.videoConsultFee}
                onChange={(e) => setForm((f) => ({ ...f, videoConsultFee: e.target.value }))}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Button
        loading={pending}
        onClick={() =>
          start(async () => {
            const res = await updateDoctorProfileAction({
              bio: form.bio,
              yearsOfExperience: Number(form.yearsOfExperience) || 0,
              languages: form.languages,
              isAcceptingPatients: form.isAcceptingPatients,
              videoConsultEnabled: form.videoConsultEnabled,
              videoConsultFee: form.videoConsultFee ? Number(form.videoConsultFee) : null,
              avgWaitMinutes: Number(form.avgWaitMinutes) || 0,
            });
            if (!res.ok) { toast.error(res.error); return; }
            toast.success(res.message ?? "Profile updated.");
            router.refresh();
          })
        }
      >
        Save profile
      </Button>
    </div>
  );
}
