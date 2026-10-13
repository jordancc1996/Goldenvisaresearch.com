import type { ImageMetadata } from "astro";
import { getCollection, getEntry, render } from "astro:content";
import { isImageMetadata } from "./image-metadata";
import {
  categoryLabel,
  displayedStatus,
  programStatusLabel,
  programTypeLabel,
  reviewNote,
  verifiedLabel,
} from "./article-display";
import { showsDemonstrationContent } from "./preview-mode";
import {
  entryHref,
  formatTextFact,
  isPublicEntry,
  readingTime,
  referenceId,
  visibleInProduction,
  type EntryReference,
} from "./content";
import { buildCoverage, type CoverageItem } from "./article-coverage";
import { isArchiveEntry } from "./archive";
import { supportingLinks } from "./press";
import { programMoneyFacts, publishedAuthorHref, publishedHref, searchEligible } from "./publishing";
import { topicLabels, type ProgramType, type TopicSlug } from "./content-schema";

export type ArticleCollection = "news" | "reports" | "programs" | "countries" | "press";

export type TocHeading = {
  depth: number;
  slug: string;
  text: string;
};

export type ArticleSource = {
  label: string;
  url: string;
  organization?: string;
  accessedOn?: Date;
};

export type ArticleHero = {
  src: ImageMetadata;
  alt: string;
  caption: string;
  credit: string;
  focal?: string;
};

export type RelatedCard = {
  href: string;
  category: string;
  title: string;
  publishedAt: Date;
  hero?: ArticleHero;
  placeholder?: boolean;
};

export type ArticleAuthor = {
  name: string;
  role: string;
  href?: string;
  summary?: string;
};

export type ArticleReview = {
  name: string;
  href?: string;
  reviewedOn: Date;
};

export type ArticleTopic = {
  label: string;
  href: string;
};

export type ArticleCountry = {
  name: string;
  href?: string;
};

export async function resolveContentImage(src: unknown): Promise<ImageMetadata | undefined> {
  if (isImageMetadata(src)) return src;
  if (typeof src !== "string" || !import.meta.env.DEV) return undefined;
  const { resolveDevContentImage } = await import("./dev-content-images.ts");
  return resolveDevContentImage(src);
}

export type ArticleModel = {
  collection: ArticleCollection;
  id: string;
  category: string;
  title: string;
  dek: string;
  authors: ArticleAuthor[];
  review?: ArticleReview;
  topic?: ArticleTopic;
  publishedAt: Date;
  updatedAt?: Date;
  readingLabel: string;
  countries: ArticleCountry[];
  hero?: ArticleHero;
  headings: TocHeading[];
  sources: ArticleSource[];
  related: RelatedCard[];
  authorStories: RelatedCard[];
  topicStories: RelatedCard[];
  countryStories: RelatedCard[];
  relatedLabel: string;
  showToc: boolean;
  demonstration: boolean;
  indexable: boolean;
  showSources: boolean;
  supporting?: { href: string; title: string }[];
  designNotice?: string;
  report?: {
    findings: string[];
    methodology?: string;
    attachment?: { href: string; label: string };
    publishedAt: Date;
    updatedAt?: Date;
  };
  release?: {
    dateline?: string;
    organization?: string;
    boilerplate?: string;
    mediaContact?: string;
  };
  program?: {
    overview: string;
    typeLabel: string;
    statusKey: string;
    statusLabel: string;
    statusNote: string;
    legalBasis: string;
    investmentLabel: string;
    currencyLabel: string;
    routesLabel: string;
    feesLabel: string;
    eligibility: string;
    applicationRequirements: string;
    applicationProcess: string;
    processing: string;
    physicalPresence: string;
    familyEligibility: string;
    citizenshipEligibility: string;
    sources: ArticleSource[];
    verifiedLabel: string;
    verifiedOn?: Date;
  };
  Content: Awaited<ReturnType<typeof render>>["Content"];
};

export async function articlePaths(collection: ArticleCollection) {
  const entries = await getCollection(collection);
  return entries
    .filter((entry) => isPublicEntry(entry))
    .map((entry) => ({ params: { id: entry.id } }));
}

export async function readHero(value: unknown): Promise<ArticleHero | undefined> {
  if (!value || typeof value !== "object") return undefined;
  const hero = value as { src?: unknown; alt?: unknown; caption?: unknown; credit?: unknown; focal?: unknown };
  if (typeof hero.alt !== "string" || typeof hero.caption !== "string" || typeof hero.credit !== "string") return undefined;
  if (!hero.alt || !hero.caption || !hero.credit) return undefined;
  const src = await resolveContentImage(hero.src);
  if (!src) return undefined;
  return {
    src,
    alt: hero.alt,
    caption: hero.caption,
    credit: hero.credit,
    focal: typeof hero.focal === "string" ? hero.focal : undefined,
  };
}

