import "server-only";
import { Prisma, type Gender } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getNextAvailable } from "@/lib/services/availability";

export type DoctorSort = "relevance" | "fee_low" | "fee_high" | "rating" | "experience" | "reviews";

export type DoctorSearchParams = {
  q?: string;
  city?: string;
  specialty?: string; // slug
  hospital?: string; // slug
  gender?: Gender;
  minFee?: number;
  maxFee?: number;
  minRating?: number;
  language?: string;
  videoOnly?: boolean;
  sort?: DoctorSort;
  page?: number;
  perPage?: number;
};

const ORDER: Record<DoctorSort, Prisma.DoctorOrderByWithRelationInput[]> = {
  relevance: [{ avgRating: "desc" }, { reviewCount: "desc" }, { completedVisits: "desc" }],
  rating: [{ avgRating: "desc" }, { reviewCount: "desc" }],
  reviews: [{ reviewCount: "desc" }, { avgRating: "desc" }],
  experience: [{ yearsOfExperience: "desc" }, { avgRating: "desc" }],
  fee_low: [{ avgRating: "desc" }], // fee sort is applied after fetch (fee lives per-location)
  fee_high: [{ avgRating: "desc" }],
};

export async function searchDoctors(params: DoctorSearchParams) {
  const page = Math.max(1, params.page ?? 1);
  const perPage = Math.min(params.perPage ?? 12, 48);
  const sort = params.sort ?? "relevance";

  // Free-text also matches specialties and symptoms, so "chest pain" finds cardiologists.
  const textFilter: Prisma.DoctorWhereInput | undefined = params.q
    ? {
        OR: [
          { user: { name: { contains: params.q, mode: "insensitive" } } },
          { bio: { contains: params.q, mode: "insensitive" } },
          {
            specialties: {
              some: {
                specialty: {
                  OR: [
                    { name: { contains: params.q, mode: "insensitive" } },
                    { symptoms: { some: { name: { contains: params.q, mode: "insensitive" } } } },
                  ],
                },
              },
            },
          },
          {
            hospitals: {
              some: { hospital: { name: { contains: params.q, mode: "insensitive" } } },
            },
          },
        ],
      }
    : undefined;

  const locationFilter: Prisma.DoctorHospitalWhereInput = {
    isActive: true,
    ...(params.city ? { hospital: { city: { equals: params.city, mode: "insensitive" } } } : {}),
    ...(params.hospital ? { hospital: { slug: params.hospital } } : {}),
    ...(params.minFee !== undefined || params.maxFee !== undefined
      ? {
          consultationFee: {
            ...(params.minFee !== undefined ? { gte: params.minFee } : {}),
            ...(params.maxFee !== undefined ? { lte: params.maxFee } : {}),
          },
        }
      : {}),
  };

  const where: Prisma.DoctorWhereInput = {
    verificationStatus: "APPROVED",
    isAcceptingPatients: true,
    user: { isActive: true, ...(params.gender ? { gender: params.gender } : {}) },
    hospitals: { some: locationFilter },
    ...(params.specialty ? { specialties: { some: { specialty: { slug: params.specialty } } } } : {}),
    ...(params.minRating ? { avgRating: { gte: params.minRating } } : {}),
    ...(params.language ? { languages: { has: params.language } } : {}),
    ...(params.videoOnly ? { videoConsultEnabled: true } : {}),
    ...(textFilter ?? {}),
  };

  const [total, doctors] = await Promise.all([
    prisma.doctor.count({ where }),
    prisma.doctor.findMany({
      where,
      orderBy: ORDER[sort],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        slug: true,
        bio: true,
        yearsOfExperience: true,
        avgRating: true,
        reviewCount: true,
        completedVisits: true,
        satisfactionScore: true,
        avgWaitMinutes: true,
        videoConsultEnabled: true,
        videoConsultFee: true,
        languages: true,
        user: { select: { name: true, image: true, gender: true, city: true } },
        specialties: {
          select: { isPrimary: true, specialty: { select: { name: true, slug: true } } },
        },
        hospitals: {
          where: locationFilter,
          select: {
            id: true,
            consultationFee: true,
            followUpFee: true,
            hospital: { select: { id: true, name: true, slug: true, city: true, area: true } },
          },
          orderBy: { consultationFee: "asc" },
        },
      },
    }),
  ]);

  const rows = doctors.map((d) => ({
    ...d,
    minFee: d.hospitals.length ? Math.min(...d.hospitals.map((h) => h.consultationFee)) : null,
  }));

  if (sort === "fee_low") rows.sort((a, b) => (a.minFee ?? 1e9) - (b.minFee ?? 1e9));
  if (sort === "fee_high") rows.sort((a, b) => (b.minFee ?? -1) - (a.minFee ?? -1));

  return {
    doctors: rows,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getDoctorBySlug(slug: string) {
  return prisma.doctor.findFirst({
    where: { slug, verificationStatus: "APPROVED" },
    select: {
      id: true,
      slug: true,
      bio: true,
      pmdcNumber: true,
      yearsOfExperience: true,
      languages: true,
      avgRating: true,
      reviewCount: true,
      completedVisits: true,
      satisfactionScore: true,
      avgWaitMinutes: true,
      isAcceptingPatients: true,
      videoConsultEnabled: true,
      videoConsultFee: true,
      verifiedAt: true,
      user: {
        select: { id: true, name: true, image: true, gender: true, city: true },
      },
      specialties: {
        select: { isPrimary: true, specialty: { select: { name: true, slug: true } } },
      },
      educations: { orderBy: { year: "desc" } },
      experiences: { orderBy: { startYear: "desc" } },
      hospitals: {
        where: { isActive: true },
        select: {
          id: true,
          consultationFee: true,
          followUpFee: true,
          followUpValidDays: true,
          slotDurationMinutes: true,
          cancellationHours: true,
          acceptsCashAtClinic: true,
          acceptsOnlinePayment: true,
          roomNumber: true,
          hospital: true,
          schedules: { where: { isActive: true }, orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        },
        orderBy: { consultationFee: "asc" },
      },
    },
  });
}

export async function getDoctorReviews(doctorId: string, take = 10, skip = 0) {
  const [reviews, total, breakdown] = await Promise.all([
    prisma.review.findMany({
      where: { doctorId, status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        rating: true,
        bedsideManner: true,
        waitTimeScore: true,
        explanation: true,
        cleanliness: true,
        title: true,
        comment: true,
        isAnonymous: true,
        doctorReply: true,
        doctorRepliedAt: true,
        createdAt: true,
        patient: { select: { name: true, image: true } },
        appointment: { select: { scheduledAt: true, consultationType: true } },
      },
    }),
    prisma.review.count({ where: { doctorId, status: "PUBLISHED" } }),
    prisma.review.groupBy({
      by: ["rating"],
      where: { doctorId, status: "PUBLISHED" },
      _count: { rating: true },
    }),
  ]);

  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: breakdown.find((b) => b.rating === star)?._count.rating ?? 0,
  }));

  return { reviews, total, distribution };
}

