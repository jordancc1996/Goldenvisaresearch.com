import { getCollection } from "astro:content";
import { displayedStatus, programStatusLabel } from "./article-display";
import { referenceId } from "./content";
import {
  includeAuthorInMachineLayer,
  includeInMachineLayer,
  publishedNames,
  type MachineEntry,
  type MachineProgramFact,
} from "./machine-readable";
import { programMoneyFacts, publishedProgramsForCountry } from "./publishing";

type ProgramEntry = Awaited<ReturnType<typeof getCollection<"programs">>>[number];

function sourceList(sources: { label: string; url: string }[] | undefined) {
  return (sources ?? []).map((source) => ({ label: source.label, url: source.url }));
}

function programFact(program: ProgramEntry): MachineProgramFact {
  const money = programMoneyFacts(program);
  const status = displayedStatus(program.data.recordStatus, program.data.verification);
  return {
    name: program.data.title,
    path: `/programs/${program.id}`,
    investmentLabel: money.investmentLabel,
    currencyLabel: money.currencyLabel,
    routesLabel: money.routesLabel,
    feesLabel: money.feesLabel,
    statusLabel: programStatusLabel(status),
  };
}

export async function loadMachineEntries(): Promise<MachineEntry[]> {
  const [news, reports, programs, countries, authors, corrections, press] = await Promise.all([
    getCollection("news"),
    getCollection("reports"),
    getCollection("programs"),
    getCollection("countries"),
    getCollection("authors"),
    getCollection("corrections"),
    getCollection("press"),
  ]);
  const publishedCountries = new Map(
    countries.filter((entry) => includeInMachineLayer(entry)).map((entry) => [entry.id, entry.data.name]),
  );
  const publishedAuthors = new Map(
    authors.filter((entry) => includeAuthorInMachineLayer(entry)).map((entry) => [entry.id, entry.data.name]),
  );
  const publishedPrograms = programs.filter((entry) => includeInMachineLayer(entry));
  const entries: MachineEntry[] = [];

  for (const entry of news.filter((item) => includeInMachineLayer(item))) {
    entries.push({
      collection: "news",
      id: entry.id,
      title: entry.data.title,
      description: entry.data.description,
      publishedAt: entry.data.publishedAt,
      updatedAt: entry.data.updatedAt,
      topic: entry.data.topic,
      countries: publishedNames(entry.data.countries.map((country) => referenceId(country)), publishedCountries),
      authors: publishedNames(entry.data.authors.map((author) => referenceId(author)), publishedAuthors),
      path: `/news/${entry.id}`,
      body: entry.body,
      sources: sourceList(entry.data.sources),
    });
  }

  for (const entry of reports.filter((item) => includeInMachineLayer(item))) {
    entries.push({
      collection: "reports",
      id: entry.id,
      title: entry.data.title,
      description: entry.data.description,
      publishedAt: entry.data.publishedAt,
      updatedAt: entry.data.updatedAt,
      topic: entry.data.topic,
      countries: publishedNames(entry.data.countries.map((country) => referenceId(country)), publishedCountries),
      authors: publishedNames(entry.data.authors.map((author) => referenceId(author)), publishedAuthors),
      path: `/reports/${entry.id}`,
      body: entry.body,
      sources: sourceList(entry.data.sources),
    });
  }

  for (const entry of publishedPrograms) {
    const fact = programFact(entry);
    entries.push({
      collection: "programs",
      id: entry.id,
      title: entry.data.title,
      description: entry.data.description,
      publishedAt: entry.data.publishedAt,
      updatedAt: entry.data.updatedAt,
      topic: entry.data.topic,
      countries: publishedNames([referenceId(entry.data.country)], publishedCountries),
      authors: publishedNames(entry.data.authors.map((author) => referenceId(author)), publishedAuthors),
      path: fact.path,
      body: entry.body,
      sources: sourceList(entry.data.sources),
      investmentLabel: fact.investmentLabel,
      currencyLabel: fact.currencyLabel,
      routesLabel: fact.routesLabel,
      feesLabel: fact.feesLabel,
      statusLabel: fact.statusLabel,
    });
  }

  for (const entry of countries.filter((item) => includeInMachineLayer(item))) {
    const related = publishedProgramsForCountry(publishedPrograms, countries, entry.id);
    entries.push({
      collection: "countries",
      id: entry.id,
      title: entry.data.name,
      description: entry.data.summary,
      publishedAt: entry.data.publishedAt,
      updatedAt: entry.data.updatedAt,
      topic: entry.data.topic,
      countries: [{ id: entry.id, name: entry.data.name }],
      authors: [],
      path: `/countries/${entry.id}`,
      body: entry.data.overview,
      sources: sourceList(entry.data.sources),
      programs: related.rows.map((row) => {
        const program = publishedPrograms.find((item) => item.id === row.programId);
        return program
          ? programFact(program)
          : {
              name: row.programName,
              path: row.programHref,
              investmentLabel: row.investmentLabel,
              currencyLabel: "Unverified",
              routesLabel: "Unverified",
              feesLabel: "Unverified",
              statusLabel: row.statusLabel,
            };
      }),
    });
  }

  for (const entry of authors.filter((item) => includeAuthorInMachineLayer(item))) {
    entries.push({
      collection: "authors",
      id: entry.id,
      title: entry.data.name,
      description: entry.data.summary,
      countries: [],
      authors: [{ id: entry.id, name: entry.data.name }],
      path: `/authors/${entry.id}`,
      body: [entry.data.role, entry.data.disclosures].filter(Boolean).join("\n\n"),
    });
  }

  for (const entry of press.filter((item) => includeInMachineLayer(item))) {
    entries.push({
      collection: "press",
      id: entry.id,
      title: entry.data.title,
      description: entry.data.description,
      publishedAt: entry.data.publishedAt,
      updatedAt: entry.data.updatedAt,
      topic: entry.data.topic,
      countries: publishedNames(entry.data.countries.map((country) => referenceId(country)), publishedCountries),
      authors: publishedNames(entry.data.authors.map((author) => referenceId(author)), publishedAuthors),
      path: `/press/${entry.id}`,
      body: entry.body,
      sources: sourceList(entry.data.sources),
    });
  }

  for (const entry of corrections.filter((item) => includeInMachineLayer(item))) {
    entries.push({
      collection: "corrections",
      id: entry.id,
      title: entry.data.title,
      description: entry.data.summary,
      publishedAt: entry.data.publishedAt,
      countries: [],
      authors: [],
      path: "/corrections",
      body: `Previous: ${entry.data.previous}\n\nCorrected: ${entry.data.corrected}`,
      sources: entry.data.source ? [{ label: entry.data.source.label, url: entry.data.source.url }] : [],
    });
  }

  return entries.sort((left, right) => {
    const leftTime = left.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const rightTime = right.publishedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
    const date = rightTime - leftTime;
    if (date !== 0) return date;
    return left.path.localeCompare(right.path, "en");
  });
}