function readSources(
  sources: {
    label: string;
    url: string;
    organization?: string;
    accessedOn?: Date;
  }[],
): ArticleSource[] {
  return sources.map((source) => ({
    label: source.label,
    url: source.url,
    organization: source.organization,
    accessedOn: source.accessedOn,
  }));
}

function authorHref(author: {
  id: string;
  data: {
    draft?: boolean;
    developmentOnly?: boolean;
    material?: "demonstration" | "reported";
    verification?: { status?: string };
  };
}): string | undefined {
  return publishedAuthorHref(author);
}

function topicLink(topic: string | undefined): ArticleTopic | undefined {
  if (!topic || !(topic in topicLabels)) return undefined;
  const slug = topic as TopicSlug;
  return { label: topicLabels[slug], href: `/topics/${slug}` };
}

async function readAuthors(refs: EntryReference[]): Promise<ArticleAuthor[]> {
  const authors: ArticleAuthor[] = [];
  for (const ref of refs) {
    const author = await getEntry("authors", referenceId(ref));
    if (!author) continue;
    authors.push({
      name: author.data.name,
      role: author.data.role,
      href: authorHref(author),
      summary: author.data.summary,
    });
  }
  return authors;
}

async function readReview(review?: {
  reviewer: EntryReference;
  reviewedOn: Date;
}): Promise<ArticleReview | undefined> {
  if (!review) return undefined;
  const author = await getEntry("authors", referenceId(review.reviewer));
  if (!author) return undefined;
  return {
    name: author.data.name,
    href: authorHref(author),
    reviewedOn: review.reviewedOn,
  };
}

async function readCountries(refs: EntryReference[]): Promise<ArticleCountry[]> {
  const countries: ArticleCountry[] = [];
  for (const ref of refs) {
    const id = referenceId(ref);
    const country = await getEntry("countries", id);
    if (!country) continue;
    countries.push({ name: country.data.name, href: publishedHref("countries", country) });
  }
  return countries;
}

async function coverageFor(current: {
  id: string;
  collection: string;
  topic?: string;
  authorIds: string[];
  countryIds: string[];
  programTypes: ProgramType[];
}) {
  const [news, reports, press] = await Promise.all([
    getCollection("news"),
    getCollection("reports"),
    getCollection("press"),
  ]);
  const preview = showsDemonstrationContent();
  const heroes = new Map<string, ArticleHero>();
  const items: CoverageItem[] = [];
  const prepare = async (
    collection: "news" | "reports" | "press",
    entry: {
      id: string;
      data: {
        title: string;
        publishedAt: Date;
        draft?: boolean;
        material?: "demonstration" | "reported";
        developmentOnly?: boolean;
        verification?: { status?: string };
        comparison?: boolean;
        category?: string;
        topic?: string;
        authors?: EntryReference[];
        countries?: EntryReference[];
        programTypes?: ProgramType[];
        hero?: unknown;
      };
    },
  ) => {
    if (entry.data.comparison === true) return;
    if (!preview && !visibleInProduction({ id: entry.id, data: entry.data })) return;
    const hero = await readHero(entry.data.hero);
    if (hero) heroes.set(`${collection}/${entry.id}`, hero);
    items.push({
      id: entry.id,
      collection,
      href: entryHref(collection, entry.id),
      title: entry.data.title,
      category:
        collection === "press"
          ? "Press release"
          : categoryLabel(entry.data.category, collection === "reports" ? "Research" : "News"),
      publishedAt: entry.data.publishedAt,
      topic: entry.data.topic,
      authorIds: (entry.data.authors ?? []).map(referenceId),
      countryIds: (entry.data.countries ?? []).map(referenceId),
      programTypes: entry.data.programTypes ?? [],
      placeholder: entry.data.material === "demonstration" && !hero,
    });
  };
  for (const entry of news) await prepare("news", entry);
  for (const entry of reports) await prepare("reports", entry);
  for (const entry of press) await prepare("press", entry);
  const groups = buildCoverage(current, items);
  const cards = (group: CoverageItem[]): RelatedCard[] =>
    group.map((item) => ({
      href: item.href,
      category: item.category,
      title: item.title,
      publishedAt: item.publishedAt,
      hero: heroes.get(`${item.collection}/${item.id}`),
      placeholder: item.placeholder,
    }));
  return {
    related: cards(groups.sidebar),
    authorStories: cards(groups.author),
    topicStories: cards(groups.topic),
    countryStories: cards(groups.country),
  };
}

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

export async function loadArticle(collection: ArticleCollection, id: string): Promise<ArticleModel> {
  if (collection === "news") return loadNews(id);
  if (collection === "reports") return loadReport(id);
  if (collection === "programs") return loadProgram(id);
  if (collection === "press") return loadPress(id);
  throw new Error(`Country profiles use the country layout: ${collection}/${id}`);
}

