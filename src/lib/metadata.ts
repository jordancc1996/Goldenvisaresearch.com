import { canonicalUrl, site } from "../data/site.ts";
import { loadPublicationInventory, sectionIndexable, type IndexInventory } from "./indexability.ts";

const newsWindowMs = 2 * 24 * 60 * 60 * 1000;

export const privatePaths = ["/thanks", "/foundation", "/404", "/search"] as const;

export function documentTitle(heading: string): string {
  if (heading === site.name) return site.name;
  return `${heading} - ${site.name}`;
}

export function robotsDirectiveFor(
  env: { dev: boolean; origin: string | null },
  indexable: boolean,
): "noindex, nofollow" | "noindex, follow" | "index, follow" {
  if (env.dev) return "noindex, nofollow";
  if (!env.origin || !indexable) return "noindex, follow";
  return "index, follow";
}

export function allowInSitemap(pageUrl: string, inventory: IndexInventory = loadPublicationInventory()): boolean {
  return sectionIndexable(pageUrl, inventory);
}

export function withinNewsSitemapWindow(publishedAt: Date, now: Date): boolean {
  const age = now.getTime() - publishedAt.getTime();
  return age >= 0 && age <= newsWindowMs;
}

export function publicationGraph(origin: string | null): Record<string, unknown> | null {
  if (!origin) return null;
  const organization = {
    "@type": "Organization",
    name: site.name,
    url: origin,
    description: site.description,
  };
  return {
    "@context": "https://schema.org",
    "@graph": [
      organization,
      {
        "@type": "WebSite",
        name: site.name,
        url: origin,
        description: site.description,
        publisher: { "@type": "Organization", name: site.name, url: origin },
      },
    ],
  };
}

export type ArticleSchemaInput = {
  collection: "news" | "reports" | "programs" | "press";
  headline: string;
  description: string;
  canonical: string;
  publishedAt: Date;
  updatedAt?: Date;
  authors: { name: string; url?: string }[];
  organization?: string;
  origin: string;
  citations?: { name: string; url: string; organization?: string }[];
};

export function articleSchema(input: ArticleSchemaInput): Record<string, unknown> {
  const people = input.authors.filter((author) => author.name.length > 0);
  const issuingOrganization =
    input.collection === "press" && input.organization
      ? { "@type": "Organization", name: input.organization }
      : undefined;
  const author =
    people.length > 0
      ? people.map((person) => ({
          "@type": "Person",
          name: person.name,
          ...(person.url ? { url: person.url } : {}),
        }))
      : issuingOrganization;
  return {
    "@context": "https://schema.org",
    "@type": input.collection === "news" ? "NewsArticle" : "Article",
    headline: input.headline,
    description: input.description,
    datePublished: input.publishedAt.toISOString(),
    ...(input.updatedAt ? { dateModified: input.updatedAt.toISOString() } : {}),
    mainEntityOfPage: input.canonical,
    ...(input.collection === "press" ? { articleSection: "Press release" } : {}),
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: input.origin,
    },
    ...(author ? { author } : {}),
    ...(people.length > 0 && issuingOrganization ? { sourceOrganization: issuingOrganization } : {}),
    ...(input.citations && input.citations.length > 0
      ? {
          citation: input.citations.map((source) => ({
            "@type": "CreativeWork",
            name: source.name,
            url: source.url,
            ...(source.organization ? { publisher: source.organization } : {}),
          })),
        }
      : {}),
  };
}

export function personSchema(input: {
  name: string;
  url: string;
  description: string;
  sameAs?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.url,
    description: input.description,
    ...(input.sameAs ? { sameAs: input.sameAs } : {}),
  };
}

export function webPageSchema(input: {
  name: string;
  description: string;
  url: string;
  dateModified?: Date;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.name,
    description: input.description,
    url: input.url,
    ...(input.dateModified ? { dateModified: input.dateModified.toISOString() } : {}),
    isPartOf: { "@type": "WebSite", name: site.name, url: new URL(input.url).origin },
  };
}

export function canonicalFor(pathname: string): string | null {
  return canonicalUrl(pathname);
}

export function jsonLd(data: Record<string, unknown> | null): string | null {
  if (!data) return null;
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
