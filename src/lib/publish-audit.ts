import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import type { z } from "astro/zod";
import { reservedArchiveSlug } from "./archive.ts";
import { reviewNote, reviewState, reviewWindowDays } from "./article-display.ts";
import {
  authorSchema,
  correctionSchema,
  countryInputSchema,
  newsInputSchema,
  pressInputSchema,
  programInputSchema,
  reportInputSchema,
} from "./content-schema.ts";

const placeholderHosts = new Set([
  "example.com",
  "example.org",
  "example.net",
  "example.edu",
  "localhost",
  "127.0.0.1",
]);

const collections = [
  { directory: "news", schema: newsInputSchema },
  { directory: "reports", schema: reportInputSchema },
  { directory: "countries", schema: countryInputSchema },
  { directory: "authors", schema: authorSchema },
  { directory: "programs", schema: programInputSchema },
  { directory: "corrections", schema: correctionSchema },
  { directory: "press", schema: pressInputSchema },
] as const;

export function splitFrontmatter(raw: string): { data: unknown; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw };
  return { data: parseYaml(match[1]), body: match[2] };
}

export function isPlaceholderSourceUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return true;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (placeholderHosts.has(host)) return true;
  const marker = value.toLowerCase();
  return (
    marker.includes("placeholder") ||
    marker.includes("changeme") ||
    marker.includes("[verify]")
  );
}

function stringsIn(value: unknown, found: string[] = []): string[] {
  if (typeof value === "string") {
    found.push(value);
    return found;
  }
  if (Array.isArray(value)) {
    for (const item of value) stringsIn(item, found);
    return found;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    for (const item of Object.values(value)) stringsIn(item, found);
  }
  return found;
}

export function auditPublishedRecord(
  file: string,
  data: Record<string, unknown>,
  body: string,
): string[] {
  const failures: string[] = [];
  const fail = (message: string) => failures.push(`${file}: ${message}`);
  const text = [...stringsIn(data), body];

  if (text.some((item) => item.includes("[VERIFY]"))) {
    fail("published text contains [VERIFY]");
  }

  if (data.material !== "reported") {
    fail("demonstration material cannot be published");
  }

  if (data.comparison === true) {
    fail("a comparison record cannot be published");
  }

  const publishedAt = data.publishedAt instanceof Date ? data.publishedAt : undefined;
  const updatedAt = data.updatedAt instanceof Date ? data.updatedAt : undefined;
  if (publishedAt && updatedAt && updatedAt.getTime() < publishedAt.getTime()) {
    fail("updatedAt is earlier than publishedAt");
  }

  const hero = data.hero as { src?: unknown; alt?: string; caption?: string; credit?: string } | undefined;
  if (hero) {
    if (!hero.alt || !hero.caption || !hero.credit) {
      fail("a published image needs alt text, a caption, and a credit");
    }
    if (typeof hero.src === "string" && !/\.(webp|avif)$/i.test(hero.src)) {
      fail("a published image must use WebP or AVIF");
    }
  }

  if (data.developmentOnly === true) {
    fail("a development-only author record cannot be published");
  }

  if (typeof data.linkedin === "string" && !data.linkedin.startsWith("https://")) {
    fail("a LinkedIn URL must use https");
  }

  for (const key of ["mediaContact", "boilerplate", "dateline", "organization"]) {
    const value = data[key];
    if (typeof value !== "string") continue;
    const marker = value.toLowerCase();
    if (
      marker.includes("[verify]") ||
      marker.includes("placeholder") ||
      marker.includes("changeme") ||
      marker.includes("example.com") ||
      marker.includes("design preview")
    ) {
      fail(`a published ${key} contains a placeholder`);
    }
  }

  if (typeof data.corrected === "string") {
    const source = data.source as { url?: string } | undefined;
    if (!source?.url || isPlaceholderSourceUrl(source.url) || !source.url.startsWith("https://")) {
      fail("a published correction needs an https source");
    }
  }

  const sources = Array.isArray(data.sources) ? data.sources : [];
  for (const source of sources) {
    if (!source || typeof source !== "object" || !("url" in source)) continue;
    const url = String(source.url);
    if (isPlaceholderSourceUrl(url) || !url.startsWith("https://")) {
      fail(`placeholder or non-https source URL: ${url}`);
    }
  }

  if ("verification" in data) {
    const verification = data.verification as {
      status?: string;
      verifiedOn?: unknown;
    };
    if (verification?.status !== "verified" || !verification.verifiedOn) {
      fail("mandatory verification fields are incomplete");
    }
    if (sources.length === 0) {
      fail("published research needs at least one source");
    }
  }

  const programs = Array.isArray(data.programs) ? data.programs : [];
  for (const program of programs) {
    if (!program || typeof program !== "object") continue;
    const record = program as {
      recordStatus?: string;
      minimumInvestment?: { state?: string; amount?: number };
    };
    if (
      record.recordStatus &&
      record.recordStatus !== "unverified" &&
      (data.verification as { status?: string } | undefined)?.status !== "verified"
    ) {
      fail("a stated program status requires completed verification");
    }
    if (
      record.minimumInvestment?.state === "stated" &&
      !(Number(record.minimumInvestment.amount) > 0)
    ) {
      fail("an investment threshold cannot be zero");
    }
  }

  if (typeof data.recordStatus === "string" && data.recordStatus !== "unverified") {
    const verification = data.verification as { status?: string } | undefined;
    if (verification?.status !== "verified") {
      fail("a stated program status requires completed verification");
    }
  }

  const statedInvestment = data.minimumInvestment as
    | { state?: string; amount?: number }
    | undefined;
  if (statedInvestment?.state === "stated" && !(Number(statedInvestment.amount) > 0)) {
    fail("an investment threshold cannot be zero");
  }
  if (statedInvestment?.state === "stated") {
    const verification = data.verification as { status?: string; verifiedOn?: unknown } | undefined;
    if (verification?.status !== "verified" || !verification.verifiedOn) {
      fail("a stated investment amount requires completed verification");
    }
  }

  const fees = data.governmentFees as { state?: string; amount?: number } | undefined;
  if (fees?.state === "stated" && !(Number(fees.amount) > 0)) {
    fail("a government fee cannot be zero");
  }
  if (fees?.state === "stated") {
    const verification = data.verification as { status?: string; verifiedOn?: unknown } | undefined;
    if (verification?.status !== "verified" || !verification.verifiedOn) {
      fail("a stated government fee requires completed verification");
    }
  }

  for (const key of [
    "investmentRoutes",
    "applicationRequirements",
    "physicalPresence",
    "citizenshipEligibility",
  ]) {
    const fact = data[key] as { state?: string } | undefined;
    if (fact?.state !== "stated") continue;
    const verification = data.verification as { status?: string; verifiedOn?: unknown } | undefined;
    if (verification?.status !== "verified" || !verification.verifiedOn) {
      fail("a stated program fact requires completed verification");
    }
  }

  return failures;
}

