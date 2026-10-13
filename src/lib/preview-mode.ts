/**
 * Demonstration content is included in two places:
 * local `astro dev`, and a build started with DESIGN_PREVIEW=true.
 * A normal production build leaves the variable unset and keeps drafts out.
 * astro.config refuses the variable when VERCEL_ENV is production.
 * The build flag is inlined as globalThis.__DESIGN_PREVIEW__.
 */
export function showsDemonstrationContent(): boolean {
  if (typeof import.meta.env !== "undefined" && import.meta.env.DEV === true) return true;
  const flag = (globalThis as { __DESIGN_PREVIEW__?: boolean }).__DESIGN_PREVIEW__;
  return flag === true;
}
