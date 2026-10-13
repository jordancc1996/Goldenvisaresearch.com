import { visibleAuthorInProduction, visibleInProduction, referenceId, type ContentRecord, type EntryReference } from "./content.ts";
import { topicSlugs, type TopicSlug } from "./content-schema.ts";

type TopicRecord = {
  topic?: string;
  comparison?: boolean;
  draft?: boolean;
  material?: "demonstration" | "reported";
  developmentOnly?: boolean;
  verification?: { status?: string };
  publishedAt?: Date;
};

type Authored = TopicRecord & {
  authors?: EntryReference[];
  review?: { reviewer: EntryReference; reviewedOn: Date };
};

export function isTopicSlug(value: string): value is TopicSlug {
  return topicSlugs.some((slug) => slug === value);
}

export function matchesTopic(entry: ContentRecord<TopicRecord>, topic: TopicSlug): boolean {
  return visibleInProduction(entry as ContentRecord<TopicRecord & { publishedAt: Date }>) &&
    entry.data.comparison !== true &&
    entry.data.topic === topic;
}

export function countriesForTopic<T extends ContentRecord<TopicRecord & { name: string }>>(
  countries: T[],
  referencedIds: string[],
  topic: TopicSlug,
): T[] {
  const ids = new Set(referencedIds);
  for (const country of countries) {
    if (country.data.topic === topic && visibleInProduction(country as ContentRecord<TopicRecord & { publishedAt: Date }>)) {
      ids.add(country.id);
    }
  }
  return countries
    .filter((country) => ids.has(country.id) && visibleInProduction(country as ContentRecord<TopicRecord & { publishedAt: Date }>))
    .sort((left, right) => left.data.name.localeCompare(right.data.name, "en"));
}

export function referencedCountryIds(
  entries: ContentRecord<TopicRecord & { countries?: EntryReference[]; country?: EntryReference }>[],
  topic: TopicSlug,
): string[] {
  const ids: string[] = [];
  for (const entry of entries) {
    if (!matchesTopic(entry, topic)) continue;
    if (entry.data.countries) {
      for (const country of entry.data.countries) ids.push(referenceId(country));
    }
    if (entry.data.country) ids.push(referenceId(entry.data.country));
  }
  return ids;
}

export function articlesByAuthor<T extends ContentRecord<Authored>>(
  entries: T[],
  authorId: string,
): T[] {
  return entries.filter((entry) => {
    if (!visibleInProduction(entry as ContentRecord<TopicRecord & { publishedAt: Date }>)) return false;
    if (entry.data.comparison === true) return false;
    return (entry.data.authors ?? []).some((author) => referenceId(author) === authorId);
  });
}

export function reviewsByAuthor<T extends ContentRecord<Authored>>(
  entries: T[],
  authorId: string,
): T[] {
  return entries.filter((entry) => {
    if (!visibleInProduction(entry as ContentRecord<TopicRecord & { publishedAt: Date }>)) return false;
    if (!entry.data.review) return false;
    return referenceId(entry.data.review.reviewer) === authorId;
  });
}

export function authorPageInProduction(
  entry: ContentRecord<{
    draft?: boolean;
    developmentOnly?: boolean;
    material?: "demonstration" | "reported";
    verification?: { status?: string };
  }>,
): boolean {
  return visibleAuthorInProduction(entry);
}

export type CoverageItem = {
  collection: string;
  id: string;
  topic?: string;
};

export function topicCoverage(items: CoverageItem[]): {
  byTopic: Record<TopicSlug, number>;
  unassigned: CoverageItem[];
} {
  const byTopic = {
    "golden-visa": 0,
    "residency-by-investment": 0,
    "citizenship-by-investment": 0,
  };
  const unassigned: CoverageItem[] = [];
  for (const item of items) {
    if (!item.topic) {
      unassigned.push(item);
      continue;
    }
    if (!isTopicSlug(item.topic)) continue;
    byTopic[item.topic] += 1;
  }
  return { byTopic, unassigned };
}