export function stalePublishedWarnings(root = process.cwd(), now = new Date()): string[] {
  const warnings: string[] = [];
  for (const collection of collections) {
    const directory = path.join(root, "src", "content", collection.directory);
    let entries: string[] = [];
    try {
      entries = walk(directory);
    } catch {
      continue;
    }
    for (const file of entries) {
      const raw = readFileSync(file, "utf8");
      const { data } = splitFrontmatter(raw);
      const parsed = collection.schema.safeParse(data);
      if (!parsed.success) continue;
      const record = parsed.data as {
        draft?: boolean;
        verification?: { status?: string; verifiedOn?: Date };
      };
      if (record.draft !== false) continue;
      if (reviewState(record.verification, now) !== "review-due") continue;
      const relative = path.relative(root, file);
      warnings.push(
        `${relative}: ${reviewNote(record.verification, now) || `outside the ${reviewWindowDays}-day review window`}`,
      );
    }
  }
  return warnings;
}

export function auditContentFile(file: string, raw: string, schema: z.ZodType): string[] {
  const { data, body } = splitFrontmatter(raw);
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    return parsed.error.issues.map(
      (issue) => `${file}: ${issue.path.join(".") || "frontmatter"} ${issue.message}`,
    );
  }
  const record = parsed.data as { draft?: boolean };
  if (record.draft !== false) return [];
  return auditPublishedRecord(file, record as Record<string, unknown>, body);
}

export function auditContentDirectory(root = process.cwd()): string[] {
  const failures: string[] = [];
  for (const collection of collections) {
    const directory = path.join(root, "src", "content", collection.directory);
    let entries: string[] = [];
    try {
      entries = walk(directory);
    } catch {
      failures.push(`${directory}: collection directory is missing`);
      continue;
    }
    for (const file of entries) {
      const id = path.basename(file).replace(/\.(md|mdx)$/, "");
      const relative = path.relative(root, file);
      if (reservedArchiveSlug(collection.directory, id)) {
        failures.push(`${relative}: ${id} is reserved for an archive route`);
      }
      const raw = readFileSync(file, "utf8");
      failures.push(...auditContentFile(relative, raw, collection.schema));
    }
  }
  failures.push(...auditPublishedRelations(root));
  return failures;
}

