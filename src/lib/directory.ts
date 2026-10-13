import {
  displayedStatus,
  programStatusLabel,
  programTypeLabel,
  reviewNote,
  reviewState,
  verifiedLabel,
  type ReviewState,
} from "./article-display.ts";
import {
  formatInvestmentThreshold,
  referenceId,
  selectVisible,
  type ContentRecord,
  type EntryReference,
  type Visibility,
} from "./content.ts";
import { showsDemonstrationContent } from "./preview-mode.ts";
import { programStatuses, regionLabels, type ProgramStatus, type ProgramType, type Region } from "./content-schema.ts";

export type ProgramDirectoryData = {
  title: string;
  publishedAt: Date;
  draft?: boolean;
  featured?: boolean;
  material?: "demonstration" | "reported";
  developmentOnly?: boolean;
  comparison?: boolean;
  verification?: { status?: string; verifiedOn?: Date };
  programType: ProgramType;
  recordStatus: string;
  minimumInvestment: { state: string; currency?: string; amount?: number };
  country: EntryReference;
};

export type CountryDirectoryData = {
  name: string;
  summary: string;
  publishedAt: Date;
  draft?: boolean;
  featured?: boolean;
  material?: "demonstration" | "reported";
  developmentOnly?: boolean;
  comparison?: boolean;
  verification?: { status?: string; verifiedOn?: Date };
  region?: Region;
};

export type DirectoryRow = {
  countryId: string;
  countryName: string;
  countryHref: string;
  programId: string;
  programName: string;
  programHref: string;
  programType: ProgramType;
  programTypeLabel: string;
  status: ProgramStatus;
  statusLabel: string;
  investmentLabel: string;
  verifiedLabel: string;
  verifiedOn?: Date;
  review: ReviewState;
  reviewNote: string;
  draft: boolean;
};

export type CountryListRow = {
  id: string;
  name: string;
  href: string;
  summary: string;
  verifiedLabel: string;
  verifiedOn?: Date;
  review: ReviewState;
  reviewNote: string;
  programCount: number;
  programCountLabel: string;
  draft: boolean;
  region: Region;
  regionLabel: string;
  statusLabels: string[];
};

export type DirectorySort = "alphabetical" | "verified";

export type DirectoryFilter = {
  country?: string;
  programType?: string;
  status?: string;
};

export type DirectoryBuild = {
  rows: DirectoryRow[];
  unresolved: string[];
};

function visibilityDefault(): Visibility {
  return showsDemonstrationContent() ? "preview" : "production";
}

function compareNames(left: DirectoryRow, right: DirectoryRow): number {
  const country = left.countryName.localeCompare(right.countryName, "en");
  if (country !== 0) return country;
  return left.programName.localeCompare(right.programName, "en");
}

export function programCountLabel(count: number): string {
  if (count === 0) return "No programs recorded";
  if (count === 1) return "1 program recorded";
  return `${count} programs recorded`;
}

export function buildDirectoryRows(
  programs: ContentRecord<ProgramDirectoryData>[],
  countries: ContentRecord<CountryDirectoryData>[],
  visibility: Visibility = visibilityDefault(),
  now = new Date(),
): DirectoryBuild {
  const countryById = new Map(
    selectVisible(countries, visibility).map((country) => [country.id, country]),
  );
  const unresolved: string[] = [];
  const rows: DirectoryRow[] = [];

  for (const program of selectVisible(programs, visibility)) {
    if (program.data.comparison === true) continue;
    const countryId = referenceId(program.data.country);
    const country = countryById.get(countryId);
    if (!country) {
      unresolved.push(program.id);
      continue;
    }
    const verification = program.data.verification ?? { status: "unverified" };
    const status = displayedStatus(program.data.recordStatus, verification);
    const verifiedOn =
      verification.status === "verified" && verification.verifiedOn
        ? verification.verifiedOn
        : undefined;
    rows.push({
      countryId,
      countryName: country.data.name,
      countryHref: `/countries/${country.id}`,
      programId: program.id,
      programName: program.data.title,
      programHref: `/programs/${program.id}`,
      programType: program.data.programType,
      programTypeLabel: programTypeLabel(program.data.programType),
      status,
      statusLabel: programStatusLabel(status),
      investmentLabel: formatInvestmentThreshold(program.data.minimumInvestment),
      verifiedLabel: verifiedLabel({
        status: verification.status ?? "unverified",
        verifiedOn,
      }),
      verifiedOn,
      review: reviewState(verification, now),
      reviewNote: reviewNote(verification, now),
      draft: program.data.draft !== false,
    });
  }

  return { rows, unresolved };
}

export function sortDirectory(rows: DirectoryRow[], sort: DirectorySort = "alphabetical"): DirectoryRow[] {
  const copy = [...rows];
  if (sort === "verified") {
    return copy.sort((left, right) => {
      const leftTime = left.verifiedOn?.getTime() ?? -1;
      const rightTime = right.verifiedOn?.getTime() ?? -1;
      if (leftTime !== rightTime) return rightTime - leftTime;
      return compareNames(left, right);
    });
  }
  return copy.sort(compareNames);
}

export function filterDirectory(rows: DirectoryRow[], filter: DirectoryFilter): DirectoryRow[] {
  return rows.filter((row) => {
    if (filter.country && row.countryId !== filter.country) return false;
    if (filter.programType && row.programType !== filter.programType) return false;
    if (filter.status && row.status !== filter.status) return false;
    return true;
  });
}

export function programsForCountry(rows: DirectoryRow[], countryId: string): DirectoryRow[] {
  return sortDirectory(rows.filter((row) => row.countryId === countryId));
}

export function buildCountryRows(
  countries: ContentRecord<CountryDirectoryData>[],
  directoryRows: DirectoryRow[],
  visibility: Visibility = visibilityDefault(),
  now = new Date(),
): CountryListRow[] {
  return selectVisible(countries, visibility)
    .map((country) => {
      const verification = country.data.verification ?? { status: "unverified" };
      const verifiedOn =
        verification.status === "verified" && verification.verifiedOn
          ? verification.verifiedOn
          : undefined;
      const countryPrograms = directoryRows.filter((row) => row.countryId === country.id);
      const programCount = countryPrograms.length;
      const region = country.data.region ?? "unrecorded";
      const statusLabels = programStatuses
        .filter((status) => countryPrograms.some((row) => row.status === status))
        .map((status) => programStatusLabel(status));
      return {
        id: country.id,
        name: country.data.name,
        href: `/countries/${country.id}`,
        summary: country.data.summary,
        verifiedLabel: verifiedLabel({
          status: verification.status ?? "unverified",
          verifiedOn,
        }),
        verifiedOn,
        review: reviewState(verification, now),
        reviewNote: reviewNote(verification, now),
        programCount,
        programCountLabel: programCountLabel(programCount),
        draft: country.data.draft !== false,
        region,
        regionLabel: regionLabels[region],
        statusLabels,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}
