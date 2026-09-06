import { z } from "zod";
import { normalizePhone } from "@/lib/utils";

export const phoneSchema = z
  .string()
  .min(1, "Phone number is required")
  .transform((v, ctx) => {
    const normalized = normalizePhone(v);
    if (!normalized) {
      ctx.addIssue({ code: "custom", message: "Enter a valid Pakistani mobile number (03XX XXXXXXX)" });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters")
  .regex(/[a-z]/, "Include a lowercase letter")
  .regex(/[A-Z]/, "Include an uppercase letter")
  .regex(/[0-9]/, "Include a number");

export const registerSchema = z
  .object({
    name: z.string().min(2, "Enter your full name").max(80),
    email: z.email("Enter a valid email").toLowerCase(),
    phone: phoneSchema.optional(),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.email("Enter a valid email").toLowerCase(),
  password: z.string().min(1, "Enter your password"),
});

export const requestOtpSchema = z.object({ phone: phoneSchema });

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const forgotPasswordSchema = z.object({ email: z.email() });

export const resetPasswordSchema = z
  .object({
    email: z.email(),
    code: z.string().regex(/^\d{6}$/),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const bookingSchema = z.object({
  doctorHospitalId: z.string().min(1),
  startAt: z.iso.datetime(),
  consultationType: z.enum(["IN_PERSON", "VIDEO", "HOME_VISIT"]).default("IN_PERSON"),
  paymentMethod: z.enum(["CASH_AT_CLINIC", "CARD", "JAZZCASH", "EASYPAISA", "BANK_TRANSFER"]),
  reasonForVisit: z.string().max(300).optional(),
  patientNotes: z.string().max(1000).optional(),
  familyMemberId: z.string().optional().nullable(),
  parentAppointmentId: z.string().optional().nullable(),
});

export const cancelSchema = z.object({
  appointmentId: z.string().min(1),
  reason: z.string().max(300).optional(),
});

export const rescheduleSchema = z.object({
  appointmentId: z.string().min(1),
  startAt: z.iso.datetime(),
  doctorHospitalId: z.string().optional(),
});

export const reviewSchema = z.object({
  appointmentId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  bedsideManner: z.coerce.number().int().min(1).max(5).optional(),
  waitTimeScore: z.coerce.number().int().min(1).max(5).optional(),
  explanation: z.coerce.number().int().min(1).max(5).optional(),
  cleanliness: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().max(120).optional(),
  comment: z.string().max(2000).optional(),
  isAnonymous: z.boolean().default(false),
});

export const prescriptionItemSchema = z.object({
  drugName: z.string().min(1, "Medicine name is required").max(120),
  strength: z.string().max(40).optional(),
  form: z.string().max(40).optional(),
  dosage: z.string().max(60).optional(),
  frequency: z.string().max(60).optional(),
  durationDays: z.coerce.number().int().min(1).max(365).optional(),
  instructions: z.string().max(200).optional(),
});

export const consultationSchema = z.object({
  appointmentId: z.string().min(1),
  chiefComplaint: z.string().max(500).optional(),
  historyOfIllness: z.string().max(2000).optional(),
  examination: z.string().max(2000).optional(),
  diagnosis: z.string().max(500).optional(),
  clinicalNotes: z.string().max(4000).optional(),
  advice: z.string().max(2000).optional(),
  bloodPressure: z
    .string()
    .regex(/^\d{2,3}\/\d{2,3}$/, "Use the format 120/80")
    .optional()
    .or(z.literal("")),
  pulseBpm: z.coerce.number().int().min(20).max(250).optional(),
  temperatureC: z.coerce.number().min(30).max(45).optional(),
  spo2: z.coerce.number().int().min(50).max(100).optional(),
  weightKg: z.coerce.number().min(1).max(400).optional(),
  heightCm: z.coerce.number().min(30).max(260).optional(),
  bloodSugar: z.coerce.number().min(20).max(900).optional(),
  followUpAfterDays: z.coerce.number().int().min(1).max(365).optional().nullable(),
  followUpReason: z.string().max(300).optional(),
  prescriptionNotes: z.string().max(1000).optional(),
  medicines: z.array(prescriptionItemSchema).max(30).default([]),
  labTests: z
    .array(z.object({ testName: z.string().min(1).max(120), instructions: z.string().max(200).optional() }))
    .max(20)
    .default([]),
  markCompleted: z.boolean().default(false),
});

export const doctorApplicationSchema = z.object({
  pmdcNumber: z
    .string()
    .min(4, "Enter your PMDC registration number")
    .max(30)
    .regex(/^[A-Za-z0-9-]+$/, "Only letters, digits and dashes"),
  bio: z.string().min(40, "Write at least 40 characters so patients know you").max(2000),
  yearsOfExperience: z.coerce.number().int().min(0).max(70),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]),
  specialtyIds: z.array(z.string()).min(1, "Pick at least one specialty").max(4),
  languages: z.array(z.string()).min(1, "Pick at least one language"),
  educations: z
    .array(
      z.object({
        degree: z.string().min(2).max(60),
        institute: z.string().min(2).max(120),
        year: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional(),
      }),
    )
    .min(1, "Add at least one qualification"),
  experiences: z
    .array(
      z.object({
        title: z.string().min(2).max(100),
        organization: z.string().min(2).max(120),
        startYear: z.coerce.number().int().min(1950).max(new Date().getFullYear()),
        endYear: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional(),
        isCurrent: z.boolean().default(false),
      }),
    )
    .default([]),
  practice: z.object({
    hospitalId: z.string().min(1, "Choose where you practise"),
    consultationFee: z.coerce.number().int().min(0).max(200000),
    followUpFee: z.coerce.number().int().min(0).max(200000).default(0),
    followUpValidDays: z.coerce.number().int().min(1).max(180).default(14),
    slotDurationMinutes: z.coerce.number().int().min(5).max(120).default(15),
  }),
});

export const scheduleSchema = z.object({
  doctorHospitalId: z.string().min(1),
  dayOfWeek: z.coerce.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm"),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm"),
  slotDurationMinutes: z.coerce.number().int().min(5).max(120).optional(),
  maxPatients: z.coerce.number().int().min(1).max(200).optional(),
  consultationType: z.enum(["IN_PERSON", "VIDEO", "HOME_VISIT"]).default("IN_PERSON"),
});

export const timeOffSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  doctorHospitalId: z.string().optional().nullable(),
  isFullDay: z.boolean().default(true),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  reason: z.string().max(200).optional(),
});

