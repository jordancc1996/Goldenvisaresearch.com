import type { AuthorData, CountryData, NewsData, ProgramType } from "./content-schema";
import { showsDemonstrationContent } from "./preview-mode.ts";

export type Visibility = "production" | "preview";

export type EntryReference = string | { id: string; collection?: string };

type Dated = { publishedAt: Date; featured?: boolean; draft?: boolean };
type Located = Dated & {
  countries?: EntryReference[];
  programTypes?: ProgramType[];
  material?: "demonstration" | "reported";
  verification?: { status?: string };
  developmentOnly?: boolean;
  comparison?: boolean;
};

export type ContentRecord<T> = {
  id: string;
  body?: string;
  data: T;
};

const wordsPerMinute = 200;

export function referenceId(reference: EntryReference): string {
  return typeof reference === "string" ? reference : reference.id;
}

export function entryHref(collection: string, id: string): string {
  return `/${collection}/${id}`;
}

export function isProduction(): boolean {
  return typeof import.meta.env !== "undefined" && import.meta.env?.PROD === true;
}

export function isDraft(entry: ContentRecord<{ draft?: boolean }>): boolean {
  return entry.data.draft !== false;
}

export function isPublished(entry: ContentRecord<{ draft?: boolean; developmentOnly?: boolean }>): boolean {
  return entry.data.draft === false && entry.data.developmentOnly !== true;
}

export function visibleAuthorInProduction(
  entry: ContentRecord<{
    draft?: boolean;
    developmentOnly?: boolean;
    material?: "demonstration" | "reported";
    verification?: { status?: string };
  }>,
): boolean {
  if (entry.data.draft !== false) return false;
  if (entry.data.developmentOnly === true) return false;
  if (entry.data.material === "demonstration") return false;
  if (entry.data.verification && entry.data.verification.status !== "verified") return false;
  return true;
}

export function visibleInProduction(
  entry: ContentRecord<Located & { developmentOnly?: boolean }>,
): boolean {
  if (isDraft(entry)) return false;
  if (entry.data.developmentOnly === true) return false;
  if (entry.data.material === "demonstration") return false;
  if (entry.data.verification && entry.data.verification.status !== "verified") return false;
  return true;
}

export function contentVisibility(): Visibility {
  return showsDemonstrationContent() ? "preview" : "production";
}

export function isPublicEntry(
  entry: ContentRecord<Located & { developmentOnly?: boolean }>,
): boolean {
  if (showsDemonstrationContent()) return entry.data.comparison !== true;
  return visibleInProduction(entry);
}

export function selectVisible<T extends Located>(
  entries: ContentRecord<T>[],
  visibility: Visibility = contentVisibility(),
): ContentRecord<T>[] {
  if (visibility === "preview") return entries;
  return entries.filter((entry) => visibleInProduction(entry));
}

export function sortByDate<T extends Dated>(
  entries: ContentRecord<T>[],
  direction: "newest" | "oldest" = "newest",
): ContentRecord<T>[] {
  const factor = direction === "newest" ? -1 : 1;
  return [...entries].sort(
    (left, right) =>
      (left.data.publishedAt.getTime() - right.data.publishedAt.getTime()) * factor,
  );
}

export function featuredStories<T extends Located & { featured?: boolean }>(
  entries: ContentRecord<T>[],
  visibility: Visibility = contentVisibility(),
): ContentRecord<T>[] {
  return sortByDate(
    selectVisible(entries, visibility).filter((entry) => entry.data.featured === true),
  );
}

export function entryProgramTypes(
  entry: ContentRecord<{ programTypes?: ProgramType[]; programs?: { programType: ProgramType }[] }>,
): ProgramType[] {
  if (entry.data.programTypes) return entry.data.programTypes;
  if (entry.data.programs) return entry.data.programs.map((program) => program.programType);
  return [];
}

export function filterByProgramType<
  T extends { programTypes?: ProgramType[]; programs?: { programType: ProgramType }[] },
>(
  entries: ContentRecord<T & Located>[],
  programType: ProgramType,
  visibility: Visibility = contentVisibility(),
): ContentRecord<T & Located>[] {
  return selectVisible(entries, visibility).filter((entry) =>
    entryProgramTypes(entry).includes(programType),
  );
}

export function newsForCountry<T extends Located>(
  entries: ContentRecord<T>[],
  countryId: string,
  visibility: Visibility = contentVisibility(),
): ContentRecord<T>[] {
  return sortByDate(
    selectVisible(entries, visibility).filter((entry) =>
      (entry.data.countries ?? []).some((country) => referenceId(country) === countryId),
    ),
  );
}

export function relatedCoverage<T extends Located>(
  entry: ContentRecord<T>,
  candidates: ContentRecord<T>[],
  options: { limit?: number; visibility?: Visibility } = {},
): ContentRecord<T>[] {
  const visibility = options.visibility ?? contentVisibility();
  const limit = options.limit ?? 3;
  const countries = new Set((entry.data.countries ?? []).map(referenceId));
  const types = new Set(entryProgramTypes(entry));
  return sortByDate(
    selectVisible(candidates, visibility).filter((candidate) => {
      if (candidate.id === entry.id) return false;
      if (candidate.data.comparison === true) return false;
      const sharesCountry = (candidate.data.countries ?? []).some((country) =>
        countries.has(referenceId(country)),
      );
      const sharesType = entryProgramTypes(candidate).some((type) => types.has(type));
      return sharesCountry || sharesType;
    }),
  ).slice(0, limit);
}

export function readingTime(text: string): { words: number; minutes: number; label: string } {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  if (words === 0) return { words: 0, minutes: 0, label: "Not calculated" };
  const minutes = Math.ceil(words / wordsPerMinute);
  const unit = minutes === 1 ? "minute" : "minutes";
  return { words, minutes, label: `${minutes} ${unit}` };
}

export function formatInvestmentThreshold(value: {
  state: string;
  currency?: string;
  amount?: number;
}): string {
  if (
    value.state === "stated" &&
    typeof value.amount === "number" &&
    value.amount > 0 &&
    value.currency
  ) {
    return `${value.currency} ${value.amount}`;
  }
  if (value.state === "unknown") return "Unknown";
  if (value.state === "unpublished") return "Unpublished";
  return "Unverified";
}

export function formatCurrencyFact(value: {
  state: string;
  currency?: string;
  amount?: number;
}): string {
  if (
    value.state === "stated" &&
    typeof value.amount === "number" &&
    value.amount > 0 &&
    value.currency
  ) {
    return value.currency;
  }
  if (value.state === "unknown") return "Unknown";
  if (value.state === "unpublished") return "Unpublished";
  return "Unverified";
}

export function formatTextFact(value: { state: string; text?: string } | undefined): string {
  if (!value) return "Unverified";
  if (value.state === "stated" && value.text) return value.text;
  if (value.state === "unknown") return "Unknown";
  if (value.state === "unpublished") return "Unpublished";
  return "Unverified";
}

export function shouldIndex(entry: ContentRecord<Located & { developmentOnly?: boolean }>): boolean {
  return visibleInProduction(entry);
}

export function shouldEmitStructuredData(
  entry: ContentRecord<Located & { developmentOnly?: boolean }>,
): boolean {
  return visibleInProduction(entry);
}

export type NewsEntry = ContentRecord<NewsData>;
export type CountryEntry = ContentRecord<CountryData>;
export type AuthorEntry = ContentRecord<AuthorData>;
