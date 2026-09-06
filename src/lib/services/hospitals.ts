import "server-only";
import { prisma } from "@/lib/prisma";

export async function listHospitals(city?: string, q?: string) {
  return prisma.hospital.findMany({
    where: {
      isActive: true,
      ...(city ? { city } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { area: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ isVerified: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      type: true,
      city: true,
      area: true,
      address: true,
      phone: true,
      facilities: true,
      isVerified: true,
      _count: { select: { doctors: { where: { isActive: true } } } },
    },
  });
}

export async function getHospitalBySlug(slug: string) {
  return prisma.hospital.findFirst({
    where: { slug, isActive: true },
    include: {
      doctors: {
        where: { isActive: true, doctor: { verificationStatus: "APPROVED" } },
        orderBy: { consultationFee: "asc" },
        select: {
          id: true,
          consultationFee: true,
          doctor: {
            select: {
              id: true,
              slug: true,
              yearsOfExperience: true,
              avgRating: true,
              reviewCount: true,
              satisfactionScore: true,
              avgWaitMinutes: true,
              videoConsultEnabled: true,
              verifiedAt: true,
              user: { select: { name: true, image: true } },
              specialties: { select: { isPrimary: true, specialty: { select: { name: true } } } },
            },
          },
        },
      },
    },
  });
}

export async function listHospitalCities() {
  const rows = await prisma.hospital.groupBy({
    by: ["city"],
    where: { isActive: true },
    _count: { city: true },
    orderBy: { _count: { city: "desc" } },
  });
  return rows.map((r) => ({ city: r.city, count: r._count.city }));
}

export async function listSpecialtiesWithCounts() {
  const specialties = await prisma.specialty.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      icon: true,
      description: true,
      symptoms: { select: { name: true }, orderBy: { name: "asc" }, take: 6 },
      _count: { select: { doctors: true } },
    },
  });
  return specialties;
}
