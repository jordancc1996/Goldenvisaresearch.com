import { showsDemonstrationContent } from "./preview-mode.ts";

type ImageRecord = {
  draft?: boolean;
  material?: string;
  developmentOnly?: boolean;
  verification?: { status?: string };
};

/**
 * Drafts, demonstration files, and incomplete verification must not add an image
 * to a normal production asset graph. Local development and a DESIGN_PREVIEW
 * build still resolve those images.
 */
export function shouldResolveContentImage(entry: ImageRecord, production: boolean): boolean {
  if (!production) return true;
  if (entry.draft !== false) return false;
  if (entry.developmentOnly === true) return false;
  if (entry.material === "demonstration") return false;
  if (entry.verification && entry.verification.status !== "verified") return false;
  return true;
}

export function omitPrivateContentImages(): boolean {
  const requested = typeof process !== "undefined" && process.env.DESIGN_PREVIEW === "true";
  const shown = showsDemonstrationContent();
  if (requested || shown) return false;
  if (typeof import.meta !== "undefined" && import.meta.env && typeof import.meta.env.PROD === "boolean") {
    return import.meta.env.PROD;
  }
  return process.env.NODE_ENV === "production";
}
