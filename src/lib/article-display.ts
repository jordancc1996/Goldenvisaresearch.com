import {
  categoryLabels,
  programStatusLabels,
  programStatuses,
  programTypeLabels,
  type ProgramStatus,
} from "./content-schema.ts";

export const reviewWindowDays = 180;

export function formatArticleDate(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function categoryLabel(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const labels: Record<string, string> = categoryLabels;
  return labels[value] ?? fallback;
}

export type ReviewState = "unverified" | "current" | "review-due";

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function reviewState(
  verification: { status?: string; verifiedOn?: Date } | undefined,
  now = new Date(),
): ReviewState {
  if (!verification || verification.status !== "verified" || !verification.verifiedOn) {
    return "unverified";
  }
  const ageDays = Math.floor((utcDay(now) - utcDay(verification.verifiedOn)) / 86400000);
  if (ageDays > reviewWindowDays) return "review-due";
  return "current";
}

export function reviewNote(
  verification: { status?: string; verifiedOn?: Date } | undefined,
  now = new Date(),
): string {
  if (reviewState(verification, now) !== "review-due") return "";
  return `Review due. The verification date is outside the ${reviewWindowDays}-day review window, so this record is not presented as current.`;
}

export function displayedStatus(
  status: string,
  verification: { status?: string; verifiedOn?: Date } | undefined,
): ProgramStatus {
  if (reviewState(verification) === "unverified") return "unverified";
  if ((programStatuses as readonly string[]).includes(status)) return status as ProgramStatus;
  return "unverified";
}

export function programStatusLabel(status: string): string {
  const labels: Record<string, string> = programStatusLabels;
  return labels[status] ?? "Unverified";
}

export function recordStatusLabel(status: string): string {
  return programStatusLabel(status);
}

export function programTypeLabel(value: string): string {
  const labels: Record<string, string> = programTypeLabels;
  return labels[value] ?? "Unspecified";
}

export function verifiedLabel(verification: { status: string; verifiedOn?: Date }): string {
  if (verification.status === "verified" && verification.verifiedOn) {
    return formatArticleDate(verification.verifiedOn);
  }
  return "Not verified";
}

export function editorialDisclaimer(demonstration: boolean): string {
  if (demonstration) {
    return "This page is demonstration material for layout review. It is not legal, tax, or immigration advice. It does not report a government action, a legal requirement, or an investment amount.";
  }
  return "This page is research information. It is not legal, tax, or immigration advice.";
}
