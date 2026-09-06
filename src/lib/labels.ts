import type { AppointmentStatus, ConsultationType, FacilityType, PaymentMethod, PaymentStatus, VerificationStatus } from "@prisma/client";

type Tone = "default" | "secondary" | "destructive" | "success" | "warning" | "outline" | "solid";

export const APPOINTMENT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending confirmation", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  CHECKED_IN: { label: "Checked in", tone: "default" },
  IN_PROGRESS: { label: "In progress", tone: "default" },
  COMPLETED: { label: "Completed", tone: "secondary" },
  CANCELLED_BY_PATIENT: { label: "Cancelled by you", tone: "destructive" },
  CANCELLED_BY_DOCTOR: { label: "Cancelled by clinic", tone: "destructive" },
  NO_SHOW: { label: "No show", tone: "destructive" },
  RESCHEDULED: { label: "Rescheduled", tone: "outline" },
};

export const PAYMENT_STATUS: Record<PaymentStatus, { label: string; tone: Tone }> = {
  UNPAID: { label: "Pay at clinic", tone: "warning" },
  PENDING: { label: "Payment pending", tone: "warning" },
  PAID: { label: "Paid", tone: "success" },
  REFUND_PENDING: { label: "Refund pending", tone: "warning" },
  REFUNDED: { label: "Refunded", tone: "secondary" },
  FAILED: { label: "Payment failed", tone: "destructive" },
};

export const PAYMENT_METHOD: Record<PaymentMethod, string> = {
  CASH_AT_CLINIC: "Cash at clinic",
  CARD: "Debit / Credit card",
  JAZZCASH: "JazzCash",
  EASYPAISA: "Easypaisa",
  BANK_TRANSFER: "Bank transfer",
};

export const VERIFICATION_STATUS: Record<VerificationStatus, { label: string; tone: Tone }> = {
  PENDING: { label: "Pending review", tone: "warning" },
  UNDER_REVIEW: { label: "Under review", tone: "default" },
  APPROVED: { label: "Verified", tone: "success" },
  REJECTED: { label: "Rejected", tone: "destructive" },
  SUSPENDED: { label: "Suspended", tone: "destructive" },
};

export const CONSULTATION_TYPE: Record<ConsultationType, string> = {
  IN_PERSON: "In-person",
  VIDEO: "Video consultation",
  HOME_VISIT: "Home visit",
};

/** Statuses a patient can still act on. */
export const LIVE_STATUSES: AppointmentStatus[] = ["PENDING", "CONFIRMED", "CHECKED_IN", "IN_PROGRESS"];

export const FACILITY_TYPE_LABEL: Record<FacilityType, string> = {
  HOSPITAL: "Hospital",
  CLINIC: "Clinic",
  DIAGNOSTIC_CENTER: "Diagnostic centre",
  PHARMACY: "Pharmacy",
};
