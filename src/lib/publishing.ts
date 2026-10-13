/**
 * Country profiles, the tracker, and other summaries read program facts from the program record.
 * Minimum investment, currency, investment routes, and government fees stay separate.
 * Unknown, unverified, and unpublished values stay labeled. They are not replaced with zero or a guessed total.
 */
import { isArchiveEntry } from "./archive.ts";
import {
  entryHref,
  formatCurrencyFact,
  formatInvestmentThreshold,
  formatTextFact,
  shouldIndex,
  visibleAuthorInProduction,
  visibleInProduction,
  type ContentRecord,
} from "./content.ts";
import { regionLabels, type Region } from "./content-schema.ts";
import {
  buildDirectoryRows,
  programsForCountry,
  type CountryDirectoryData,
  type DirectoryRow,
  type ProgramDirectoryData,
} from "./directory.ts";

type Publishable = {
  publishedAt: Date;
  draft?: boolean;
  featured?: boolean;
  material?: "demonstration" | "reported";
  developmentOnly?: boolean;
  verification?: { status?: string };
  comparison?: boolean;
};

type MoneyFact = { state: string; currency?: string; amount?: number };
type TextFact = { state: string; text?: string };

export function archiveRecords<T extends Publishable>(entries: ContentRecord<T>[]): ContentRecord<T>[] {
  return entries.filter((entry) => isArchiveEntry(entry));
}

export function searchEligible<T extends Publishable>(entry: ContentRecord<T>): boolean {
  return shouldIndex(entry) && entry.data.comparison !== true;
}

export function searchRecords<T extends Publishable>(entries: ContentRecord<T>[]): ContentRecord<T>[] {
  return entries.filter((entry) => searchEligible(entry));
}

export function feedRecords<T extends Publishable>(entries: ContentRecord<T>[]): ContentRecord<T>[] {
  return entries.filter((entry) => visibleInProduction(entry) && entry.data.comparison !== true);
}

export function publishedHref<T extends Publishable>(
  collection: string,
  entry: ContentRecord<T> | undefined,
): string | undefined {
  if (!entry || !visibleInProduction(entry) || entry.data.comparison === true) return undefined;
  return entryHref(collection, entry.id);
}

export function publishedAuthorHref(
  entry: ContentRecord<{
    draft?: boolean;
    developmentOnly?: boolean;
    material?: "demonstration" | "reported";
    verification?: { status?: string };
  }>,
): string | undefined {
  if (!visibleAuthorInProduction(entry)) return undefined;
  return `/authors/${entry.id}`;
}

export function countryFacts(
  country: ContentRecord<CountryDirectoryData & { overview?: string; region?: Region }>,
): {
  id: string;
  name: string;
  summary: string;
  region: Region;
  regionLabel: string;
  publishedAt: Date;
  overview?: string;
  href?: string;
} {
  const region = country.data.region ?? "unrecorded";
  return {
    id: country.id,
    name: country.data.name,
    summary: country.data.summary,
    region,
    regionLabel: regionLabels[region],
    publishedAt: country.data.publishedAt,
    overview: country.data.overview,
    href: publishedHref("countries", country),
  };
}

export function programMoneyFacts(
  program: ContentRecord<
    ProgramDirectoryData & { investmentRoutes?: TextFact; governmentFees?: MoneyFact }
  >,
): { investmentLabel: string; currencyLabel: string; routesLabel: string; feesLabel: string } {
  return {
    investmentLabel: formatInvestmentThreshold(program.data.minimumInvestment),
    currencyLabel: formatCurrencyFact(program.data.minimumInvestment),
    routesLabel: formatTextFact(program.data.investmentRoutes),
    feesLabel: formatInvestmentThreshold(program.data.governmentFees ?? { state: "unverified" }),
  };
}

export function publishedProgramsForCountry(
  programs: ContentRecord<ProgramDirectoryData>[],
  countries: ContentRecord<CountryDirectoryData>[],
  countryId: string,
): { rows: DirectoryRow[]; unresolved: string[] } {
  const directory = buildDirectoryRows(programs, countries, "production");
  return {
    rows: programsForCountry(directory.rows, countryId),
    unresolved: directory.unresolved,
  };
}
