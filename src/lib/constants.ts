export const APP_NAME = "MediBook";
export const APP_TAGLINE = "Pakistan ka smart doctor booking platform";
export const TIMEZONE = process.env.TZ_DEFAULT || "Asia/Karachi";
export const CURRENCY = "PKR";

export const PAKISTAN_CITIES = [
  "Lahore",
  "Karachi",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Gujranwala",
  "Sialkot",
  "Hyderabad",
  "Bahawalpur",
  "Sargodha",
  "Abbottabad",
] as const;

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export const LANGUAGES = [
  "Urdu",
  "English",
  "Punjabi",
  "Pashto",
  "Sindhi",
  "Balochi",
  "Saraiki",
] as const;

export const FREQUENCIES = [
  "OD (once daily)",
  "BD (twice daily)",
  "TDS (three times daily)",
  "QID (four times daily)",
  "SOS (as needed)",
  "Weekly",
] as const;

/** Routes each role lands on after login. */
export const ROLE_HOME: Record<string, string> = {
  PATIENT: "/dashboard",
  DOCTOR: "/doctor",
  HOSPITAL_ADMIN: "/admin",
  ADMIN: "/admin",
};
