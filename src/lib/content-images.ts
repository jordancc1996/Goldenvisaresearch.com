import { constructionMode } from "./preview-mode.ts";

type ImageRecord = {
  draft?: boolean;
  material?: string;
  developmentOnly?: boolean;
  verification?: { status?: string };
};

/**
 * A launched build omits draft and demonstration images.
 * Construction mode, the default, still resolves the placeholder figures.
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
  if (constructionMode()) return false;
  if (typeof import.meta !== "undefined" && import.meta.env && typeof import.meta.env.PROD === "boolean") {
    return import.meta.env.PROD;
  }
  return process.env.NODE_ENV === "production";
}