async function loadNews(id: string): Promise<ArticleModel> {
  const entry = await getEntry("news", id);
  if (!entry) throw new Error(`Missing news entry: ${id}`);
  const rendered = await render(entry);
  const countries = await readCountries(entry.data.countries);
  const coverage = await coverageFor({
    id: entry.id,
    collection: "news",
    topic: entry.data.topic,
    authorIds: entry.data.authors.map(referenceId),
    countryIds: entry.data.countries.map(referenceId),
    programTypes: entry.data.programTypes,
  });
  return {
    collection: "news",
    id: entry.id,
    category: categoryLabel(entry.data.category, "News"),
    title: entry.data.title,
    dek: entry.data.description,
    authors: await readAuthors(entry.data.authors),
    review: await readReview(entry.data.review),
    topic: topicLink(entry.data.topic),
    publishedAt: entry.data.publishedAt,
    updatedAt: entry.data.updatedAt,
    readingLabel: readingTime(entry.body ?? "").label,
    countries,
    hero: await readHero(entry.data.hero),
    headings: mergeHeadings(rendered.headings, standardHeadings()),
    sources: readSources(entry.data.sources),
    ...coverage,
    relatedLabel: "Related coverage",
    showToc: false,
    demonstration: entry.data.material === "demonstration",
    indexable: searchEligible(entry),
    showSources: true,
    Content: rendered.Content,
  };
}

async function loadReport(id: string): Promise<ArticleModel> {
  const entry = await getEntry("reports", id);
  if (!entry) throw new Error(`Missing report entry: ${id}`);
  const rendered = await render(entry);
  const text = [entry.body, entry.data.methodology, ...entry.data.findings].filter(Boolean).join("\n");
  const coverage = await coverageFor({
    id: entry.id,
    collection: "reports",
    topic: entry.data.topic,
    authorIds: entry.data.authors.map(referenceId),
    countryIds: entry.data.countries.map(referenceId),
    programTypes: entry.data.programTypes,
  });
  return {
    collection: "reports",
    id: entry.id,
    category: categoryLabel(entry.data.category, "Research"),
    title: entry.data.title,
    dek: entry.data.description,
    authors: await readAuthors(entry.data.authors),
    review: await readReview(entry.data.review),
    topic: topicLink(entry.data.topic),
    publishedAt: entry.data.publishedAt,
    updatedAt: entry.data.updatedAt,
    readingLabel: readingTime(text).label,
    countries: await readCountries(entry.data.countries),
    hero: await readHero(entry.data.hero),
    headings: mergeHeadings(rendered.headings, [
      { depth: 2, slug: "key-findings", text: "Key findings" },
      { depth: 2, slug: "methodology", text: "Methodology" },
      { depth: 2, slug: "data", text: "Data" },
      { depth: 2, slug: "publication", text: "Publication" },
      { depth: 2, slug: "sources", text: "Sources" },
      { depth: 2, slug: "corrections", text: "Corrections" },
    ]),
    sources: readSources(entry.data.sources),
    ...coverage,
    relatedLabel: "Related coverage",
    showToc: true,
    demonstration: entry.data.material === "demonstration",
    indexable: searchEligible(entry),
    showSources: true,
    report: {
      findings: entry.data.findings,
      methodology: entry.data.methodology,
      attachment: entry.data.attachment,
      publishedAt: entry.data.publishedAt,
      updatedAt: entry.data.updatedAt,
    },
    Content: rendered.Content,
  };
}

