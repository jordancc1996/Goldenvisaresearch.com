import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { z } from "astro/zod";
import { site } from "../data/site.ts";
import { isArchiveEntry, newsArchiveCategories, researchArchiveTypes } from "./archive.ts";
import { visibleAuthorInProduction, type ContentRecord } from "./content.ts";
import {
  authorSchema,
  countryInputSchema,
  newsInputSchema,
  pressInputSchema,
  programInputSchema,
  reportInputSchema,
  topicSlugs,
  type TopicSlug,
} from "./content-schema.ts";
import { splitFrontmatter } from "./publish-audit.ts";

const utilityPaths = new Set(["/thanks", "/foundation", "/404", "/search"]);

const newsCategorySlugs = new Set<string>(newsArchiveCategories.map((item) => item.slug));
const researchTypeSlugs = new Set<string>(researchArchiveTypes.map((item) => item.slug));
const topicSlugSet = new Set<string>(topicSlugs);

export type IndexRef = {
  id: string;
  category?: string;
  topic?: string;
  researchType?: string;
  countryId?: string;
  countryIds: string[];
};

export type IndexInventory = {
  news: IndexRef[];
  reports: IndexRef[];
  programs: IndexRef[];
  countries: IndexRef[];
  authors: IndexRef[];
  press: IndexRef[];
  newsletterConfigured: boolean;
  contactConfigured: boolean;
};

type Countable = ContentRecord<{
  publishedAt: Date;
  draft?: boolean;
  material?: "demonstration" | "reported";
  developmentOnly?: boolean;
  verification?: { status?: string };
  comparison?: boolean;
}>;

export function recordCountsForIndex(entry: Countable): boolean {
  return isArchiveEntry(entry);
}

export function authorCountsForIndex(
  entry: ContentRecord<{
    draft?: boolean;
    developmentOnly?: boolean;
    material?: "demonstration" | "reported";
    verification?: { status?: string };
  }>,
): boolean {
  return visibleAuthorInProduction(entry);
}

export function indexInventory(partial: Partial<IndexInventory> = {}): IndexInventory {
  return {
    news: partial.news ?? [],
    reports: partial.reports ?? [],
    programs: partial.programs ?? [],
    countries: partial.countries ?? [],
    authors: partial.authors ?? [],
    press: partial.press ?? [],
    newsletterConfigured: partial.newsletterConfigured ?? false,
    contactConfigured: partial.contactConfigured ?? false,
  };
}

function normalizePathname(value: string): string {
  const pathname = value.includes("://") ? new URL(value).pathname : value;
  const withoutHtml = pathname.replace(/\.html$/, "");
  if (withoutHtml.length > 1 && withoutHtml.endsWith("/")) return withoutHtml.slice(0, -1);
  return withoutHtml || "/";
}

function sectionPath(pathname: string): string {
  return normalizePathname(pathname).replace(/\/page\/\d+$/, "");
}

function configured(value: string | null): boolean {
  return typeof value === "string" && value.length > 0;
}

function displayedPrograms(inventory: IndexInventory): IndexRef[] {
  const countries = new Set(inventory.countries.map((item) => item.id));
  return inventory.programs.filter((item) => item.countryId !== undefined && countries.has(item.countryId));
}

function topicHasDisplayedCoverage(inventory: IndexInventory, topic: string): boolean {
  if (inventory.news.some((item) => item.topic === topic)) return true;
  if (inventory.reports.some((item) => item.topic === topic)) return true;
  if (inventory.countries.some((item) => item.topic === topic)) return true;
  const publishedCountries = new Set(inventory.countries.map((item) => item.id));
  for (const item of [...inventory.news, ...inventory.reports, ...inventory.programs]) {
    if (item.topic !== topic) continue;
    if (item.countryId && publishedCountries.has(item.countryId)) return true;
    if (item.countryIds.some((id) => publishedCountries.has(id))) return true;
  }
  return false;
}

/**
 * True when this path may be indexed after a canonical origin is configured.
 * Empty editorial routes stay false until they display a published record.
 * Drafts never count. /contact stays false until its form endpoint is set.
 * /newsletter stays false until its form endpoint is set.
 * /corrections stays eligible: the corrections policy is the page, and the
 * empty log is the current record. The corrections form is separate and does
 * not send while its endpoint is empty.
 */
