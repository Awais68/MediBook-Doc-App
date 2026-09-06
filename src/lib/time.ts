import { fromZonedTime, toZonedTime, formatInTimeZone } from "date-fns-tz";
import { TIMEZONE } from "./constants";

/** "09:30" -> 570 */
export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** 570 -> "09:30" */
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "09:30" -> "9:30 AM" */
export function prettyTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** ISO date key in clinic-local time: 2026-03-14 */
export function dateKey(date: Date): string {
  return formatInTimeZone(date, TIMEZONE, "yyyy-MM-dd");
}

/** Day of week (0=Sun) in clinic-local time. */
export function localDayOfWeek(date: Date): number {
  return Number(formatInTimeZone(date, TIMEZONE, "i")) % 7; // date-fns i: 1=Mon..7=Sun
}

/**
 * Combine a local calendar date + "HH:mm" clinic-local clock time into a UTC instant.
 * Everything in the DB is UTC; only this function decides what "9 AM in Lahore" means.
 */
export function zonedDateTime(dateKeyStr: string, hhmm: string): Date {
  return fromZonedTime(`${dateKeyStr}T${hhmm}:00`, TIMEZONE);
}

/** Midnight (clinic-local) of a given instant, as a UTC Date. */
export function startOfLocalDay(date: Date): Date {
  return zonedDateTime(dateKey(date), "00:00");
}

export function endOfLocalDay(date: Date): Date {
  return new Date(startOfLocalDay(date).getTime() + 24 * 60 * 60 * 1000 - 1);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

/** Local-time view of an instant, useful for rendering on the server. */
export function toLocal(date: Date): Date {
  return toZonedTime(date, TIMEZONE);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return dateKey(a) === dateKey(b);
}

/** Next N calendar days starting today (clinic-local), as date keys. */
export function upcomingDateKeys(days: number, from: Date = new Date()): string[] {
  return Array.from({ length: days }, (_, i) => dateKey(addDays(from, i)));
}
