import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import {
  filterCountries,
  filterNews,
  filterReports,
  groupCountries,
  isArchiveEntry,
  pagePaths,
  paginate,
  paginationLinks,
  reservedArchiveSlug,
  splitFeatured,
} from "../src/lib/archive.ts";
import { pressRouteParams, supportingLinks } from "../src/lib/press.ts";
import { displayedStatus, reviewState } from "../src/lib/article-display.ts";
import { regionQueryMatches } from "../src/data/home-regions.ts";
import { site } from "../src/data/site.ts";
import { correctionsForPath } from "../src/lib/corrections.ts";
import { formResult } from "../src/lib/form-response.ts";
import { shouldResolveContentImage } from "../src/lib/content-images.ts";
import {
  authorCountsForIndex,
  indexInventory,
  loadPublicationInventory,
  recordCountsForIndex,
  routeIndexable,
  sectionIndexable,
} from "../src/lib/indexability.ts";
import { allowInSitemap, robotsDirectiveFor } from "../src/lib/metadata.ts";
import {
  contentIndexDocument,
  contentIndexText,
  includeAuthorInMachineLayer,
  includeInMachineLayer,
  llmsText,
  markdownDocument,
  markdownDocuments,
  publishedNames,
} from "../src/lib/machine-readable.ts";
import { visibleAuthorInProduction } from "../src/lib/content.ts";
import {
  articlesByAuthor,
  authorPageInProduction,
  matchesTopic,
  topicCoverage,
} from "../src/lib/topic-assign.ts";
import {
  authorSchema,
  correctionSchema,
  countryInputSchema,
  investmentThresholdSchema,
  moneyFactSchema,
  newsInputSchema,
  programInputSchema,
} from "../src/lib/content-schema.ts";
import { buildCoverage } from "../src/lib/article-coverage.ts";
import { newsletterInsertIndex } from "../src/lib/newsletter-markup.ts";
import {
  featuredStories,
  filterByProgramType,
  formatInvestmentThreshold,
  formatTextFact,
  newsForCountry,
  readingTime,
  relatedCoverage,
  selectVisible,
  sortByDate,
  type ContentRecord,
} from "../src/lib/content.ts";
import {
  buildCountryRows,
  buildDirectoryRows,
  filterDirectory,
  sortDirectory,
  type CountryDirectoryData,
  type ProgramDirectoryData,
} from "../src/lib/directory.ts";
import type { NewsData } from "../src/lib/content-schema.ts";
import {
  archiveRecords,
  countryFacts,
  feedRecords,
  programMoneyFacts,
  publishedHref,
  publishedProgramsForCountry,
  searchRecords,
} from "../src/lib/publishing.ts";
import {
  auditContentDirectory,
  auditContentFile,
  missingReferenceFailures,
  splitFrontmatter,
  stalePublishedWarnings,
} from "../src/lib/publish-audit.ts";