export function sectionIndexable(pathname: string, inventory: IndexInventory): boolean {
  const path = sectionPath(pathname);
  if (utilityPaths.has(path)) return false;
  if (path === "/llms.txt" || path === "/content-index.json" || path.startsWith("/content/")) return false;
  if (path === "/newsletter") return inventory.newsletterConfigured;
  if (path === "/contact") return inventory.contactConfigured;
  if (path === "/news") return inventory.news.length > 0;
  if (path.startsWith("/news/")) {
    const slug = path.slice("/news/".length);
    if (newsCategorySlugs.has(slug)) return inventory.news.some((item) => item.category === slug);
    return inventory.news.some((item) => item.id === slug);
  }
  if (path === "/reports") return inventory.reports.length > 0;
  if (path.startsWith("/reports/")) {
    const slug = path.slice("/reports/".length);
    if (researchTypeSlugs.has(slug)) return inventory.reports.some((item) => item.researchType === slug);
    return inventory.reports.some((item) => item.id === slug);
  }
  if (path === "/countries") return inventory.countries.length > 0;
  if (path.startsWith("/countries/")) {
    const slug = path.slice("/countries/".length);
    return inventory.countries.some((item) => item.id === slug);
  }
  if (path === "/programs" || path === "/tracker") return displayedPrograms(inventory).length > 0;
  if (path.startsWith("/programs/")) {
    const slug = path.slice("/programs/".length);
    return displayedPrograms(inventory).some((item) => item.id === slug);
  }
  if (path.startsWith("/topics/")) {
    const slug = path.slice("/topics/".length);
    if (!topicSlugSet.has(slug)) return false;
    return topicHasDisplayedCoverage(inventory, slug as TopicSlug);
  }
  if (path.startsWith("/authors/")) {
    const slug = path.slice("/authors/".length);
    return inventory.authors.some((item) => item.id === slug);
  }
  if (path === "/press") return inventory.press.length > 0;
  if (path.startsWith("/press/")) {
    const slug = path.slice("/press/".length);
    if (!slug || slug.includes("/")) return false;
    return inventory.press.some((item) => item.id === slug);
  }
  return true;
}

function contentFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...contentFiles(full));
    else if (entry.isFile() && /\.mdx?$/.test(entry.name)) found.push(full);
  }
  return found;
}

function entryId(directory: string, file: string): string {
  return path.relative(directory, file).replaceAll("\\", "/").replace(/\.mdx?$/, "");
}

function toRef(id: string, data: Record<string, unknown>): IndexRef {
  const countries = Array.isArray(data.countries)
    ? data.countries.filter((item): item is string => typeof item === "string")
    : [];
  return {
    id,
    category: typeof data.category === "string" ? data.category : undefined,
    topic: typeof data.topic === "string" ? data.topic : undefined,
    researchType: typeof data.researchType === "string" ? data.researchType : undefined,
    countryId: typeof data.country === "string" ? data.country : undefined,
    countryIds: countries,
  };
}

function publishedRefs(directory: string, schema: z.ZodType, kind: "record" | "author"): IndexRef[] {
  const root = path.join(process.cwd(), "src", "content", directory);
  const refs: IndexRef[] = [];
  for (const file of contentFiles(root)) {
    const parsed = schema.safeParse(splitFrontmatter(readFileSync(file, "utf8")).data);
    if (!parsed.success) continue;
    const data = parsed.data as Record<string, unknown>;
    const entry = { id: entryId(root, file), data };
    const counts =
      kind === "author"
        ? authorCountsForIndex(entry as Parameters<typeof authorCountsForIndex>[0])
        : recordCountsForIndex(entry as Countable);
    if (!counts) continue;
    refs.push(toRef(entry.id, data));
  }
  return refs;
}

let cachedInventory: IndexInventory | undefined;

export function loadPublicationInventory(): IndexInventory {
  if (cachedInventory) return cachedInventory;
  cachedInventory = indexInventory({
    news: publishedRefs("news", newsInputSchema, "record"),
    reports: publishedRefs("reports", reportInputSchema, "record"),
    programs: publishedRefs("programs", programInputSchema, "record"),
    countries: publishedRefs("countries", countryInputSchema, "record"),
    authors: publishedRefs("authors", authorSchema, "author"),
    press: publishedRefs("press", pressInputSchema, "record"),
    newsletterConfigured: configured(site.forms.newsletter),
    contactConfigured: configured(site.forms.contact),
  });
  return cachedInventory;
}

export function routeIndexable(pathname: string): boolean {
  return sectionIndexable(pathname, loadPublicationInventory());
}
