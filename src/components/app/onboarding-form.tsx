"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BLOOD_GROUPS, PAKISTAN_CITIES } from "@/lib/constants";
import { updatePatientProfileAction } from "@/server/actions/patient";

/** Minimum viable profile — everything else lives in /settings. */
export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState(defaultName);
  const [gender, setGender] = useState("");
  const [dateOfBirth, setDob] = useState("");
  const [city, setCity] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");

  function submit() {
    start(async () => {
      const res = await updatePatientProfileAction({
        name,
        city,
        dateOfBirth,
        bloodGroup,
        ...(gender ? { gender } : {}),
        allergies: [],
        chronicConditions: [],
        currentMedications: [],
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success("You're all set.");
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div className="space-y-2">
          <Label htmlFor="dob">Date of birth</Label>
          <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDob(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger>
              <SelectValue placeholder="Where do you live?" />
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
        <div className="space-y-2">
          <Label>Blood group</Label>
          <Select value={bloodGroup} onValueChange={setBloodGroup}>
            <SelectTrigger>
              <SelectValue placeholder="Optional" />
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
      <Button className="w-full" onClick={submit} loading={pending}>
        Continue
      </Button>
    </div>
  );
}