/** Sidebar facets — computed from live data, not hardcoded. */
export async function getSearchFacets(city?: string) {
  const [specialties, cities, hospitals, feeRange] = await Promise.all([
    prisma.specialty.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        name: true,
        slug: true,
        icon: true,
        _count: { select: { doctors: true } },
      },
    }),
    prisma.hospital.findMany({
      where: { isActive: true },
      distinct: ["city"],
      select: { city: true },
      orderBy: { city: "asc" },
    }),
    prisma.hospital.findMany({
      where: { isActive: true, ...(city ? { city: { equals: city, mode: "insensitive" } } : {}) },
      select: { name: true, slug: true, city: true },
      orderBy: { name: "asc" },
      take: 60,
    }),
    prisma.doctorHospital.aggregate({
      where: { isActive: true },
      _min: { consultationFee: true },
      _max: { consultationFee: true },
    }),
  ]);

  return {
    specialties,
    cities: cities.map((c) => c.city),
    hospitals,
    minFee: feeRange._min.consultationFee ?? 0,
    maxFee: feeRange._max.consultationFee ?? 10000,
  };
}

export async function getFeaturedDoctors(limit = 8) {
  const doctors = await prisma.doctor.findMany({
    where: { verificationStatus: "APPROVED", isAcceptingPatients: true },
    orderBy: [{ avgRating: "desc" }, { reviewCount: "desc" }],
    take: limit,
    select: {
      id: true,
      slug: true,
      yearsOfExperience: true,
      avgRating: true,
      reviewCount: true,
      user: { select: { name: true, image: true } },
      specialties: { select: { specialty: { select: { name: true } } }, take: 1 },
      hospitals: {
        select: { consultationFee: true, hospital: { select: { name: true, city: true } } },
        orderBy: { consultationFee: "asc" },
        take: 1,
      },
    },
  });
  return doctors;
}

export { getNextAvailable };
