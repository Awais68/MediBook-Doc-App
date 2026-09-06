"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Share2, Trash2 } from "lucide-react";
import {
  addMedicalRecordAction,
  deleteMedicalRecordAction,
  revokeShareAction,
  shareRecordAction,
} from "@/server/actions/patient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const TYPES = [
  ["LAB_REPORT", "Lab report"],
  ["IMAGING", "Imaging / scan"],
  ["PRESCRIPTION", "Prescription"],
  ["DISCHARGE_SUMMARY", "Discharge summary"],
  ["VACCINATION", "Vaccination"],
  ["INSURANCE", "Insurance"],
  ["OTHER", "Other"],
] as const;

export function AddRecordDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [type, setType] = React.useState<string>("LAB_REPORT");
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);

    const res = await addMedicalRecordAction({
      title: String(form.get("title") ?? ""),
      type,
      recordDate: String(form.get("recordDate") ?? ""),
      notes: String(form.get("notes") ?? "") || undefined,
      fileUrl: String(form.get("fileUrl") ?? ""),
      fileName: String(form.get("fileName") ?? "") || undefined,
    });

    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Record added.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add record
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a medical record</DialogTitle>
          <DialogDescription>
            Keep old lab reports and scans here so any doctor you choose can see them.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" required>
              Title
            </Label>
            <Input id="title" name="title" placeholder="CBC report — Chughtai Lab" required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="recordDate" required>
                Record date
              </Label>
              <Input
                id="recordDate"
                name="recordDate"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="fileUrl">File link</Label>
            <Input id="fileUrl" name="fileUrl" placeholder="https://…" />
            <p className="mt-1 text-xs text-muted-foreground">
              Paste a link for now — direct uploads land with the storage provider.
            </p>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={3} maxLength={1000} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" /> : null}
              Save record
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteRecordButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Delete record">
          <Trash2 className="text-destructive" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this record?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes it from your timeline and from any doctor you shared it with. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={async () => {
              setPending(true);
              const res = await deleteMedicalRecordAction(id);
              setPending(false);
              if (!res.ok) {
                toast.error(res.error);
                return;
              }
              toast.success("Record deleted.");
              router.refresh();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ShareRecordDialog({
  recordId,
  doctors,
  sharedWith,
}: {
  recordId: string;
  doctors: { id: string; name: string }[];
  sharedWith: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState<string | null>(null);

  async function toggle(doctorId: string, shared: boolean) {
    setPending(doctorId);
    const res = shared ? await revokeShareAction(recordId, doctorId) : await shareRecordAction(recordId, doctorId, 90);
    setPending(null);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Updated.");
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Share record">
          <Share2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Who can see this record?</DialogTitle>
          <DialogDescription>
            Only doctors you have actually consulted appear here, and access expires after 90 days. You can revoke any
            time.
          </DialogDescription>
        </DialogHeader>

        {doctors.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            You haven&apos;t completed a visit yet, so there is nobody to share with.
          </p>
        ) : (
          <ul className="space-y-2">
            {doctors.map((d) => {
              const shared = sharedWith.includes(d.id);
              return (
                <li key={d.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>{d.name}</span>
                  <Button
                    size="sm"
                    variant={shared ? "outline" : "default"}
                    disabled={pending === d.id}
                    onClick={() => toggle(d.id, shared)}
                  >
                    {pending === d.id ? <Loader2 className="animate-spin" /> : null}
                    {shared ? "Revoke" : "Share"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