async function loadProgram(id: string): Promise<ArticleModel> {
  const entry = await getEntry("programs", id);
  if (!entry) throw new Error(`Missing program entry: ${id}`);
  const rendered = await render(entry);
  const data = entry.data;
  const text = [
    entry.body,
    data.description,
    data.legalBasis,
    data.eligibility,
    data.applicationProcess,
    data.processing,
    data.familyEligibility,
  ]
    .filter(Boolean)
    .join("\n");
  const coverage = await coverageFor({
    id: entry.id,
    collection: "programs",
    topic: data.topic,
    authorIds: data.authors.map(referenceId),
    countryIds: [referenceId(data.country)],
    programTypes: [data.programType],
  });
  return {
    collection: "programs",
    id: entry.id,
    category: categoryLabel(data.category, "Program"),
    title: data.title,
    dek: data.description,
    authors: await readAuthors(data.authors),
    review: await readReview(data.review),
    topic: topicLink(data.topic),
    publishedAt: data.publishedAt,
    updatedAt: data.updatedAt,
    readingLabel: readingTime(text).label,
    countries: await readCountries([data.country]),
    hero: await readHero(data.hero),
    headings: mergeHeadings(rendered.headings, [
      { depth: 2, slug: "program-overview", text: "Program overview" },
      { depth: 2, slug: "program-type", text: "Program type" },
      { depth: 2, slug: "status", text: "Status" },
      { depth: 2, slug: "legal-basis", text: "Legal basis" },
      { depth: 2, slug: "investment-requirements", text: "Investment requirements" },
      { depth: 2, slug: "investment-routes", text: "Investment routes" },
      { depth: 2, slug: "government-fees", text: "Government fees" },
      { depth: 2, slug: "eligibility", text: "Eligibility" },
      { depth: 2, slug: "application-requirements", text: "Application requirements" },
      { depth: 2, slug: "application-process", text: "Application process" },
      { depth: 2, slug: "processing-information", text: "Processing information" },
      { depth: 2, slug: "physical-presence", text: "Physical presence" },
      { depth: 2, slug: "family-eligibility", text: "Family eligibility" },
      { depth: 2, slug: "citizenship-eligibility", text: "Citizenship eligibility" },
      { depth: 2, slug: "government-sources", text: "Government sources" },
      { depth: 2, slug: "last-verified", text: "Last verified" },
      { depth: 2, slug: "corrections", text: "Corrections" },
    ]),
    sources: readSources(data.sources),
    ...coverage,
    relatedLabel: "Related coverage",
    showToc: false,
    demonstration: data.material === "demonstration",
    indexable: searchEligible(entry),
    showSources: false,
    program: {
      overview: data.description,
      typeLabel: programTypeLabel(data.programType),
      statusKey: displayedStatus(data.recordStatus, data.verification),
      statusLabel: programStatusLabel(displayedStatus(data.recordStatus, data.verification)),
      statusNote: reviewNote(data.verification),
      legalBasis: data.legalBasis,
      ...programMoneyFacts(entry),
      eligibility: data.eligibility,
      applicationRequirements: formatTextFact(data.applicationRequirements),
      applicationProcess: data.applicationProcess,
      processing: data.processing,
      physicalPresence: formatTextFact(data.physicalPresence),
      familyEligibility: data.familyEligibility,
      citizenshipEligibility: formatTextFact(data.citizenshipEligibility),
      sources: readSources(data.sources),
      verifiedLabel: verifiedLabel(data.verification),
      verifiedOn:
        data.verification.status === "verified" ? data.verification.verifiedOn : undefined,
    },
    Content: rendered.Content,
  };
}

function standardHeadings(): TocHeading[] {
  return [
    { depth: 2, slug: "sources", text: "Sources" },
    { depth: 2, slug: "corrections", text: "Corrections" },
  ];
}

async function loadPress(id: string): Promise<ArticleModel> {
  const entry = await getEntry("press", id);
  if (!entry) throw new Error(`Missing press entry: ${id}`);
  const rendered = await render(entry);
  const data = entry.data;
  const [news, reports] = await Promise.all([getCollection("news"), getCollection("reports")]);
  const production = !showsDemonstrationContent();
  const supporting = [
    ...supportingLinks(
      (data.relatedNews ?? []).map(referenceId),
      "news",
      news.map((item) => ({ id: item.id, title: item.data.title, archive: isArchiveEntry(item) })),
      production,
    ),
    ...supportingLinks(
      (data.relatedReports ?? []).map(referenceId),
      "reports",
      reports.map((item) => ({ id: item.id, title: item.data.title, archive: isArchiveEntry(item) })),
      production,
    ),
  ];
  const coverage = await coverageFor({
    id: entry.id,
    collection: "press",
    topic: data.topic,
    authorIds: data.authors.map(referenceId),
    countryIds: data.countries.map(referenceId),
    programTypes: data.programTypes,
  });
  return {
    collection: "press",
    id: entry.id,
    category: "Press release",
    title: data.title,
    dek: data.description,
    authors: await readAuthors(data.authors),
    topic: topicLink(data.topic),
    publishedAt: data.publishedAt,
    updatedAt: data.updatedAt,
    readingLabel: readingTime(entry.body ?? "").label,
    countries: await readCountries(data.countries),
    hero: await readHero(data.hero),
    headings: mergeHeadings(rendered.headings, [
      { depth: 2, slug: "release-details", text: "Release details" },
      ...standardHeadings(),
    ]),
    sources: readSources(data.sources),
    ...coverage,
    relatedLabel: "Related coverage",
    showToc: false,
    demonstration: data.material === "demonstration",
    indexable: searchEligible(entry),
    showSources: true,
    supporting,
    designNotice: data.material === "demonstration" ? "Placeholder. This release is not a published announcement." : undefined,
    release: {
      dateline: data.dateline,
      organization: data.organization,
      boilerplate: data.boilerplate,
      mediaContact: data.mediaContact,
    },
    Content: rendered.Content,
  };
}
