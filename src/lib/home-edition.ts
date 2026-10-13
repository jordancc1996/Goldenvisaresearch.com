import { topicSlugs, type TopicSlug } from "./content-schema";
import type { HomeStory } from "./load-archive";

export type HomeTopic = {
  slug: TopicSlug;
  title: string;
  href: string;
  stories: HomeStory[];
};

export type HomeEdition = {
  lead?: HomeStory;
  secondary: HomeStory[];
  latest: HomeStory[];
  topics: HomeTopic[];
  research: HomeStory[];
};

const topicHeadings: Record<TopicSlug, string> = {
  "golden-visa": "Golden visa coverage",
  "residency-by-investment": "Residency-by-investment coverage",
  "citizenship-by-investment": "Citizenship-by-investment coverage",
};

/**
 * Compact homepage variant.
 * The lead, the secondary headlines, and latest news take distinct stories first.
 * Each topic section then uses only the stories that remain for that topic, up to six.
 * A topic with fewer than six stories renders a shorter grid. It does not repeat a story
 * and it does not add empty columns. A topic with no remaining stories is omitted.
 * Production pages stay empty when no record is published.
 */
export function composeHome(news: HomeStory[], reports: HomeStory[]): HomeEdition {
  const used = new Set<string>();
  const lead = news[0];
  if (lead) used.add(lead.id);

  function take(items: HomeStory[], count: number, topic?: TopicSlug) {
    const picked: HomeStory[] = [];
    for (const item of items) {
      if (picked.length >= count) break;
      if (used.has(item.id)) continue;
      if (topic && item.topic !== topic) continue;
      used.add(item.id);
      picked.push(item);
    }
    return picked;
  }

  const secondary = take(news, 4);
  const latest = take(news, 6);
  const topics = topicSlugs
    .map((slug) => ({
      slug,
      title: topicHeadings[slug],
      href: `/topics/${slug}`,
      stories: take(news, 6, slug),
    }))
    .filter((topic) => topic.stories.length > 0);

  return {
    lead,
    secondary,
    latest,
    topics,
    research: reports.slice(0, 6),
  };
}
