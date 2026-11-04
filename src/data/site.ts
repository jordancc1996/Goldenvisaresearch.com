/**
 * Site-wide constants.
 * The production origin stays empty until a domain is verified.
 * Contact details and form IDs are not stored here.
 */
function httpsEndpoint(name: string): string | null {
  const value = process.env[name];
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.startsWith("https://") ? trimmed : null;
}

export const site = {
  name: "Golden Visa Research",
  description: "Independent investment migration research and news.",
  locale: "en",
  origin: null as string | null,
  trailingSlash: "never" as const,
  /**
   * Form provider endpoints stay empty until a real Formspree form ID is approved.
   * A placeholder ID must not be added here.
   * Article inquiries use INQUIRY_FORM_ENDPOINT when it is an https URL.
   */
  forms: {
    newsletter: null as string | null,
    contact: null as string | null,
    correction: null as string | null,
    inquiry: httpsEndpoint("INQUIRY_FORM_ENDPOINT"),
  },
};

export function canonicalPath(pathname: string): string {
  if (pathname === "/") return "/";
  const trimmed = pathname.replace(/\/+$/, "");
  return site.trailingSlash === "never" ? trimmed : `${trimmed}/`;
}

export function canonicalUrl(pathname: string): string | null {
  if (!site.origin) return null;
  return new URL(canonicalPath(pathname), site.origin).href;
}
