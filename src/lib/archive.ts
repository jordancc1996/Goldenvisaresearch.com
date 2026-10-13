import { visibleInProduction, type ContentRecord } from "./content.ts";
import {
  regions,
  regionLabels,
  type Region,
  type ResearchType,
} from "./content-schema.ts";

export const archivePageSize = 20;

export const newsArchiveCategories = [
  {
    slug: "policy",
    label: "Policy",
    description: "Policy articles in the news archive.",
  },
  {
    slug: "legislation",
    label: "Legislation",
    description: "Legislation articles in the news archive.",
  },
  {
    slug: "regulation",
    label: "Regulation",
    description: "Regulation articles in the news archive.",
  },
] as const;

export type NewsArchiveSlug = (typeof newsArchiveCategories)[number]["slug"];

export const researchArchiveTypes = [
  {
    slug: "policy-analysis",
    label: "Policy analysis",
    description: "Policy analysis reports in the research archive.",
  },
  {
    slug: "market-research",
    label: "Market research",
    description: "Market research reports in the research archive.",
  },
  {
    slug: "country-research",
    label: "Country research",
    description: "Country research reports in the research archive.",
  },
] as const;

export type ResearchArchiveSlug = (typeof researchArchiveTypes)[number]["slug"];

const reservedSlugs: Record<string, readonly string[]> = {
  news: ["policy", "legislation", "regulation", "page"],
  reports: ["policy-analysis", "market-research", "country-research", "page"],
  press: ["page"],
};

export type ArchiveStory = {
  id: string;
  href: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  publishedAt: Date;
  updatedAt?: Date;
  countries: { name: string; href?: string }[];
  topic?: string;
  finding?: string;
  researchType?: ResearchType;
  featured?: boolean;
  desk?: boolean;
  hero?: {
    src: import("astro").ImageMetadata;
    alt: string;
    caption: string;
    credit: string;
    focal?: string;
  };
};

export type CountryArchiveRow = {
  name: string;
  region: Region;
  regionLabel: string;
};

type ArchiveRecord = {
  publishedAt: Date;
  draft?: boolean;
  featured?: boolean;
  material?: "demonstration" | "reported";
  verification?: { status?: string };
  developmentOnly?: boolean;
  comparison?: boolean;
};

export function isArchiveEntry(entry: ContentRecord<ArchiveRecord>): boolean {
  return visibleInProduction(entry) && entry.data.comparison !== true;
}

export function reservedArchiveSlug(collection: string, id: string): boolean {
  return (reservedSlugs[collection] ?? []).includes(id);
}

export function paginate<T>(items: T[], page: number, size = archivePageSize) {
  const pages = items.length === 0 ? 0 : Math.ceil(items.length / size);
  const current = pages === 0 ? 1 : Math.min(Math.max(page, 1), pages);
  const start = (current - 1) * size;
  return {
    page: current,
    pages,
    total: items.length,
    items: items.slice(start, start + size),
  };
}

export function pagePaths(total: number, size = archivePageSize) {
  const pages = Math.ceil(total / size);
  const paths: { params: { page: string } }[] = [];
  for (let page = 2; page <= pages; page += 1) {
    paths.push({ params: { page: String(page) } });
  }
  return paths;
}

export function archiveHref(base: string, page: number): string {
  return page > 1 ? `${base}/page/${page}` : base;
}

export function paginationLinks(base: string, page: number, pages: number) {
  if (pages < 2) {
    return { prev: undefined, next: undefined, links: [] as { page: number; href: string; current: boolean }[] };
  }
  const links = Array.from({ length: pages }, (_, index) => {
    const number = index + 1;
    return { page: number, href: archiveHref(base, number), current: number === page };
  });
  return {
    prev: page > 1 ? archiveHref(base, page - 1) : undefined,
    next: page < pages ? archiveHref(base, page + 1) : undefined,
    links,
  };
}

export function filterNews(stories: ArchiveStory[], category?: string): ArchiveStory[] {
  if (!category) return stories;
  return stories.filter((story) => story.category === category);
}

export function filterReports(stories: ArchiveStory[], researchType?: string): ArchiveStory[] {
  if (!researchType) return stories;
  return stories.filter((story) => story.researchType === researchType);
}

export function splitFeatured<T extends { id: string; featured?: boolean }>(stories: T[]) {
  const featured = stories.find((story) => story.featured === true);
  const rest = featured ? stories.filter((story) => story.id !== featured.id) : stories;
  return { featured, rest };
}

export function filterCountries<T extends CountryArchiveRow>(
  rows: T[],
  query: string,
  region: string,
): T[] {
  const needle = query.trim().toLowerCase();
  return rows.filter((row) => {
    if (region && region !== "all" && row.region !== region) return false;
    if (needle && !row.name.toLowerCase().includes(needle)) return false;
    return true;
  });
}

export function groupCountries<T extends CountryArchiveRow>(rows: T[]) {
  return regions
    .map((region) => ({
      region,
      label: regionLabels[region],
      rows: rows
        .filter((row) => row.region === region)
        .sort((left, right) => left.name.localeCompare(right.name, "en")),
    }))
    .filter((group) => group.rows.length > 0);
}
