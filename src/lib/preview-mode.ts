/**
 * Construction mode is the ordinary site while it is under construction.
 * It is on unless CONSTRUCTION_MODE is false, 0, or off.
 * Set CONSTRUCTION_MODE=false and rebuild to launch: placeholder stories
 * leave the pages, this notice leaves, and the published indexing rules return.
 * Astro inlines the value as globalThis.__CONSTRUCTION_MODE__.
 */
export const constructionNotice =
  "This website is under construction. Stories and figures are placeholders, not published reporting.";

export const placeholderNotice = "Placeholder. This page is not published reporting.";

export function constructionModeFromValue(raw: string | undefined): boolean {
  const value = raw?.trim().toLowerCase();
  if (value === "false" || value === "0" || value === "off") return false;
  return true;
}

export function constructionMode(): boolean {
  const flag = (globalThis as { __CONSTRUCTION_MODE__?: boolean }).__CONSTRUCTION_MODE__;
  if (flag === true || flag === false) return flag;
  const raw = typeof process !== "undefined" ? process.env.CONSTRUCTION_MODE : undefined;
  return constructionModeFromValue(raw);
}

export function showsDemonstrationContent(): boolean {
  return constructionMode();
}
