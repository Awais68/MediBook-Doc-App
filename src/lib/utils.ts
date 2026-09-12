import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { TIMEZONE } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPKR(amount: number | null | undefined, opts?: { free?: string }) {
  if (amount === null || amount === undefined) return "—";
  if (amount === 0) return opts?.free ?? "Free";
  return `Rs. ${new Intl.NumberFormat("en-PK").format(amount)}`;
}

const dtf = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-PK", { timeZone: TIMEZONE, ...options });

export function formatDate(date: Date | string) {
  return dtf({ day: "numeric", month: "short", year: "numeric" }).format(new Date(date));
}

export function formatTime(date: Date | string) {
  return dtf({ hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(date));
}

export function formatDateTime(date: Date | string) {
  return `${formatDate(date)}, ${formatTime(date)}`;
}

export function formatDayDate(date: Date | string) {
  return dtf({ weekday: "short", day: "numeric", month: "short" }).format(new Date(date));
}

/** "in 2 days" / "3 hours ago" */
export function relativeTime(date: Date | string) {
  const diff = new Date(date).getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536e6],
    ["month", 2592e6],
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export function initials(name?: string | null) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/** Human-friendly, unambiguous booking code: MB-7QK4X2 */
export function generateCode(prefix = "MB") {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I
  let out = "";
  // Math.random is predictable; Web Crypto is available in Node and browsers.
  // 256 % 32 === 0, so `byte % 32` is unbiased.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(6));
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}-${out}`;
}

export function calculateAge(dob: Date | string | null | undefined) {
  if (!dob) return null;
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** Normalise Pakistani numbers to E.164: 03001234567 -> +923001234567 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  if (/^\+92\d{10}$/.test(digits)) return digits;
  if (/^92\d{10}$/.test(digits)) return `+${digits}`;
  if (/^0\d{10}$/.test(digits)) return `+92${digits.slice(1)}`;
  if (/^3\d{9}$/.test(digits)) return `+92${digits}`;
  return null;
}

export function maskPhone(phone?: string | null) {
  if (!phone) return "";
  return phone.replace(/^(\+92)(\d{3})(\d{4})(\d{3})$/, "$1 $2 ****$4");
}

export function pluralize(n: number, singular: string, plural = `${singular}s`) {
  return `${n} ${n === 1 ? singular : plural}`;
}
