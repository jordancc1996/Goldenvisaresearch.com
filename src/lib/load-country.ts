import { getCollection, getEntry, render } from "astro:content";
import {
  categoryLabel,
  reviewNote,
  verifiedLabel,
} from "./article-display";
import {
  contentVisibility,
  newsForCountry,
  referenceId,
  sortByDate,
  visibleInProduction,
} from "./content";
import { buildDirectoryRows, programsForCountry, type DirectoryRow } from "./directory";
import { countryFacts, searchEligible } from "./publishing";
import { readHero, type ArticleHero, type ArticleSource, type ArticleTopic, type RelatedCard, type TocHeading } from "./load-article";
import { topicLabels, type TopicSlug } from "./content-schema";

export type CountryNewsItem = {
  href: string;
  category: string;
  title: string;
  publishedAt: Date;
};

export type CountryProfile = {
  id: string;
  name: string;
  summary: string;
  overview: string;
  methodology: string;
  draft: boolean;
  demonstration: boolean;
  indexable: boolean;
  verifiedLabel: string;
  verifiedOn?: Date;
  reviewNote: string;
  hero?: ArticleHero;
  topic?: ArticleTopic;
  headings: TocHeading[];
  programs: DirectoryRow[];
  sources: ArticleSource[];
  news: CountryNewsItem[];
  research: RelatedCard[];
  countries: { name: string; href: string }[];
  Content: Awaited<ReturnType<typeof render>>["Content"];
};

function mergeHeadings(
  body: { depth: number; slug: string; text: string }[],
  extra: TocHeading[],
): TocHeading[] {
  const headings = body
    .filter((heading) => heading.depth === 2 || heading.depth === 3)
    .map((heading) => ({ depth: heading.depth, slug: heading.slug, text: heading.text }));
  const used = new Set(headings.map((heading) => heading.slug));
  return [...headings, ...extra.filter((heading) => !used.has(heading.slug))];
}

export async function loadCountryProfile(id: string): Promise<CountryProfile> {
  const entry = await getEntry("countries", id);
  if (!entry) throw new Error(`Missing country entry: ${id}`);
  const rendered = await render(entry);
  const [programs, countries, news, reports] = await Promise.all([
    getCollection("programs"),
    getCollection("countries"),
    getCollection("news"),
    getCollection("reports"),
  ]);
  const facts = countryFacts(entry);
  const visibility = contentVisibility();
  const directory = buildDirectoryRows(programs, countries, visibility);
  const programRows = programsForCountry(directory.rows, entry.id);
  const verification = entry.data.verification;
  const verifiedOn =
    verification.status === "verified" && verification.verifiedOn
      ? verification.verifiedOn
      : undefined;
  const linked = new Set(entry.data.relatedReports.map((report) => referenceId(report)));
  const researchEntries = sortByDate(
    reports.filter((report) => {
      if (report.data.comparison === true) return false;
      if (visibility === "production" && !visibleInProduction(report)) return false;
      const sharesCountry = report.data.countries.some((country) => referenceId(country) === entry.id);
      return sharesCountry || linked.has(report.id);
    }),
  ).slice(0, 3);

  return {
    id: entry.id,
    name: facts.name,
    summary: facts.summary,
    overview: facts.overview ?? "No investment migration overview is recorded in this file.",
    methodology: entry.data.methodology ?? "No method is recorded in this file.",
    draft: entry.data.draft !== false,
    demonstration: entry.data.material === "demonstration",
    indexable: searchEligible(entry),
    verifiedLabel: verifiedLabel(verification),
    verifiedOn,
    reviewNote: reviewNote(verification),
    hero: await readHero(entry.data.hero),
    topic:
      entry.data.topic && entry.data.topic in topicLabels
        ? {
            label: topicLabels[entry.data.topic as TopicSlug],
            href: `/topics/${entry.data.topic}`,
          }
        : undefined,
    headings: mergeHeadings(rendered.headings, [
      { depth: 2, slug: "investment-overview", text: "Investment migration overview" },
      { depth: 2, slug: "programs", text: "Programs" },
      { depth: 2, slug: "government-sources", text: "Government sources" },
      { depth: 2, slug: "recent-news", text: "Recent news" },
      { depth: 2, slug: "related-research", text: "Related research" },
      { depth: 2, slug: "methodology", text: "Methodology" },
      { depth: 2, slug: "corrections", text: "Corrections" },
    ]),
    programs: programRows,
    sources: entry.data.sources.map((source) => ({
      label: source.label,
      url: source.url,
      organization: source.organization,
      accessedOn: source.accessedOn,
    })),
    news: newsForCountry(news, entry.id, visibility)
      .filter((item) => item.data.comparison !== true)
      .map((item) => ({
        href: `/news/${item.id}`,
        category: categoryLabel(item.data.category, "News"),
        title: item.data.title,
        publishedAt: item.data.publishedAt,
      })),
    research: await Promise.all(
      researchEntries.map(async (item) => ({
      href: `/reports/${item.id}`,
      category: categoryLabel(item.data.category, "Research"),
      title: item.data.title,
      publishedAt: item.data.publishedAt,
      hero: await readHero(item.data.hero),
    })),
    ),
    countries: [{ name: entry.data.name, href: `/countries/${entry.id}` }],
    Content: rendered.Content,
  };
}
