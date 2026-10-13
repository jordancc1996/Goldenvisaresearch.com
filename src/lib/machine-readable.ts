import { site } from "../data/site.ts";
import { visibleAuthorInProduction, visibleInProduction, type ContentRecord } from "./content.ts";

type MachineRecordData = {
  publishedAt: Date;
  draft?: boolean;
  material?: "demonstration" | "reported";
  developmentOnly?: boolean;
  verification?: { status?: string };
  comparison?: boolean;
};

export type MachineCollection = "news" | "reports" | "programs" | "countries" | "authors" | "corrections" | "press";

export type MachineName = { id: string; name: string };

export type MachineProgramFact = {
  name: string;
  path: string;
  investmentLabel: string;
  currencyLabel: string;
  routesLabel: string;
  feesLabel: string;
  statusLabel: string;
};

export type MachineEntry = {
  collection: MachineCollection;
  id: string;
  title: string;
  description: string;
  publishedAt?: Date;
  updatedAt?: Date;
  topic?: string;
  countries: MachineName[];
  authors: MachineName[];
  path: string;
  body?: string;
  sources?: { label: string; url: string }[];
  investmentLabel?: string;
  currencyLabel?: string;
  routesLabel?: string;
  feesLabel?: string;
  statusLabel?: string;
  programs?: MachineProgramFact[];
};

export function includeInMachineLayer(entry: ContentRecord<MachineRecordData>): boolean {
  return visibleInProduction(entry) && entry.data.comparison !== true;
}

export function includeAuthorInMachineLayer(
  entry: ContentRecord<{
    draft?: boolean;
    developmentOnly?: boolean;
    material?: "demonstration" | "reported";
    verification?: { status?: string };
  }>,
): boolean {
  return visibleAuthorInProduction(entry);
}

export function publishedNames(ids: string[], published: Map<string, string>): MachineName[] {
  const names: MachineName[] = [];
  for (const id of ids) {
    const name = published.get(id);
    if (name) names.push({ id, name });
  }
  return names;
}

export function markdownPath(entry: { collection: string; id: string }): string {
  return `/content/${entry.collection}/${entry.id}.md`;
}

function isoDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function markdownDocument(origin: string | null, entry: MachineEntry): string {
  const lines = [`# ${entry.title}`, "", entry.description, ""];
  if (entry.publishedAt) lines.push(`Published: ${isoDay(entry.publishedAt)}`);
  if (entry.updatedAt) lines.push(`Updated: ${isoDay(entry.updatedAt)}`);
  if (entry.authors.length > 0) lines.push(`Authors: ${entry.authors.map((author) => author.name).join(", ")}`);
  if (entry.countries.length > 0) lines.push(`Countries: ${entry.countries.map((country) => country.name).join(", ")}`);
  if (entry.topic) lines.push(`Topic: ${entry.topic}`);
  if (entry.statusLabel) lines.push(`Status: ${entry.statusLabel}`);
  if (entry.investmentLabel) lines.push(`Minimum investment: ${entry.investmentLabel}`);
  if (entry.currencyLabel) lines.push(`Currency: ${entry.currencyLabel}`);
  if (entry.routesLabel) lines.push(`Investment routes: ${entry.routesLabel}`);
  if (entry.feesLabel) lines.push(`Government fees: ${entry.feesLabel}`);
  if (entry.programs) {
    lines.push("", "## Programs");
    if (entry.programs.length === 0) {
      lines.push("", "No programs are published for this country.");
    } else {
      for (const program of entry.programs) {
        lines.push(
          "",
          `### ${program.name}`,
          "",
          `Status: ${program.statusLabel}`,
          `Minimum investment: ${program.investmentLabel}`,
          `Currency: ${program.currencyLabel}`,
          `Investment routes: ${program.routesLabel}`,
          `Government fees: ${program.feesLabel}`,
          `HTML: ${program.path}`,
        );
      }
    }
  }
  if (entry.body?.trim()) lines.push("", entry.body.trim());
  if (entry.sources && entry.sources.length > 0) {
    lines.push("", "## Sources");
    for (const source of entry.sources) lines.push(`- ${source.label}: ${source.url}`);
  }
  lines.push("", `HTML: ${entry.path}`);
  if (origin) lines.push(`Canonical: ${new URL(entry.path, origin).href}`);
  lines.push("");
  return lines.join("\n");
}

export function markdownDocuments(
  origin: string | null,
  entries: MachineEntry[],
): { path: string; text: string }[] {
  return entries.map((entry) => ({ path: markdownPath(entry), text: markdownDocument(origin, entry) }));
}

export function contentIndexDocument(origin: string | null, entries: MachineEntry[]) {
  return {
    name: site.name,
    description: site.description,
    origin,
    authoritative: "html",
    records: entries.map((entry) => {
      const record: Record<string, unknown> = {
        collection: entry.collection,
        id: entry.id,
        title: entry.title,
        description: entry.description,
        path: entry.path,
        countries: entry.countries.map((country) => country.id),
        authors: entry.authors.map((author) => author.id),
        markdown: markdownPath(entry),
      };
      if (entry.publishedAt) record.publishedAt = entry.publishedAt.toISOString();
      if (entry.updatedAt) record.updatedAt = entry.updatedAt.toISOString();
      if (entry.topic) record.topic = entry.topic;
      if (entry.investmentLabel) record.minimumInvestment = entry.investmentLabel;
      if (entry.feesLabel) record.governmentFees = entry.feesLabel;
      if (entry.routesLabel) record.investmentRoutes = entry.routesLabel;
      if (origin) record.canonical = new URL(entry.path, origin).href;
      return record;
    }),
  };
}

export function contentIndexText(origin: string | null, entries: MachineEntry[]): string {
  return `${JSON.stringify(contentIndexDocument(origin, entries), null, 2)}\n`;
}

export function llmsText(origin: string | null, entries: MachineEntry[]): string {
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "The HTML pages are authoritative. This file, the content index, and the Markdown copies are generated from the same published records.",
  ];
  if (!origin) {
    lines.push("", "The canonical origin is not configured. This file does not publish absolute URLs.");
  }
  if (entries.length === 0) {
    lines.push("", "No news, research reports, country profiles, program records, or press releases are published.");
  } else {
    lines.push("", "## Published records");
    for (const entry of entries) {
      const href = origin ? new URL(entry.path, origin).href : entry.path;
      lines.push(`- [${entry.title}](${href}): ${entry.description}`);
    }
  }
  lines.push(
    "",
    "Drafts, demonstration files, development fixtures, and utility pages are omitted.",
    origin ? `Content index: ${new URL("/content-index.json", origin).href}` : "Content index: /content-index.json",
    "",
  );
  return lines.join("\n");
}
