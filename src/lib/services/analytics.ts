import "server-only";
import { prisma } from "@/lib/prisma";
import { addDays, startOfLocalDay, dateKey } from "@/lib/time";

export async function getPlatformStats() {
  const today = startOfLocalDay(new Date());
  const monthAgo = addDays(today, -30);

  const [
    patients,
    doctors,
    pendingDoctors,
    hospitals,
    appointmentsTotal,
    appointmentsToday,
    revenueAgg,
    statusCounts,
    reviewsPending,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.doctor.count({ where: { verificationStatus: "APPROVED" } }),
    prisma.doctor.count({ where: { verificationStatus: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.hospital.count({ where: { isActive: true } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { scheduledAt: { gte: today, lt: addDays(today, 1) } } }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthAgo } },
      _sum: { amount: true },
      _count: { _all: true },
    }),
    prisma.appointment.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.review.count({ where: { status: "PENDING" } }),
  ]);

  return {
    patients,
    doctors,
    pendingDoctors,
    hospitals,
    appointmentsTotal,
    appointmentsToday,
    revenue30d: revenueAgg._sum.amount ?? 0,
    paidCount30d: revenueAgg._count._all,
    statusCounts: Object.fromEntries(statusCounts.map((s) => [s.status, s._count._all])),
    reviewsPending,
  };
}

/** Daily appointment counts for the last `days` days, zero-filled. */
export async function getAppointmentTrend(days = 30) {
  const from = addDays(startOfLocalDay(new Date()), -days + 1);
  const rows = await prisma.appointment.findMany({
    where: { createdAt: { gte: from } },
    select: { createdAt: true, status: true, fee: true },
  });

  const buckets = new Map<string, { date: string; booked: number; completed: number; revenue: number }>();
  for (let i = 0; i < days; i++) {
    const key = dateKey(addDays(from, i));
    buckets.set(key, { date: key, booked: 0, completed: 0, revenue: 0 });
  }
  for (const r of rows) {
    const b = buckets.get(dateKey(r.createdAt));
    if (!b) continue;
    b.booked++;
    if (r.status === "COMPLETED") {
      b.completed++;
      b.revenue += r.fee;
    }
  }
  return [...buckets.values()];
}

export async function getDoctorStats(doctorId: string) {
  const today = startOfLocalDay(new Date());
  const monthAgo = addDays(today, -30);

  const [todayCount, upcoming, completed30d, earnings, rating, noShows] = await Promise.all([
    prisma.appointment.count({
      where: {
        doctorId,
        scheduledAt: { gte: today, lt: addDays(today, 1) },
        status: { in: ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS", "COMPLETED"] },
      },
    }),
    prisma.appointment.count({
      where: { doctorId, scheduledAt: { gte: new Date() }, status: { in: ["PENDING", "CONFIRMED"] } },
    }),
    prisma.appointment.count({
      where: { doctorId, status: "COMPLETED", completedAt: { gte: monthAgo } },
    }),
    prisma.payment.aggregate({
      where: { status: "PAID", paidAt: { gte: monthAgo }, appointment: { doctorId } },
      _sum: { amount: true },
    }),
    prisma.doctor.findUnique({
      where: { id: doctorId },
      select: { avgRating: true, reviewCount: true, satisfactionScore: true, completedVisits: true },
    }),
    prisma.appointment.count({ where: { doctorId, status: "NO_SHOW", scheduledAt: { gte: monthAgo } } }),
  ]);

  return {
    todayCount,
    upcoming,
    completed30d,
    earnings30d: earnings._sum.amount ?? 0,
    avgRating: rating?.avgRating ?? 0,
    reviewCount: rating?.reviewCount ?? 0,
    satisfactionScore: rating?.satisfactionScore ?? 0,
    completedVisits: rating?.completedVisits ?? 0,
    noShows30d: noShows,
  };
}
