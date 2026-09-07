import type { Metadata } from "next";
import { CalendarRange, MapPin, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireDoctor } from "@/lib/session";
import { DAY_NAMES, DAY_SHORT } from "@/lib/constants";
import { prettyTime } from "@/lib/time";
import { formatDate, formatPKR } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AddSessionDialog,
  AddTimeOffDialog,
  DeleteSessionButton,
  DeleteTimeOffButton,
  PracticeDialog,
} from "@/components/doctor-portal/schedule-dialogs";

export const metadata: Metadata = { title: "Schedule · Doctor" };

export default async function DoctorSchedulePage() {
  const { doctor } = await requireDoctor();

  const [practices, schedules, timeOff, hospitals] = await Promise.all([
    prisma.doctorHospital.findMany({
      where: { doctorId: doctor.id },
      orderBy: { createdAt: "asc" },
      include: { hospital: { select: { id: true, name: true, city: true } } },
    }),
    prisma.schedule.findMany({
      where: { doctorId: doctor.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: { doctorHospital: { select: { hospital: { select: { name: true } } } } },
    }),
    prisma.scheduleException.findMany({
      where: { doctorId: doctor.id, date: { gte: new Date(new Date().toDateString()) } },
      orderBy: { date: "asc" },
      include: { doctorHospital: { select: { hospital: { select: { name: true } } } } },
    }),
    prisma.hospital.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true },
    }),
  ]);

  const options = practices.map((p) => ({ id: p.id, label: `${p.hospital.name} — ${p.hospital.city}` }));
  const takenHospitalIds = new Set(practices.map((p) => p.hospitalId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schedule"
        description="Your practice locations, weekly sessions and time off. Bookable slots are derived from these — nothing is created manually."
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Practice locations</CardTitle>
          <PracticeDialog
            hospitals={hospitals.filter((h) => !takenHospitalIds.has(h.id))}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" /> Add location
              </Button>
            }
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {practices.length === 0 ? (
            <EmptyState
              icon={MapPin}
              title="No practice location yet"
              description="Add the hospital or clinic where you sit, along with your fee."
              className="border-0"
            />
          ) : (
            practices.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-4 rounded-lg border p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{p.hospital.name}</p>
                    {!p.isActive ? <Badge variant="secondary">Paused</Badge> : null}
                    {p.roomNumber ? <Badge variant="outline">Room {p.roomNumber}</Badge> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {p.hospital.city} · Fee {formatPKR(p.consultationFee)} · Follow-up{" "}
                    {formatPKR(p.followUpFee, { free: "free" })} for {p.followUpValidDays} days ·{" "}
                    {p.slotDurationMinutes} min slots
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[p.acceptsCashAtClinic ? "Cash at clinic" : null, p.acceptsOnlinePayment ? "Online payment" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <PracticeDialog
                  hospitals={hospitals}
                  practice={{
                    id: p.id,
                    hospitalId: p.hospitalId,
                    consultationFee: p.consultationFee,
                    followUpFee: p.followUpFee,
                    followUpValidDays: p.followUpValidDays,
                    slotDurationMinutes: p.slotDurationMinutes,
                    roomNumber: p.roomNumber,
                    acceptsCashAtClinic: p.acceptsCashAtClinic,
                    acceptsOnlinePayment: p.acceptsOnlinePayment,
                    isActive: p.isActive,
                  }}
                  trigger={
                    <Button size="sm" variant="ghost">
                      <Pencil className="mr-1 h-4 w-4" /> Edit
                    </Button>
                  }
                />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Weekly sessions</CardTitle>
          <AddSessionDialog practices={options} />
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <EmptyState
              icon={CalendarRange}
              title="No sessions yet"
              description="Patients can't book until you add at least one weekly session."
              className="border-0"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {DAY_NAMES.map((day, i) => {
                const rows = schedules.filter((s) => s.dayOfWeek === i);
                return (
                  <div key={day} className="rounded-lg border p-4">
                    <p className="mb-2 text-sm font-medium">
                      {day} <span className="text-muted-foreground">({DAY_SHORT[i]})</span>
                    </p>
                    {rows.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Off</p>
                    ) : (
                      <ul className="space-y-2">
                        {rows.map((s) => (
                          <li key={s.id} className="flex items-center gap-2 text-sm">
                            <div className="min-w-0 flex-1">
                              <p className="tabular-nums">
                                {prettyTime(s.startTime)} – {prettyTime(s.endTime)}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.doctorHospital.hospital.name}
                                {s.maxPatients ? ` · max ${s.maxPatients}` : ""}
                              </p>
                            </div>
                            <DeleteSessionButton id={s.id} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Upcoming time off</CardTitle>
          <AddTimeOffDialog practices={options} />
        </CardHeader>
        <CardContent className="space-y-3">
          {timeOff.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing blocked. Your regular sessions apply.</p>
          ) : (
            timeOff.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{formatDate(t.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.isFullDay ? "Full day" : `${prettyTime(t.startTime!)} – ${prettyTime(t.endTime!)}`} ·{" "}
                    {t.doctorHospital?.hospital.name ?? "All locations"}
                    {t.reason ? ` · ${t.reason}` : ""}
                  </p>
                </div>
                <DeleteTimeOffButton id={t.id} />
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
