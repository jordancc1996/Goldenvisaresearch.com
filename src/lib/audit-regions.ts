import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { auditRegionPages } from "../data/audits.ts";
import { expectedTitle, keywordPages } from "../data/page-keywords.ts";
import { auditRegions } from "./content-schema.ts";

export type AuditRegionCoverage = {
  regions: readonly string[];
  pages: readonly { region: string; path: string; title: string }[];
  pageFiles: ReadonlySet<string>;
  pageSources: ReadonlyMap<string, string>;
  keywordPaths: ReadonlyMap<string, string>;
  dynamicRoute: boolean;
};

/**
 * Each auditRegions value needs one auditRegionPages entry, one static page,
 * and one keyword entry. A [region].astro route would compete with [slug].astro.
 */
export function auditRegionGaps(coverage: AuditRegionCoverage): string[] {
  const failures: string[] = [];
  const seenRegions = new Set<string>();
  const seenPaths = new Set<string>();
  for (const page of coverage.pages) {
    if (seenRegions.has(page.region)) failures.push(`${page.region}: auditRegionPages repeats this region`);
    else seenRegions.add(page.region);
    if (seenPaths.has(page.path)) failures.push(`${page.path}: auditRegionPages repeats this path`);
    else seenPaths.add(page.path);
  }
  if (coverage.dynamicRoute) {
    failures.push("src/pages/audits/[region].astro competes with [slug].astro. Use a static file for each region.");
  }
  for (const region of coverage.regions) {
    const pages = coverage.pages.filter((page) => page.region === region);
    const route = `/audits/${region}`;
    if (pages.length !== 1) {
      failures.push(`${region}: needs one auditRegionPages entry`);
    } else if (pages[0]?.path !== route) {
      failures.push(`${region}: auditRegionPages path must be ${route}`);
    }
    const file = `${region}.astro`;
    if (!coverage.pageFiles.has(file)) {
      failures.push(`${region}: src/pages/audits/${file} is missing`);
    } else if (!coverage.pageSources.get(file)?.includes(`region="${region}"`)) {
      failures.push(`${region}: src/pages/audits/${file} must render AuditRegionPage for that region`);
    }
    const title = coverage.keywordPaths.get(route);
    if (!title) {
      failures.push(`${region}: needs a keyword entry for ${route}`);
    } else if (pages.length === 1 && title !== pages[0]?.title) {
      failures.push(`${region}: keyword title does not match the region page`);
    }
  }
  return failures;
}

export function auditRegionCoverageFailures(root = process.cwd()): string[] {
  const directory = path.join(root, "src", "pages", "audits");
  const names = existsSync(directory) ? readdirSync(directory) : [];
  const pageFiles = new Set(names);
  const pageSources = new Map(
    names.filter((name) => name.endsWith(".astro")).map((name) => [name, readFileSync(path.join(directory, name), "utf8")]),
  );
  const keywordPaths = new Map(keywordPages.map((page) => [page.path, expectedTitle(page)]));
  return auditRegionGaps({
    regions: auditRegions,
    pages: auditRegionPages,
    pageFiles,
    pageSources,
    keywordPaths,
    dynamicRoute: pageFiles.has("[region].astro"),
  });
}