export function missingReferenceFailures(
  file: string,
  data: {
    draft?: boolean;
    authors?: string[];
    countries?: string[];
    country?: string;
    relatedNews?: string[];
    relatedReports?: string[];
  },
  known: { authors: Set<string>; countries: Set<string>; news: Set<string>; reports: Set<string> },
): string[] {
  if (data.draft !== false) return [];
  const failures: string[] = [];
  for (const id of data.authors ?? []) {
    if (!known.authors.has(id)) failures.push(`${file}: author ${id} is not a published author`);
  }
  const countries = [...(data.countries ?? [])];
  if (data.country) countries.push(data.country);
  for (const id of countries) {
    if (!known.countries.has(id)) failures.push(`${file}: country ${id} is not a published country`);
  }
  for (const id of data.relatedNews ?? []) {
    if (!known.news.has(id)) failures.push(`${file}: related news ${id} is not published`);
  }
  for (const id of data.relatedReports ?? []) {
    if (!known.reports.has(id)) failures.push(`${file}: related report ${id} is not published`);
  }
  return failures;
}

function publishedIds(directory: string, schema: z.ZodType): Set<string> {
  const ids = new Set<string>();
  let files: string[] = [];
  try {
    files = walk(directory);
  } catch {
    return ids;
  }
  for (const file of files) {
    const parsed = schema.safeParse(splitFrontmatter(readFileSync(file, "utf8")).data);
    if (!parsed.success) continue;
    const record = parsed.data as { draft?: boolean; material?: string; developmentOnly?: boolean };
    if (record.draft !== false || record.developmentOnly === true || record.material === "demonstration") continue;
    ids.add(path.basename(file).replace(/\.(md|mdx)$/, ""));
  }
  return ids;
}

function auditPublishedRelations(root: string): string[] {
  const contentRoot = path.join(root, "src", "content");
  const known = {
    authors: publishedIds(path.join(contentRoot, "authors"), authorSchema),
    countries: publishedIds(path.join(contentRoot, "countries"), countryInputSchema),
    news: publishedIds(path.join(contentRoot, "news"), newsInputSchema),
    reports: publishedIds(path.join(contentRoot, "reports"), reportInputSchema),
  };
  const authors = new Map<string, { draft?: boolean; developmentOnly?: boolean; material?: string }>();
  const authorDirectory = path.join(contentRoot, "authors");
  for (const file of walk(authorDirectory)) {
    const id = path.basename(file).replace(/\.(md|mdx)$/, "");
    const parsed = authorSchema.safeParse(splitFrontmatter(readFileSync(file, "utf8")).data);
    if (!parsed.success) continue;
    authors.set(id, parsed.data);
  }
  const failures: string[] = [];
  for (const collection of ["news", "reports", "programs"] as const) {
    const directory = path.join(root, "src", "content", collection);
    for (const file of walk(directory)) {
      const parsed = (collection === "programs" ? programInputSchema : collection === "reports" ? reportInputSchema : newsInputSchema).safeParse(
        splitFrontmatter(readFileSync(file, "utf8")).data,
      );
      if (!parsed.success || parsed.data.draft !== false) continue;
      const relative = path.relative(root, file);
      const ids = parsed.data.authors.map((author) => (typeof author === "string" ? author : author));
      for (const id of ids) {
        const author = authors.get(id);
        if (!author) {
          failures.push(`${relative}: author ${id} is not in the author collection`);
          continue;
        }
        if (author.draft !== false || author.developmentOnly === true || author.material === "demonstration") {
          failures.push(`${relative}: published work cannot name development author ${id}`);
        }
      }
      failures.push(
        ...missingReferenceFailures(
          relative,
          {
            draft: parsed.data.draft,
            countries: "countries" in parsed.data ? parsed.data.countries : undefined,
            country: "country" in parsed.data ? parsed.data.country : undefined,
            relatedNews: parsed.data.relatedNews,
            relatedReports: parsed.data.relatedReports,
          },
          known,
        ),
      );
    }
  }
  return failures;
}

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const name of readdirSync(directory)) {
    const fullPath = path.join(directory, name);
    if (statSync(fullPath).isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (name.endsWith(".md") || name.endsWith(".mdx")) files.push(fullPath);
  }
  return files;
}