export const patientProfileSchema = z.object({
  name: z.string().min(2).max(80),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  city: z.string().max(60).optional(),
  cnic: z
    .string()
    .regex(/^\d{5}-\d{7}-\d$/, "Format: 35202-1234567-1")
    .optional()
    .or(z.literal("")),
  bloodGroup: z.string().max(4).optional().or(z.literal("")),
  heightCm: z.coerce.number().int().min(30).max(260).optional(),
  weightKg: z.coerce.number().int().min(1).max(400).optional(),
  allergies: z.array(z.string().max(60)).max(30).default([]),
  chronicConditions: z.array(z.string().max(60)).max(30).default([]),
  currentMedications: z.array(z.string().max(80)).max(30).default([]),
  emergencyContactName: z.string().max(80).optional().or(z.literal("")),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
});

export const familyMemberSchema = z.object({
  name: z.string().min(2).max(80),
  relation: z.string().min(2).max(40),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  bloodGroup: z.string().max(4).optional().or(z.literal("")),
});

export const medicalRecordSchema = z.object({
  title: z.string().min(2).max(120),
  type: z.enum([
    "LAB_REPORT",
    "IMAGING",
    "PRESCRIPTION",
    "DISCHARGE_SUMMARY",
    "VACCINATION",
    "INSURANCE",
    "OTHER",
  ]),
  recordDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(1000).optional(),
  fileUrl: z.string().max(500).optional().or(z.literal("")),
  fileName: z.string().max(200).optional(),
});

export const hospitalSchema = z.object({
  name: z.string().min(2).max(140),
  type: z.enum(["HOSPITAL", "CLINIC", "DIAGNOSTIC_CENTER", "PHARMACY"]).default("HOSPITAL"),
  address: z.string().min(5).max(300),
  area: z.string().max(80).optional(),
  city: z.string().min(2).max(60),
  province: z.string().max(60).optional(),
  phone: z.string().max(30).optional(),
  email: z.email().optional().or(z.literal("")),
  description: z.string().max(1500).optional(),
  facilities: z.array(z.string().max(50)).max(30).default([]),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;
export type ConsultationFormInput = z.infer<typeof consultationSchema>;
export type DoctorApplicationInput = z.infer<typeof doctorApplicationSchema>;