const root = process.cwd();
let failed = 0;

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok  ${name}`);
  } catch (error) {
    failed += 1;
    console.error(`fail  ${name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

function expect(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function readFixture(name: string) {
  return readFileSync(path.join(root, "scripts", "fixtures", name), "utf8");
}

function loadNews(file: string): ContentRecord<NewsData> {
  const raw = readFileSync(path.join(root, "src", "content", "news", file), "utf8");
  const { data, body } = splitFrontmatter(raw);
  const parsed = newsInputSchema.parse(data);
  return { id: file.replace(/\.(md|mdx)$/, ""), body, data: parsed };
}

const alpha = loadNews("demonstration-news-alpha.md");
const beta = loadNews("demonstration-news-beta.md");
const gamma = loadNews("demonstration-news-gamma.md");
const delta = loadNews("demonstration-news-delta.mdx");
const news = [delta, alpha, gamma, beta];
const reportAlpha: ContentRecord<NewsData> = {
  id: "demonstration-report-alpha",
  body: "",
  data: newsInputSchema.parse(
    splitFrontmatter(
      readFileSync(
        path.join(root, "src", "content", "reports", "demonstration-report-alpha.md"),
        "utf8",
      ),
    ).data,
  ),
};
const coverage = [...news, reportAlpha];

check("rejects an investment amount of zero", () => {
  const parsed = programInputSchema.safeParse(parseYaml(readFixture("invalid-zero-amount.yml")));
  expect(parsed.success === false, "zero should fail the schema");
  const direct = investmentThresholdSchema.safeParse({
    state: "stated",
    currency: "EUR",
    amount: 0,
  });
  expect(direct.success === false, "threshold schema should reject zero");
  const fee = moneyFactSchema.safeParse({
    state: "stated",
    currency: "EUR",
    amount: 0,
  });
  expect(fee.success === false, "a government fee of zero should fail");
});

check("rejects a negative investment amount", () => {
  const parsed = investmentThresholdSchema.safeParse({
    state: "stated",
    currency: "EUR",
    amount: -1,
  });
  expect(parsed.success === false, "negative amounts should fail");
});

check("rejects unknown frontmatter fields", () => {
  const parsed = countryInputSchema.safeParse(parseYaml(readFixture("invalid-unknown-field.yml")));
  expect(parsed.success === false, "strict schema should reject unexpected");
});

check("rejects news with no title", () => {
  const parsed = newsInputSchema.safeParse({
    description: "Missing a title",
    publishedAt: "2026-10-12",
    material: "demonstration",
    authors: ["demonstration-editor-one"],
    countries: ["portugal"],
    programTypes: ["unspecified"],
    verification: { status: "unverified" },
  });
  expect(parsed.success === false, "title is required");
});

check("accepts a structurally valid published fixture", () => {
  const parsed = newsInputSchema.safeParse(parseYaml(readFixture("valid-published-news.yml")));
  expect(parsed.success, parsed.success ? "" : parsed.error.issues.map((issue) => issue.message).join("; "));
});

check("flags published [VERIFY] text", () => {
  const failures = auditContentFile(
    "invalid-published-verify.md",
    readFixture("invalid-published-verify.md"),
    newsInputSchema,
  );
  expect(failures.some((failure) => failure.includes("[VERIFY]")), failures.join("\n"));
});

check("flags a placeholder source URL", () => {
  const failures = auditContentFile(
    "invalid-placeholder-source.md",
    readFixture("invalid-placeholder-source.md"),
    newsInputSchema,
  );
  expect(failures.some((failure) => failure.includes("placeholder")), failures.join("\n"));
});

check("flags incomplete verification on a published record", () => {
  const failures = auditContentFile(
    "invalid-incomplete-verification.md",
    readFixture("invalid-incomplete-verification.md"),
    newsInputSchema,
  );
  expect(
    failures.some((failure) => failure.includes("mandatory verification")),
    failures.join("\n"),
  );
});

check("does not format zero as an investment threshold", () => {
  expect(formatInvestmentThreshold({ state: "unverified" }) === "Unverified", "unverified label");
  expect(
    formatInvestmentThreshold({ state: "stated", currency: "EUR", amount: 0 }) === "Unverified",
    "zero must not display as a threshold",
  );
  expect(formatInvestmentThreshold({ state: "unknown" }) === "Unknown", "unknown label");
  expect(formatInvestmentThreshold({ state: "unpublished" }) === "Unpublished", "unpublished label");
  for (const label of ["Unknown", "Unpublished", "Unverified"]) {
    expect(!label.includes("0") && !label.includes("$"), label);
  }
  expect(formatTextFact({ state: "unknown" }) === "Unknown", "unknown text fact");
});

check("keeps draft demonstration records out of production", () => {
  const production = selectVisible(news, "production");
  const preview = selectVisible(news, "preview");
  expect(production.length === 0, `production saw ${production.length}`);
  expect(preview.length === 4, `preview saw ${preview.length}`);
  expect(auditContentDirectory(root).length === 0, auditContentDirectory(root).join("\n"));
});

check("sorts by date and returns featured drafts only in preview", () => {
  const sorted = sortByDate(news);
  expect(sorted[0]?.id === "demonstration-news-alpha", sorted.map((entry) => entry.id).join(","));
  expect(featuredStories(news, "preview").length === 1, "one featured draft");
  expect(featuredStories(news, "production").length === 0, "featured drafts stay hidden");
});

check("filters country news, program type, and related coverage", () => {
  const portugal = newsForCountry(news, "portugal", "preview");
  expect(portugal.length === 1 && portugal[0]?.id === "demonstration-news-alpha", "Portugal news");
  const funds = filterByProgramType(news, "fund", "preview");
  expect(funds.length === 1 && funds[0]?.id === "demonstration-news-beta", "fund filter");
  expect(filterByProgramType(news, "fund", "production").length === 0, "production program filter");
  const related = relatedCoverage(alpha, coverage, { visibility: "preview" });
  expect(
    related.some((entry) => entry.id === "demonstration-report-alpha"),
    `related ids: ${related.map((entry) => entry.id).join(", ") || "none"}`,
  );
});

check("calculates reading time without using zero as a result label", () => {
  const empty = readingTime("  ");
  expect(empty.label === "Not calculated", empty.label);
  const short = readingTime(alpha.body ?? "");
  expect(short.minutes >= 1 && !short.label.startsWith("0"), short.label);
});

check("country files cannot store a separate investment amount", () => {
  const parsed = countryInputSchema.safeParse({
    name: "Portugal",
    summary: "Summary",
    publishedAt: "2026-10-06",
    material: "demonstration",
    programs: [
      {
        id: "copied-route",
        label: "Copied route",
        programType: "unspecified",
        recordStatus: "unverified",
        minimumInvestment: { state: "stated", currency: "EUR", amount: 1 },
      },
    ],
    verification: { status: "unverified" },
  });
  expect(parsed.success === false, "embedded program facts should fail the country schema");
});

check("a published investment amount requires verification", () => {
  const raw = `---
title: Claim
description: Published fixture
publishedAt: 2026-10-12
draft: false
material: reported
authors:
  - demonstration-editor-one
country: portugal
programType: unspecified
recordStatus: active
legalBasis: Fixture
minimumInvestment:
  state: stated
  currency: EUR
  amount: 1
eligibility: Fixture
applicationProcess: Fixture
processing: Fixture
familyEligibility: Fixture
sources: []
verification:
  status: unverified
---
`;
  const failures = auditContentFile("claim.md", raw, programInputSchema);
  expect(
    failures.some((failure) => failure.includes("stated investment")),
    failures.join("\n"),
  );
  expect(
    failures.some((failure) => failure.includes("mandatory verification")),
    failures.join("\n"),
  );
});

function day(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

check("flags stale verification and hides an unverified status", () => {
  const now = day("2026-10-12");
  expect(reviewState({ status: "verified", verifiedOn: day("2026-04-15") }, now) === "current", "180 days");
  expect(
    reviewState({ status: "verified", verifiedOn: day("2026-04-14") }, now) === "review-due",
    "181 days",
  );
  expect(reviewState({ status: "unverified" }, now) === "unverified", "missing verification");
  expect(displayedStatus("active", { status: "unverified" }) === "unverified", "stored active stays unverified");
  expect(
    displayedStatus("active", { status: "verified", verifiedOn: day("2026-09-01") }) === "active",
    "verified active",
  );
  expect(stalePublishedWarnings(root, now).length === 0, "draft records are not flagged");
});

check("directory uses one program record for status, filter, and draft exclusion", () => {
  const now = day("2026-10-12");
  const country = (id: string, name: string): ContentRecord<CountryDirectoryData> => ({
    id,
    data: {
      name,
      summary: "Summary",
      publishedAt: day("2026-10-01"),
      draft: false,
      material: "reported",
      verification: { status: "verified", verifiedOn: day("2026-09-01") },
    },
  });
  const program = (
    id: string,
    countryId: string,
    status: string,
    options: { draft?: boolean; comparison?: boolean; verifiedOn?: Date; amount?: number } = {},
  ): ContentRecord<ProgramDirectoryData> => ({
    id,
    data: {
      title: id,
      publishedAt: day("2026-10-01"),
      draft: options.draft ?? false,
      material: options.draft ? "demonstration" : "reported",
      comparison: options.comparison ?? false,
      programType: "fund",
      recordStatus: status,
      minimumInvestment:
        options.amount && options.amount > 0
          ? { state: "stated", currency: "EUR", amount: options.amount }
          : { state: "unknown" },
      verification: options.verifiedOn
        ? { status: "verified", verifiedOn: options.verifiedOn }
        : { status: "unverified" },
      country: countryId,
    },
  });
  const countries = [country("portugal", "Portugal"), country("greece", "Greece")];
  const programs = [
    program("zeta", "portugal", "active", { verifiedOn: day("2026-09-01"), amount: 1 }),
    program("alpha", "greece", "suspended", { verifiedOn: day("2020-01-01") }),
    program("hidden", "portugal", "active", { draft: true }),
    program("paired", "portugal", "active", { comparison: true, verifiedOn: day("2026-09-01"), amount: 1 }),
    program("stored-active", "greece", "active"),
    program("orphan", "missing", "closed", { verifiedOn: day("2026-09-01") }),
  ];
  const preview = buildDirectoryRows(programs, countries, "preview", now);
  expect(preview.unresolved.includes("orphan"), "missing country is unresolved");
  expect(!preview.rows.some((row) => row.programId === "paired"), "comparison records stay out");
  expect(
    preview.rows.find((row) => row.programId === "stored-active")?.status === "unverified",
    "preview does not show an unverified status as active",
  );
  const production = buildDirectoryRows(programs, countries, "production", now);
  expect(!production.rows.some((row) => row.programId === "hidden"), "drafts stay out of production");
  expect(!production.rows.some((row) => row.programId === "stored-active"), "unverified records stay out");
  const names = sortDirectory(production.rows).map((row) => row.programId);
  expect(names.join(",") === "alpha,zeta", names.join(","));
  const verifiedOrder = sortDirectory(production.rows, "verified").map((row) => row.programId);
  expect(verifiedOrder.join(",") === "zeta,alpha", verifiedOrder.join(","));
  expect(filterDirectory(production.rows, { status: "active" }).length === 1, "status filter");
  expect(filterDirectory(production.rows, { country: "greece" }).length === 1, "country filter");
  expect(filterDirectory(production.rows, { programType: "business" }).length === 0, "type filter");
  const stale = production.rows.find((row) => row.programId === "alpha");
  expect(stale?.review === "review-due" && stale.statusLabel === "Suspended", stale?.review ?? "missing");
  expect(stale?.investmentLabel === "Unknown", stale?.investmentLabel ?? "missing");
  expect(!production.rows.some((row) => row.investmentLabel.includes("$0")), "no zero amount");
  const countryRows = buildCountryRows(countries, production.rows, "production", now);
  expect(
    countryRows.find((row) => row.id === "portugal")?.programCount === 1,
    "country count follows the program collection",
  );
});

check("archives paginate, filter, and exclude unpublished records", () => {
  const published = {
    publishedAt: day("2026-10-01"),
    draft: false,
    material: "reported" as const,
    verification: { status: "verified" },
    comparison: false,
  };
  const story = (id: string, category: string, extra: Record<string, unknown> = {}) => ({
    id,
    href: `/news/${id}`,
    title: id,
    summary: "Summary",
    category,
    categoryLabel: category,
    publishedAt: day("2026-10-01"),
    countries: [],
    ...extra,
  });
  const stories = Array.from({ length: 25 }, (_, index) =>
    story(`story-${index + 1}`, index < 3 ? "policy" : "news"),
  );
  const first = paginate(stories, 1);
  const second = paginate(stories, 2);
  expect(first.items.length === 20 && first.pages === 2, "page size is 20");
  expect(second.items.length === 5 && second.items[0]?.id === "story-21", "second page");
  expect(pagePaths(25).map((path) => path.params.page).join(",") === "2", "static page paths");
  expect(pagePaths(20).length === 0, "a full first page has no second route");
  expect(filterNews(stories, "policy").length === 3, "policy filter");
  expect(paginationLinks("/news", 2, 2).prev === "/news", "previous link");
  expect(paginationLinks("/news/policy", 1, 2).next === "/news/policy/page/2", "next link");
  const reports = [
    story("featured", "research", { featured: true, researchType: "policy-analysis" }),
    story("other", "research", { researchType: "market-research" }),
    story("paired", "research", { researchType: "policy-analysis", comparison: true }),
  ];
  const split = splitFeatured(reports);
  expect(split.featured?.id === "featured" && split.rest.length === 2, "featured report is separate");
  expect(filterReports(reports, "market-research").map((item) => item.id).join(",") === "other", "research type");
  expect(filterReports(reports, "policy-analysis").some((item) => item.id === "paired"), "type filter keeps the record");
  const archivePublished = isArchiveEntry({ id: "public", data: published });
  const archiveDraft = isArchiveEntry({
    id: "draft",
    data: { ...published, draft: true, material: "demonstration" },
  });
  const archiveComparison = isArchiveEntry({ id: "paired", data: { ...published, comparison: true } });
  expect(archivePublished && !archiveDraft && !archiveComparison, "drafts stay out of archives");
  const countries = [
    { name: "Portugal", region: "europe" as const, regionLabel: "Europe" },
    { name: "Greece", region: "europe" as const, regionLabel: "Europe" },
    { name: "Sample", region: "asia" as const, regionLabel: "Asia" },
  ];
  expect(filterCountries(countries, "port", "all").map((row) => row.name).join(",") === "Portugal", "search");
  expect(filterCountries(countries, "", "asia").length === 1, "region filter");
  expect(groupCountries(countries).map((group) => group.region).join(",") === "europe,asia", "region groups");
  expect(reservedArchiveSlug("news", "policy") && !reservedArchiveSlug("news", "portugal"), "reserved slug");
  expect(reservedArchiveSlug("reports", "page"), "reports page slug is reserved");
  expect(regionQueryMatches("asia", "asia-pacific") && regionQueryMatches("oceania", "asia-pacific"), "asia-pacific");
  expect(!regionQueryMatches("europe", "asia-pacific") && regionQueryMatches("europe", "europe"), "region query");
});

check("topics and authors use one published assignment", () => {
  const published = {
    publishedAt: day("2026-10-01"),
    draft: false,
    material: "reported" as const,
    verification: { status: "verified" },
    comparison: false,
  };
  const residence = {
    id: "residence-note",
    data: { ...published, topic: "residency-by-investment", authors: ["editor"], title: "Residence", description: "Residence", category: "policy" },
  };
  const citizenship = {
    id: "citizenship-note",
    data: { ...published, topic: "citizenship-by-investment", authors: ["editor"], title: "Citizenship", description: "Citizenship", category: "policy" },
  };
  const draft = {
    id: "draft-note",
    data: { ...published, draft: true, material: "demonstration" as const, topic: "golden-visa", authors: ["editor"] },
  };
  expect(matchesTopic(residence, "residency-by-investment"), "primary topic");
  expect(!matchesTopic(residence, "citizenship-by-investment"), "one hub");
  expect(!matchesTopic(draft, "golden-visa"), "draft topic stays off the hub");
  expect(articlesByAuthor([residence, citizenship, draft], "editor").map((entry) => entry.id).join(",") === "residence-note,citizenship-note", "author articles");
  const coverage = topicCoverage([
    { collection: "news", id: "residence-note", topic: "residency-by-investment" },
    { collection: "news", id: "open-note" },
  ]);
  expect(coverage.byTopic["residency-by-investment"] === 1, "topic count");
  expect(coverage.unassigned.map((item) => item.id).join(",") === "open-note", "unassigned topic");
  expect(!authorPageInProduction({ id: "desk", data: { draft: true, developmentOnly: true, material: "demonstration" } }), "development author");
  expect(visibleAuthorInProduction({ id: "desk", data: { draft: false, material: "reported", verification: { status: "verified" } } }), "reported author");
  expect(newsInputSchema.safeParse({ topic: "best-visa" }).success === false, "unknown topic");
  const reviewed = newsInputSchema.safeParse({
    title: "Reviewed note",
    description: "A note.",
    publishedAt: "2026-10-01",
    draft: false,
    material: "reported",
    programTypes: ["fund"],
    authors: ["editor"],
    countries: ["portugal"],
    verification: { status: "verified", verifiedOn: "2026-10-01" },
    review: { reviewer: "editor" },
  });
  expect(reviewed.success === false, "review needs a date");
});

check("author records stay development-only demonstrations", () => {
  for (const file of ["demonstration-editor-one.md", "demonstration-editor-two.md"]) {
    const raw = readFileSync(path.join(root, "src", "content", "authors", file), "utf8");
    const parsed = authorSchema.parse(splitFrontmatter(raw).data);
    expect(parsed.developmentOnly === true, file);
    expect(parsed.draft === true, file);
    expect(parsed.material === "demonstration", file);
  }
});

check("forms stay closed and corrections stay empty", () => {
  expect(formResult(200, { ok: true }) === "success", "provider acceptance");
  expect(formResult(200, "ok") === "error", "non-json response");
  expect(formResult(200, { ok: false }) === "error", "provider rejection");
  expect(formResult(422, { ok: true }) === "error", "failed status");
  expect(
    site.forms.newsletter === null && site.forms.contact === null && site.forms.correction === null,
    "no form endpoint",
  );
  const published = {
    id: "amount-fix",
    data: {
      title: "Amount",
      summary: "The amount was wrong.",
      publishedAt: day("2026-10-01"),
      draft: false,
      material: "reported" as const,
      path: "/countries/portugal",
      previous: "Unknown",
      corrected: "The file did not state an amount.",
    },
  };
  const draft = {
    id: "draft-fix",
    data: { ...published.data, draft: true },
  };
  const elsewhere = {
    id: "other-fix",
    data: { ...published.data, path: "/news/alpha" },
  };
  expect(
    correctionsForPath([published, draft, elsewhere], "/countries/portugal")
      .map((entry) => entry.id)
      .join(",") === "amount-fix",
    "correction path",
  );
  expect(correctionSchema.safeParse({ title: "A", summary: "B" }).success === false, "correction schema");
  const files = readdirSync(path.join(root, "src", "content", "corrections")).filter((file) =>
    file.endsWith(".md") || file.endsWith(".mdx"),
  );
  expect(files.length === 0, "no manufactured corrections");
  const missingSource = auditContentFile(
    "corrections/amount.md",
    `---
title: Amount
summary: The amount was wrong.
publishedAt: 2026-10-01
draft: false
material: reported
path: /countries/portugal
previous: Unknown
corrected: The file did not state an amount.
---
`,
    correctionSchema,
  );
  expect(missingSource.some((item) => item.includes("https source")), "published correction needs a source");
});

check("publishing helpers stay empty and reject missing references", () => {
  const published = {
    publishedAt: day("2026-10-12"),
    draft: false,
    material: "reported" as const,
    verification: { status: "verified" },
  };
  const draft = {
    id: "draft-country",
    data: {
      ...published,
      draft: true,
      material: "demonstration" as const,
      name: "Draft land",
      summary: "Not published.",
      region: "europe" as const,
    },
  };
  const country = {
    id: "reported-country",
    data: {
      ...published,
      name: "Reported land",
      summary: "A published country summary.",
      region: "europe" as const,
      overview: "The overview is stored on the country record.",
    },
  };
  const program = {
    id: "reported-route",
    data: {
      ...published,
      title: "Reported route",
      country: "reported-country",
      programType: "fund" as const,
      recordStatus: "active",
      minimumInvestment: { state: "unknown" },
      investmentRoutes: { state: "unpublished" },
      governmentFees: { state: "unverified" },
    },
  };
  expect(archiveRecords([]).length === 0, "empty archive");
  expect(searchRecords([]).length === 0, "empty search");
  expect(feedRecords([]).length === 0, "empty feed");
  expect(publishedProgramsForCountry([], [], "reported-country").rows.length === 0, "empty program facts");
  expect(publishedHref("countries", draft) === undefined, "draft country is not a destination");
  expect(publishedHref("countries", country) === "/countries/reported-country", "published country destination");
  const facts = countryFacts(country);
  expect(facts.name === "Reported land" && facts.regionLabel === "Europe", "country facts");
  expect(!("investmentLabel" in facts), "country facts do not carry an investment amount");
  const money = programMoneyFacts(program);
  expect(money.investmentLabel === "Unknown", money.investmentLabel);
  expect(money.routesLabel === "Unpublished", money.routesLabel);
  expect(money.feesLabel === "Unverified", money.feesLabel);
  expect(!money.investmentLabel.includes("$") && !money.investmentLabel.includes("0"), "unknown amount");
  const rows = publishedProgramsForCountry([program], [country], "reported-country").rows;
  expect(rows.length === 1 && rows[0]?.investmentLabel === "Unknown", "tracker uses the program record");
  expect(searchRecords([program]).length === 1, "published program is searchable");
  expect(searchRecords([{ id: "paired", data: { ...program.data, comparison: true } }]).length === 0, "comparison stays out of search");
  expect(feedRecords([{ id: "paired", data: { ...program.data, comparison: true } }]).length === 0, "comparison stays out of feeds");
  const failures = auditContentFile(
    "invalid-published-image.md",
    readFixture("invalid-published-image.md"),
    newsInputSchema,
  );
  expect(failures.some((failure) => failure.includes("WebP or AVIF")), failures.join("\n"));
  expect(failures.some((failure) => failure.includes("updatedAt")), failures.join("\n"));
  expect(failures.some((failure) => failure.includes("comparison")), failures.join("\n"));
  const missing = missingReferenceFailures(
    "invalid-published-image.md",
    {
      draft: false,
      authors: ["missing-author"],
      countries: ["missing-country"],
      relatedNews: ["missing-news"],
      relatedReports: [],
    },
    { authors: new Set(), countries: new Set(), news: new Set(), reports: new Set() },
  );
  expect(missing.some((failure) => failure.includes("missing-author")), "missing author");
  expect(missing.some((failure) => failure.includes("missing-country")), "missing country");
  expect(missing.some((failure) => failure.includes("missing-news")), "missing related news");
  expect(
    missingReferenceFailures("draft.md", { draft: true, countries: ["missing-country"] }, {
      authors: new Set(),
      countries: new Set(),
      news: new Set(),
      reports: new Set(),
    }).length === 0,
    "drafts skip relation checks",
  );
  expect(investmentThresholdSchema.safeParse({ state: "unknown" }).success, "unknown amount is valid");
  expect(investmentThresholdSchema.safeParse({ state: "unpublished" }).success, "unpublished amount is valid");
});

check("indexing follows the records a route displays", () => {
  const published = {
    publishedAt: new Date("2026-10-12T00:00:00Z"),
    draft: false as const,
    material: "reported" as const,
    verification: { status: "verified" },
  };
  expect(
    !recordCountsForIndex({ id: "draft", data: { ...published, draft: true, material: "demonstration" } }),
    "draft",
  );
  expect(!recordCountsForIndex({ id: "demo", data: { ...published, material: "demonstration" } }), "demonstration");
  expect(!recordCountsForIndex({ id: "compare", data: { ...published, comparison: true } }), "comparison");
  expect(recordCountsForIndex({ id: "note", data: published }), "published record");
  expect(
    !authorCountsForIndex({ id: "editor", data: { draft: true, developmentOnly: true, material: "demonstration" } }),
    "draft author",
  );
  expect(!shouldResolveContentImage({ draft: true, material: "demonstration" }, true), "production omits the draft image");
  expect(shouldResolveContentImage({ draft: true, material: "demonstration" }, false), "development keeps the preview image");
  expect(
    shouldResolveContentImage({ draft: false, material: "reported", verification: { status: "verified" } }, true),
    "published image",
  );
  expect(
    !shouldResolveContentImage({ draft: false, material: "demonstration", verification: { status: "verified" } }, true),
    "demonstration image",
  );

  const empty = indexInventory();
  expect(!sectionIndexable("/news", empty), "zero news");
  expect(!sectionIndexable("/news/policy", empty), "zero policy");
  expect(!sectionIndexable("/reports", empty), "zero research");
  expect(!sectionIndexable("/reports/policy-analysis", empty), "zero policy analysis");
  expect(!sectionIndexable("/countries", empty), "zero countries");
  expect(!sectionIndexable("/programs", empty), "zero programs");
  expect(!sectionIndexable("/tracker", empty), "zero tracker");
  expect(!sectionIndexable("/topics/golden-visa", empty), "zero topic");
  expect(sectionIndexable("/", empty), "home");
  expect(sectionIndexable("/about", empty), "about");
  expect(sectionIndexable("/corrections", empty), "corrections policy");
  expect(!sectionIndexable("/contact", empty), "contact");
  expect(!sectionIndexable("/newsletter", empty), "newsletter");
  expect(!sectionIndexable("/search", empty) && !sectionIndexable("/thanks", empty), "utility");
  expect(!sectionIndexable("/foundation", empty) && !sectionIndexable("/404", empty), "private");
  expect(sectionIndexable("/contact", indexInventory({ contactConfigured: true })), "configured contact");
  expect(sectionIndexable("/newsletter", indexInventory({ newsletterConfigured: true })), "configured newsletter");
  expect(
    robotsDirectiveFor({ dev: false, origin: null }, sectionIndexable("/", empty)) === "noindex, follow",
    "null origin",
  );
  expect(
    robotsDirectiveFor({ dev: false, origin: "https://example.com" }, sectionIndexable("/news", empty)) === "noindex, follow",
    "empty archive",
  );

  const relevant = indexInventory({
    news: [{ id: "policy-note", category: "policy", topic: "golden-visa", countryIds: ["portugal"] }],
  });
  expect(sectionIndexable("/news", relevant) && sectionIndexable("/news/policy", relevant), "relevant news");
  expect(!sectionIndexable("/news/legislation", relevant) && !sectionIndexable("/news/regulation", relevant), "other categories");
  expect(sectionIndexable("/topics/golden-visa", relevant), "matching topic");
  expect(
    !sectionIndexable("/topics/residency-by-investment", relevant) &&
      !sectionIndexable("/topics/citizenship-by-investment", relevant),
    "other topics",
  );
  expect(!sectionIndexable("/reports", relevant) && !sectionIndexable("/countries", relevant), "unrelated archives");
  expect(allowInSitemap("https://example.com/news", relevant), "sitemap includes the news archive");
  expect(!allowInSitemap("https://example.com/news/legislation", relevant), "sitemap omits the empty category");
  expect(
    robotsDirectiveFor({ dev: false, origin: "https://example.com" }, sectionIndexable("/news", relevant)) === "index, follow",
    "relevant news can be indexed",
  );

  const draftsOnly = indexInventory();
  expect(!sectionIndexable("/news", draftsOnly) && !sectionIndexable("/topics/golden-visa", draftsOnly), "drafts only");

  const other = indexInventory({
    news: [{ id: "bill", category: "legislation", topic: "citizenship-by-investment", countryIds: [] }],
    reports: [{ id: "market", researchType: "market-research", countryIds: [] }],
  });
  expect(sectionIndexable("/news", other) && !sectionIndexable("/news/policy", other), "legislation does not fill policy");
  expect(sectionIndexable("/news/legislation", other), "legislation archive");
  expect(!sectionIndexable("/topics/golden-visa", other), "different topic");
  expect(sectionIndexable("/topics/citizenship-by-investment", other), "citizenship topic");
  expect(sectionIndexable("/reports", other) && sectionIndexable("/reports/market-research", other), "market research");
  expect(!sectionIndexable("/reports/policy-analysis", other) && !sectionIndexable("/reports/country-research", other), "other report types");

  const unpublishedCountry = indexInventory({
    programs: [{ id: "route", countryId: "portugal", topic: "golden-visa", countryIds: [] }],
  });
  expect(!sectionIndexable("/programs", unpublishedCountry) && !sectionIndexable("/tracker", unpublishedCountry), "hidden program");
  expect(!sectionIndexable("/topics/golden-visa", unpublishedCountry), "topic needs a displayed record");

  const paired = indexInventory({
    programs: [{ id: "route", countryId: "portugal", topic: "golden-visa", countryIds: [] }],
    countries: [{ id: "portugal", countryIds: [] }],
  });
  expect(sectionIndexable("/programs", paired) && sectionIndexable("/tracker", paired) && sectionIndexable("/countries", paired), "displayed program");
  expect(sectionIndexable("/topics/golden-visa", paired) && !sectionIndexable("/topics/residency-by-investment", paired), "program topic");

  const live = loadPublicationInventory();
  expect(
    live.news.length === 0 &&
      live.reports.length === 0 &&
      live.programs.length === 0 &&
      live.countries.length === 0 &&
      live.authors.length === 0 &&
      live.press.length === 0,
    "current drafts are not index records",
  );
  expect(!routeIndexable("/news") && !routeIndexable("/newsletter") && !routeIndexable("/contact"), "live empty routes");
  expect(routeIndexable("/") && routeIndexable("/corrections") && routeIndexable("/about"), "live trust routes");
  expect(!sectionIndexable("/press", empty) && !sectionIndexable("/press/layout-preview-release", empty), "press preview");
  const publishedPress = indexInventory({
    press: [{ id: "notice", countryIds: [] }],
  });
  expect(sectionIndexable("/press", publishedPress) && sectionIndexable("/press/notice", publishedPress), "published press room");
  expect(!sectionIndexable("/press/missing", publishedPress), "missing press release");
  expect(allowInSitemap("https://example.com/press", publishedPress), "sitemap includes a populated press room");
  expect(!allowInSitemap("https://example.com/press", empty), "sitemap omits an empty press room");
  expect(
    robotsDirectiveFor({ dev: false, origin: null }, sectionIndexable("/press", publishedPress)) === "noindex, follow",
    "press stays noindex without an origin",
  );
  expect(
    robotsDirectiveFor({ dev: false, origin: "https://example.com" }, sectionIndexable("/press", publishedPress)) === "index, follow",
    "press can be indexed with an origin and a release",
  );
  const pressRoutes = pressRouteParams(
    [
      {
        id: "notice",
        data: {
          publishedAt: new Date("2026-10-12T00:00:00Z"),
          draft: false,
          material: "reported",
          verification: { status: "verified" },
        },
      },
      {
        id: "layout-preview-release",
        data: {
          publishedAt: new Date("2026-09-13T00:00:00Z"),
          draft: true,
          material: "demonstration",
          verification: { status: "unverified" },
        },
      },
    ],
    true,
  );
  expect(pressRoutes.length === 1 && pressRoutes[0]?.params.slug === "notice", "production press routes omit the fixture");
  const previewRoutes = pressRouteParams(
    [
      {
        id: "layout-preview-release",
        data: {
          publishedAt: new Date("2026-09-13T00:00:00Z"),
          draft: true,
          material: "demonstration",
        },
      },
    ],
    false,
  );
  expect(previewRoutes[0]?.params.slug === "layout-preview-release", "preview keeps the fixture route");
  const links = supportingLinks(
    ["note", "missing", "note"],
    "news",
    [
      { id: "note", title: "A note", archive: true },
      { id: "draft", title: "A draft", archive: false },
    ],
    true,
  );
  expect(links.length === 1 && links[0]?.href === "/news/note", "supporting links omit missing and unpublished records");
  expect(!sectionIndexable("/llms.txt", empty) && !sectionIndexable("/content-index.json", empty), "machine files stay out of the index");
  expect(!sectionIndexable("/content/news/policy-note.md", relevant), "markdown copy stays out of the index");
});

check("machine-readable copies follow published records", () => {
  const published = {
    publishedAt: new Date("2026-10-12T00:00:00Z"),
    draft: false as const,
    material: "reported" as const,
    verification: { status: "verified" },
  };
  expect(!includeInMachineLayer({ id: "draft", data: { ...published, draft: true, material: "demonstration" } }), "draft");
  expect(!includeInMachineLayer({ id: "unverified", data: { ...published, verification: { status: "unverified" } } }), "incomplete");
  expect(!includeInMachineLayer({ id: "compare", data: { ...published, comparison: true } }), "comparison");
  expect(includeInMachineLayer({ id: "note", data: published }), "published");
  expect(
    !includeAuthorInMachineLayer({ id: "editor", data: { draft: true, developmentOnly: true, material: "demonstration" } }),
    "draft author",
  );
  const names = publishedNames(["portugal", "missing"], new Map([["portugal", "Portugal"]]));
  expect(names.length === 1 && names[0]?.name === "Portugal", "missing country is omitted");

  const emptyIndex = contentIndexDocument(null, []);
  expect(emptyIndex.records.length === 0 && emptyIndex.origin === null, "empty index");
  expect(!JSON.stringify(emptyIndex).includes("canonical"), "empty index has no canonical");
  expect(markdownDocuments(null, []).length === 0, "no markdown files");
  const emptyLlms = llmsText(null, []);
  expect(emptyLlms.includes("No news, research reports, country profiles, program records, or press releases are published."), "empty llms");
  expect(!emptyLlms.includes("https://"), "no invented origin");

  const news = {
    collection: "news" as const,
    id: "policy-note",
    title: "Recorded policy note",
    description: "A published description.",
    publishedAt: new Date("2026-10-12T00:00:00Z"),
    topic: "golden-visa",
    countries: [{ id: "portugal", name: "Portugal" }],
    authors: [{ id: "ada", name: "Ada" }],
    path: "/news/policy-note",
    body: "The body is the stored text.",
    sources: [{ label: "Official notice", url: "https://example.com/notice" }],
  };
  const program = {
    collection: "programs" as const,
    id: "route",
    title: "Recorded route",
    description: "A published program description.",
    publishedAt: new Date("2026-10-11T00:00:00Z"),
    countries: [{ id: "portugal", name: "Portugal" }],
    authors: [{ id: "ada", name: "Ada" }],
    path: "/programs/route",
    investmentLabel: "Unknown",
    currencyLabel: "Unknown",
    routesLabel: "Unpublished",
    feesLabel: "Unverified",
    statusLabel: "Unverified",
  };
  const entries = [news, program];
  const index = contentIndexDocument(null, entries);
  expect(index.records.length === 2, "two records");
  expect(!JSON.stringify(index).includes("canonical"), "origin null omits canonical");
  expect(index.records[0]?.minimumInvestment === undefined && index.records[1]?.minimumInvestment === "Unknown", "investment label");
  const withOrigin = contentIndexDocument("https://goldenvisaresearch.com", entries);
  expect(withOrigin.records[0]?.canonical === "https://goldenvisaresearch.com/news/policy-note", "canonical from origin");
  const markdown = markdownDocument(null, program);
  expect(markdown.startsWith("# Recorded route"), "markdown title");
  expect(markdown.includes("Minimum investment: Unknown"), "unknown amount");
  expect(markdown.includes("Government fees: Unverified"), "separate fee");
  expect(!markdown.includes("$0") && !markdown.includes("Canonical:"), "no zero and no canonical");
  const sourced = markdownDocument("https://goldenvisaresearch.com", news);
  expect(sourced.includes("Canonical: https://goldenvisaresearch.com/news/policy-note"), "markdown canonical");
  expect(sourced.includes("The body is the stored text."), "same body");
  const listed = llmsText("https://goldenvisaresearch.com", entries);
  expect(listed.includes("[Recorded policy note](https://goldenvisaresearch.com/news/policy-note)"), "llms link");
  expect(contentIndexText(null, []).includes('"records": []'), "serialized empty index");
  expect(markdownDocuments(null, entries).map((item) => item.path).join(",") === "/content/news/policy-note.md,/content/programs/route.md", "markdown paths");
});

check("editorial coverage and newsletter placement follow the shared rules", () => {
  const day = (value: string) => new Date(`${value}T00:00:00Z`);
  const item = (
    id: string,
    date: string,
    topic: string,
    author: string,
    country: string,
    programType: string,
  ) => ({
    id,
    collection: "news",
    href: `/news/${id}`,
    title: id,
    category: "News",
    publishedAt: day(date),
    topic,
    authorIds: [author],
    countryIds: [country],
    programTypes: [programType],
    placeholder: true,
  });
  const groups = buildCoverage(
    {
      id: "article",
      collection: "news",
      topic: "golden-visa",
      authorIds: ["editor"],
      countryIds: ["italy"],
      programTypes: ["donation"],
    },
    [
      item("news", "2026-09-16", "residency-by-investment", "editor", "portugal", "real-estate"),
      item("report", "2026-09-15", "golden-visa", "editor", "greece", "fund"),
      item("press", "2026-09-13", "golden-visa", "desk", "portugal", "unspecified"),
      item("beta", "2026-09-11", "residency-by-investment", "editor", "italy", "donation"),
      item("gamma", "2026-09-10", "citizenship-by-investment", "editor", "italy", "government-bond"),
      item("delta", "2026-09-09", "residency-by-investment", "editor", "italy", "real-estate"),
      item("epsilon", "2026-09-08", "citizenship-by-investment", "desk", "italy", "business"),
    ],
  );
  expect(groups.sidebar.map((entry) => entry.id).join(",") === "beta,gamma,delta", "sidebar");
  expect(groups.author.map((entry) => entry.id).join(",") === "news,report", "author group");
  expect(groups.topic.map((entry) => entry.id).join(",") === "press", "topic group");
  expect(groups.country.map((entry) => entry.id).join(",") === "epsilon", "country group");
  const paragraph = (index: number) => ({ type: "element", tagName: "p", value: String(index) });
  const six = [paragraph(1), paragraph(2), paragraph(3), paragraph(4), paragraph(5), paragraph(6)];
  expect(newsletterInsertIndex(six, { authors: ["editor"] }) === 3, "after the third paragraph");
  expect(newsletterInsertIndex(six.slice(0, 2), { authors: ["editor"] }) === null, "short article");
  expect(newsletterInsertIndex(six, { authors: ["editor"], newsletter: false }) === null, "override off");
  expect(newsletterInsertIndex(six, { name: "Portugal" }) === null, "country file");
  const split = [paragraph(1), paragraph(2), { type: "element", tagName: "ul" }, paragraph(3), paragraph(4), paragraph(5), paragraph(6)];
  expect(newsletterInsertIndex(split, { authors: ["editor"] }) === 4, "does not enter the list");
});

if (failed > 0) {
  console.error(`${failed} content checks failed`);
  process.exit(1);
}

console.log("content checks passed");
