"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LANGUAGES } from "@/lib/constants";
import { applyAsDoctorAction } from "@/server/actions/doctor";

type Option = { id: string; name: string };
type Education = { degree: string; institute: string; year: string };
type Experience = {
  title: string;
  organization: string;
  startYear: string;
  endYear: string;
  isCurrent: boolean;
};

const blankEducation: Education = { degree: "", institute: "", year: "" };
const blankExperience: Experience = {
  title: "",
  organization: "",
  startYear: "",
  endYear: "",
  isCurrent: false,
};

export function ApplyForm({
  specialties,
  hospitals,
}: {
  specialties: Option[];
  hospitals: Option[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [pmdcNumber, setPmdcNumber] = useState("");
  const [bio, setBio] = useState("");
  const [yearsOfExperience, setYears] = useState("");
  const [gender, setGender] = useState("");
  const [specialtyIds, setSpecialtyIds] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>(["Urdu", "English"]);
  const [educations, setEducations] = useState<Education[]>([{ ...blankEducation }]);
  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [hospitalId, setHospitalId] = useState("");
  const [consultationFee, setFee] = useState("");
  const [followUpFee, setFollowUpFee] = useState("0");
  const [followUpValidDays, setValidDays] = useState("14");
  const [slotDurationMinutes, setSlotMinutes] = useState("15");

  const toggle = (list: string[], value: string, set: (v: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  function submit() {
    setErrors({});
    start(async () => {
      const payload = {
        pmdcNumber,
        bio,
        yearsOfExperience,
        gender,
        specialtyIds,
        languages,
        // Empty optional years must be dropped, not sent as "".
        educations: educations.map((e) => ({
          degree: e.degree,
          institute: e.institute,
          ...(e.year ? { year: e.year } : {}),
        })),
        experiences: experiences.map((x) => ({
          title: x.title,
          organization: x.organization,
          startYear: x.startYear,
          isCurrent: x.isCurrent,
          ...(x.endYear && !x.isCurrent ? { endYear: x.endYear } : {}),
        })),
        practice: {
          hospitalId,
          consultationFee,
          followUpFee,
          followUpValidDays,
          slotDurationMinutes,
        },
      };

      const res = await applyAsDoctorAction(payload);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        return;
      }
      toast.success("Application submitted. We'll review it within 2 working days.");
      router.push("/doctor");
      router.refresh();
    });
  }

  const err = (key: string) =>
    errors[key] ? <p className="text-xs text-destructive">{errors[key]}</p> : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
          <CardDescription>
            Your PMDC number is verified manually before your profile goes live.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="pmdc">PMDC registration number</Label>
            <Input
              id="pmdc"
              value={pmdcNumber}
              onChange={(e) => setPmdcNumber(e.target.value)}
              placeholder="12345-P"
            />
            {err("pmdcNumber")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="years">Years of experience</Label>
            <Input
              id="years"
              type="number"
              min={0}
              value={yearsOfExperience}
              onChange={(e) => setYears(e.target.value)}
            />
            {err("yearsOfExperience")}
          </div>
          <div className="space-y-2">
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
            {err("gender")}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Profile bio</Label>
            <Textarea
              id="bio"
              rows={5}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell patients what you treat, your approach, and where you trained."
            />
            <p className="text-xs text-muted-foreground">{bio.length}/2000 · minimum 40</p>
            {err("bio")}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Specialties &amp; languages</CardTitle>
          <CardDescription>Pick up to 4 specialties patients search you by.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {specialties.map((s) => (
              <label key={s.id} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={specialtyIds.includes(s.id)}
                  onCheckedChange={() => toggle(specialtyIds, s.id, setSpecialtyIds)}
                />
                {s.name}
              </label>
            ))}
          </div>
          {err("specialtyIds")}
          <div className="grid gap-2 sm:grid-cols-4">
            {LANGUAGES.map((lang) => (
              <label key={lang} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={languages.includes(lang)}
                  onCheckedChange={() => toggle(languages, lang, setLanguages)}
                />
                {lang}
              </label>
            ))}
          </div>
          {err("languages")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Qualifications</CardTitle>
            <CardDescription>At least one degree is required.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEducations([...educations, { ...blankEducation }])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {educations.map((e, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_100px_auto]">
              <Input
                placeholder="MBBS"
                value={e.degree}
                onChange={(ev) => {
                  const next = [...educations];
                  next[i] = { ...e, degree: ev.target.value };
                  setEducations(next);
                }}
              />
              <Input
                placeholder="King Edward Medical University"
                value={e.institute}
                onChange={(ev) => {
                  const next = [...educations];
                  next[i] = { ...e, institute: ev.target.value };
                  setEducations(next);
                }}
              />
              <Input
                placeholder="Year"
                type="number"
                value={e.year}
                onChange={(ev) => {
                  const next = [...educations];
                  next[i] = { ...e, year: ev.target.value };
                  setEducations(next);
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                disabled={educations.length === 1}
                onClick={() => setEducations(educations.filter((_, x) => x !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {err("educations")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Experience</CardTitle>
            <CardDescription>Optional, but it lifts your profile ranking.</CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setExperiences([...experiences, { ...blankExperience }])}
          >
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {experiences.length === 0 ? (
            <p className="text-sm text-muted-foreground">No entries yet.</p>
          ) : null}
          {experiences.map((x, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[1.2fr_1.4fr_90px_90px_auto]">
              <Input
                placeholder="Consultant Cardiologist"
                value={x.title}
                onChange={(ev) => {
                  const next = [...experiences];
                  next[i] = { ...x, title: ev.target.value };
                  setExperiences(next);
                }}
              />
              <Input
                placeholder="Shaukat Khanum"
                value={x.organization}
                onChange={(ev) => {
                  const next = [...experiences];
                  next[i] = { ...x, organization: ev.target.value };
                  setExperiences(next);
                }}
              />
              <Input
                placeholder="From"
                type="number"
                value={x.startYear}
                onChange={(ev) => {
                  const next = [...experiences];
                  next[i] = { ...x, startYear: ev.target.value };
                  setExperiences(next);
                }}
              />
              <Input
                placeholder="To"
                type="number"
                disabled={x.isCurrent}
                value={x.endYear}
                onChange={(ev) => {
                  const next = [...experiences];
                  next[i] = { ...x, endYear: ev.target.value };
                  setExperiences(next);
                }}
              />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1 whitespace-nowrap text-xs">
                  <Checkbox
                    checked={x.isCurrent}
                    onCheckedChange={(v) => {
                      const next = [...experiences];
                      next[i] = { ...x, isCurrent: v === true, endYear: "" };
                      setExperiences(next);
                    }}
                  />
                  Current
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setExperiences(experiences.filter((_, y) => y !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {err("experiences")}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>First practice location</CardTitle>
          <CardDescription>
            You can add more hospitals and set your weekly timings after approval.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Hospital / clinic</Label>
            <Select value={hospitalId} onValueChange={setHospitalId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose where you practise" />
              </SelectTrigger>
              <SelectContent>
                {hospitals.map((h) => (
                  <SelectItem key={h.id} value={h.id}>
                    {h.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {err("practice.hospitalId")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fee">Consultation fee (PKR)</Label>
            <Input
              id="fee"
              type="number"
              min={0}
              value={consultationFee}
              onChange={(e) => setFee(e.target.value)}
            />
            {err("practice.consultationFee")}
          </div>
          <div className="space-y-2">
            <Label htmlFor="followfee">Follow-up fee (PKR)</Label>
            <Input
              id="followfee"
              type="number"
              min={0}
              value={followUpFee}
              onChange={(e) => setFollowUpFee(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="validdays">Follow-up valid for (days)</Label>
            <Input
              id="validdays"
              type="number"
              min={1}
              value={followUpValidDays}
              onChange={(e) => setValidDays(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slot">Slot length (minutes)</Label>
            <Input
              id="slot"
              type="number"
              min={5}
              step={5}
              value={slotDurationMinutes}
              onChange={(e) => setSlotMinutes(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <p className="text-xs text-muted-foreground">
          Review usually takes 2 working days.
        </p>
        <Button onClick={submit} loading={pending}>
          Submit application
        </Button>
      </div>
    </div>
  );
}
