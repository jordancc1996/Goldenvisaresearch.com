import { getCollection } from "astro:content";
import { categoryLabel } from "./article-display";
import { readHero, type ArticleHero } from "./load-article";
import {
  filterNews,
  filterReports,
  isArchiveEntry,
  pagePaths,
  splitFeatured,
  type ArchiveStory,
  type NewsArchiveSlug,
  type ResearchArchiveSlug,
} from "./archive";
import { referenceId, sortByDate } from "./content";
import { markedLabel } from "./placeholder-marks";
import { showsDemonstrationContent } from "./preview-mode";
import { researchTypeLabels, type ResearchType } from "./content-schema";

async function countryNames() {
  const countries = await getCollection("countries");
  return new Map(
    countries.map((country) => [
      country.id,
      {
        name: country.data.name,
        href: isArchiveEntry(country) ? `/countries/${country.id}` : undefined,
      },
    ]),
  );
}

function linkedCountries(
  refs: { id: string }[] | string[],
  names: Map<string, { name: string; href?: string }>,
) {
  return refs.map((ref) => {
    const id = referenceId(ref);
    const country = names.get(id);
    return { name: country?.name ?? id, href: country?.href };
  });
}

function listedEntries<T extends Parameters<typeof isArchiveEntry>[0]>(entries: T[]): T[] {
  if (!showsDemonstrationContent()) return entries.filter((entry) => isArchiveEntry(entry));
  return entries.filter((entry) => entry.data.comparison !== true);
}

export async function loadPublishedNews(): Promise<ArchiveStory[]> {
  const [news, names] = await Promise.all([getCollection("news"), countryNames()]);
  return Promise.all(
    sortByDate(listedEntries(news)).map(async (entry) => ({
    id: entry.id,
    href: `/news/${entry.id}`,
    title: entry.data.title,
    summary: entry.data.description,
    category: entry.data.category ?? "news",
    categoryLabel: markedLabel("news", entry.id, categoryLabel(entry.data.category, "News")),
    publishedAt: entry.data.publishedAt,
    updatedAt: entry.data.updatedAt,
    countries: linkedCountries(entry.data.countries, names),
    topic: entry.data.topic,
    desk: !isArchiveEntry(entry),
    hero: await readHero(entry.data.hero),
  })),
  );
}

export async function loadPublishedReports(): Promise<ArchiveStory[]> {
  const [reports, names] = await Promise.all([getCollection("reports"), countryNames()]);
  return Promise.all(
    sortByDate(listedEntries(reports)).map(async (entry) => {
    const researchType = entry.data.researchType as ResearchType | undefined;
    return {
      id: entry.id,
      href: `/reports/${entry.id}`,
      title: entry.data.title,
      summary: entry.data.description,
      category: entry.data.category ?? "research",
      categoryLabel: markedLabel(
        "reports",
        entry.id,
        researchType ? researchTypeLabels[researchType] : categoryLabel(entry.data.category, "Research"),
      ),
      publishedAt: entry.data.publishedAt,
      updatedAt: entry.data.updatedAt,
      countries: linkedCountries(entry.data.countries, names),
      topic: entry.data.topic,
      finding: entry.data.findings[0],
      researchType,
      featured: entry.data.featured === true,
      desk: !isArchiveEntry(entry),
      hero: await readHero(entry.data.hero),
    };
  }),
  );
}

export type HomeStory = ArchiveStory & {
  hero?: ArticleHero;
};

export async function loadHomeNews(): Promise<HomeStory[]> {
  return loadPublishedNews();
}

export async function loadHomeReports(): Promise<HomeStory[]> {
  return loadPublishedReports();
}

export async function loadPublishedPress(): Promise<HomeStory[]> {
  const [releases, names] = await Promise.all([getCollection("press"), countryNames()]);
  return Promise.all(
    sortByDate(releases.filter((entry) => isArchiveEntry(entry))).map(async (entry) => ({
    id: entry.id,
    href: `/press/${entry.id}`,
    title: entry.data.title,
    summary: entry.data.description,
    category: "press",
    categoryLabel: markedLabel("press", entry.id, "Press release"),
    publishedAt: entry.data.publishedAt,
    updatedAt: entry.data.updatedAt,
    countries: linkedCountries(entry.data.countries, names),
    topic: entry.data.topic,
    hero: await readHero(entry.data.hero),
  })),
  );
}

export async function pressPagePaths() {
  const releases = await loadPublishedPress();
  return pagePaths(releases.length);
}

export async function newsPagePaths(category?: NewsArchiveSlug) {
  const stories = await loadPublishedNews();
  return pagePaths(filterNews(stories, category).length);
}

export async function reportPagePaths(type?: ResearchArchiveSlug) {
  const stories = await loadPublishedReports();
  return pagePaths(splitFeatured(filterReports(stories, type)).rest.length);
}
