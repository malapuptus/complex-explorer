/**
 * exportFilenames — pure helpers for deterministic, filesystem-safe export names.
 * Ticket 0259: bundle, package, CSV filenames include schema, mode, hash prefix, date.
 * No I/O. Safe to import in tests.
 */

const APP_SLUG = "cm"; // complex-mapper short slug

/** Sanitise a string for filesystem use: replace unsafe chars, collapse dashes. */
function sanitise(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** ISO date as YYYYMMDD (local time is fine for filenames). */
function datePart(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10).replace(/-/g, "");
}

/** HHmm time suffix. */
function timePart(d: Date = new Date()): string {
  return d.toISOString().slice(11, 16).replace(":", "");
}

/** Bundle filename: cm_rb_v3_<mode>_<hashPrefix>_<YYYYMMDD>T<HHmm>.json */
export function bundleFilename(opts: {
  mode: "full" | "minimal" | "redacted";
  /** sessionFingerprint or packageHash — 8–12 chars used */
  hashPrefix?: string | null;
  now?: Date;
}): string {
  const { mode, hashPrefix, now = new Date() } = opts;
  const hp = hashPrefix ? sanitise(hashPrefix.slice(0, 10)) : "";
  const parts = [APP_SLUG, "rb_v3", mode, ...(hp ? [hp] : []), `${datePart(now)}T${timePart(now)}`];
  return `${parts.join("_")}.json`;
}

/** Session package filename: cm_pkg_v1_<mode>_<hashPrefix>_<YYYYMMDD>T<HHmm>.json */
export function packageFilename(opts: {
  mode: "full" | "minimal" | "redacted";
  packageHash?: string | null;
  now?: Date;
}): string {
  const { mode, packageHash, now = new Date() } = opts;
  const hp = packageHash ? sanitise(packageHash.slice(0, 10)) : "";
  const parts = [APP_SLUG, "pkg_v1", mode, ...(hp ? [hp] : []), `${datePart(now)}T${timePart(now)}`];
  return `${parts.join("_")}.json`;
}

/** CSV filename: cm_csv_v1_<YYYYMMDD>T<HHmm>[_redacted].csv */
export function csvFilename(opts: {
  redacted?: boolean;
  now?: Date;
}): string {
  const { redacted = false, now = new Date() } = opts;
  const parts = [APP_SLUG, "csv_v1", `${datePart(now)}T${timePart(now)}`, ...(redacted ? ["redacted"] : [])];
  return `${parts.join("_")}.csv`;
}

/** Pack JSON filename: cm_pack_<id>_<version>_<YYYYMMDD>.json */
export function packFilename(opts: {
  id: string;
  version: string;
  now?: Date;
}): string {
  const { id, version, now = new Date() } = opts;
  const parts = [APP_SLUG, "pack", sanitise(id), sanitise(version), datePart(now)];
  return `${parts.join("_")}.json`;
}
