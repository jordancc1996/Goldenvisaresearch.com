import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { site } from "../src/data/site.ts";
import {
  comparisonPatterns,
  expectedTitle,
  keywordHits,
  keywordPages,
  type KeywordLocation,
} from "../src/data/page-keywords.ts";
import { extractHeadings, headingIssues, titleCase } from "../src/lib/headings.ts";
import { brokenInternalLinks, exactAnchorCounts, internalPath, orphanPaths, trailingSlashLinks, type LinkRef } from "../src/lib/links.ts";
import { routeIndexable } from "../src/lib/indexability.ts";
import { constructionModeFromValue, constructionNotice } from "../src/lib/preview-mode.ts";
import {
  allowInSitemap,
  articleSchema,
  personSchema,
  privatePaths,
  publicationGraph,
  robotsDirectiveFor,
  webPageSchema,
  withinNewsSitemapWindow,
} from "../src/lib/metadata.ts";

const root = process.cwd();
const locations: KeywordLocation[] = ["h1", "title", "description", "slug", "intro"];
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

function expect(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

check("construction mode stays on until the launch switch", () => {
  expect(constructionModeFromValue(undefined) === true, "unset");
  expect(constructionModeFromValue("") === true, "blank");
  expect(constructionModeFromValue("true") === true, "true");
  expect(constructionModeFromValue("false") === false, "false");
  expect(constructionModeFromValue("0") === false, "zero");
  expect(constructionModeFromValue("off") === false, "off");
});

function constructionContentRoute(route: string): boolean {
  if (/^\/(?:news|reports|programs|countries|authors|press)\/[^/]+$/.test(route)) return true;
  return /^\/(?:news|reports)\/(?:page\/\d+|[^/]+\/page\/\d+)$/.test(route);
}

check("robots keeps staging separate from production", () => {
  expect(robotsDirectiveFor({ dev: true, origin: "https://example.com" }, true) === "noindex, nofollow", "dev");
  expect(robotsDirectiveFor({ dev: false, origin: null }, true) === "noindex, follow", "no origin");
  expect(robotsDirectiveFor({ dev: false, origin: "https://example.com" }, false) === "noindex, follow", "private");
  expect(robotsDirectiveFor({ dev: false, origin: "https://example.com" }, true) === "index, follow", "public");
});

check("sitemap and news window exclude private and stale urls", () => {
  expect(allowInSitemap("https://example.com/about"), "about");
  expect(allowInSitemap("https://example.com/"), "home");
  expect(allowInSitemap("https://example.com/corrections"), "corrections");
  expect(!allowInSitemap("https://example.com/news"), "empty news");
  expect(!allowInSitemap("https://example.com/reports/policy-analysis"), "empty report type");
  expect(!allowInSitemap("https://example.com/countries"), "empty countries");
  expect(!allowInSitemap("https://example.com/programs"), "empty programs");
  expect(!allowInSitemap("https://example.com/tracker"), "empty tracker");
  expect(!allowInSitemap("https://example.com/topics/golden-visa"), "empty topic");
  expect(!allowInSitemap("https://example.com/newsletter"), "newsletter");
  expect(!allowInSitemap("https://example.com/contact"), "contact");
  expect(!allowInSitemap("https://example.com/thanks"), "thanks");
  expect(!allowInSitemap("https://example.com/foundation"), "foundation");
  expect(!allowInSitemap("https://example.com/404.html"), "404");
  expect(!allowInSitemap("https://example.com/search"), "search");
  expect(!allowInSitemap("https://example.com/llms.txt"), "llms");
  expect(!allowInSitemap("https://example.com/content-index.json"), "content index");
  expect(!allowInSitemap("https://example.com/content/news/note.md"), "markdown copy");
  const now = new Date("2026-10-12T12:00:00Z");
  expect(withinNewsSitemapWindow(new Date("2026-10-11T12:00:00Z"), now), "inside two days");
  expect(!withinNewsSitemapWindow(new Date("2026-10-09T12:00:00Z"), now), "older than two days");
});

check("schema uses documented identity only", () => {
  expect(publicationGraph(null) === null, "no origin graph");
  const graph = publicationGraph("https://example.com");
  const serialized = JSON.stringify(graph);
  expect(serialized.includes("Organization") && serialized.includes("WebSite"), "graph types");
  expect(!serialized.includes("BreadcrumbList"), "no breadcrumb schema");
  expect(!serialized.includes("address") && !serialized.includes("logo") && !serialized.includes("jobTitle"), "no invented fields");
  const article = articleSchema({
    collection: "news",
    headline: "A recorded headline",
    description: "A recorded deck.",
    canonical: "https://example.com/news/note",
    publishedAt: new Date("2026-10-12T00:00:00Z"),
    origin: "https://example.com",
    authors: [{ name: "Ada", url: "https://example.com/authors/ada" }],
  });
  expect(article["@type"] === "NewsArticle", "news article");
  expect(!JSON.stringify(article).includes("jobTitle"), "no credential");
  const report = articleSchema({
    collection: "reports",
    headline: "A report",
    description: "A deck.",
    canonical: "https://example.com/reports/note",
    publishedAt: new Date("2026-10-12T00:00:00Z"),
    origin: "https://example.com",
    authors: [],
  });
  expect(report["@type"] === "Article", "report article");
  const release = articleSchema({
    collection: "press",
    headline: "A release",
    description: "A deck.",
    canonical: "https://example.com/press/notice",
    publishedAt: new Date("2026-10-12T00:00:00Z"),
    origin: "https://example.com",
    organization: "Golden Visa Research",
    authors: [],
  });
  const releaseText = JSON.stringify(release);
  expect(release["@type"] === "Article" && !releaseText.includes("NewsArticle"), "press release is not a news article");
  expect(release.articleSection === "Press release", "press section");
  expect(release.mainEntityOfPage === "https://example.com/press/notice", "release canonical");
  expect(releaseText.includes("Golden Visa Research") && !releaseText.includes("\"@type\":\"Person\""), "organization author");
  const person = personSchema({
    name: "Ada",
    url: "https://example.com/authors/ada",
    description: "Recorded summary.",
  });
  expect(!JSON.stringify(person).includes("jobTitle") && !JSON.stringify(person).includes("alumniOf"), "person");
  const page = webPageSchema({
    name: "Portugal",
    description: "A profile.",
    url: "https://example.com/countries/portugal",
  });
  expect(page["@type"] === "WebPage", "country page");
});

check("heading validator reports case, count, and hierarchy", () => {
  expect(titleCase("policy analysis") === "Policy Analysis", "title case");
  expect(titleCase("residency by investment") === "Residency by Investment", "minor word");
  const clean = headingIssues([
    { level: 1, text: "Program Status" },
    { level: 2, text: "Latest news" },
    { level: 2, text: "Use of AI tools" },
  ]);
  expect(clean.length === 0, clean.join("; ") || "clean");
  const broken = headingIssues([
    { level: 1, text: "Program status" },
    { level: 3, text: "Skipped" },
    { level: 1, text: "Second" },
  ]);
  expect(broken.length >= 3, broken.join("; "));
  const newsletter = headingIssues([{ level: 1, text: "Policy changes, without the sales pitch." }]);
  expect(newsletter.length === 0, newsletter.join("; "));
});

check("keyword locations stay informational and record exceptions", () => {
  const keywords = new Set<string>();
  for (const page of keywordPages) {
    expect(page.intent === "informational", page.path);
    expect(!keywords.has(page.keyword), `shared keyword ${page.keyword}`);
    keywords.add(page.keyword);
    const text = `${page.h1} ${page.description} ${page.keyword}`;
    expect(!comparisonPatterns.some((pattern) => pattern.test(text)), `comparison ${page.path}`);
    const hits = keywordHits(page, page.description);
    for (const location of locations) {
      const exempt = page.exceptions.some((item) => item.location === location);
      if (!hits[location] && !exempt) {
        throw new Error(`${page.path} ${location} misses "${page.keyword}"`);
      }
    }
  }
});

check("link audit catches a missing route", () => {
  const links: LinkRef[] = [{ from: "/", href: "/research" }];
  const broken = brokenInternalLinks(links, new Set(["/", "/reports"]));
  expect(broken.length === 1, "research target");
  expect(trailingSlashLinks([{ from: "/", href: "/reports/" }]).length === 1, "slash");
  expect(orphanPaths(["/about"], [], new Set()).join(",") === "/about", "orphan");
  expect(internalPath("/countries?region=europe") === "/countries", "query");
});

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else files.push(full);
  }
  return files;
}

function routeFromHtml(file: string, dist: string): string {
  const relative = path.relative(dist, file).replaceAll("\\", "/");
  if (relative === "index.html") return "/";
  if (relative.endsWith("/index.html")) return `/${relative.slice(0, -"/index.html".length)}`;
  return `/${relative.slice(0, -".html".length)}`;
}

function strip(value: string): string {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

check("built pages match metadata, headings, links, and images", () => {
  const dist = path.join(root, "dist");
  expect(statSync(dist).isDirectory(), "dist");
  const htmlFiles = walk(dist).filter((file) => file.endsWith(".html"));
  const pages = htmlFiles.map((file) => ({
    file,
    route: routeFromHtml(file, dist),
    html: readFileSync(file, "utf8"),
  }));
  const routes = new Set(pages.map((page) => page.route));
  const links: LinkRef[] = [];
  const privateRoutes = new Set<string>(privatePaths);
  const home = pages.find((page) => page.route === "/");
  const construction = home?.html.includes(constructionNotice) === true;
  if (construction) {
    expect(home?.html.includes("/news/design-preview-lead") === true, "homepage lead");
    expect(home?.html.includes("<img") === true, "homepage image");
    expect(home?.html.includes("No news is published.") === false, "homepage is populated");
  }
  for (const page of pages) {
    const headings = extractHeadings(page.html);
    const parts = page.route.split("/").filter(Boolean);
    const archiveSlug = new Set([
      "policy",
      "legislation",
      "regulation",
      "policy-analysis",
      "market-research",
      "country-research",
    ]);
    const story =
      parts.length === 2 &&
      ["news", "reports", "programs", "countries", "authors"].includes(parts[0]) &&
      !archiveSlug.has(parts[1]);
    if (!story) {
      expect(page.html.includes('data-pagefind-ignore="all"'), `${page.route} is outside the search index`);
    }
    if (page.route === "/countries") expect(!page.html.includes("0 countries"), "country count");
    if (!construction && page.route === "/news") expect(!page.html.includes("Twenty stories"), "news page size");
    if (!construction && page.route === "/reports") expect(!page.html.includes("Twenty reports"), "research page size");
    const preserved = story
      ? headings.filter((heading) => heading.level === 1).map((heading) => heading.text)
      : [];
    if (construction) {
      for (const heading of headings) {
        if (
          (page.route === "/" && heading.level === 1) ||
          (heading.level > 1 && /^(Design [Pp]review|Demonstration|Layout [Pp]review|Placeholder)\b/.test(heading.text))
        ) {
          preserved.push(heading.text);
        }
      }
    }
    const issues = headingIssues(headings, preserved);
    expect(issues.length === 0, `${page.route}: ${issues.join("; ")}`);
    expect(page.html.includes('name="robots"'), `${page.route} robots`);
    expect(page.html.includes('property="og:title"'), `${page.route} open graph`);
    expect(page.html.includes('name="twitter:card" content="summary"'), `${page.route} twitter`);
    expect(!page.html.includes("BreadcrumbList"), `${page.route} breadcrumb schema`);
    if (!construction) {
      expect(!page.route.includes("layout-preview"), `${page.route} preview route`);
      expect(!/^\/press\/.+/.test(page.route), `${page.route} unpublished press release`);
      expect(!page.html.includes("Design preview"), `${page.route} design preview`);
      expect(!page.html.includes("layout-preview"), `${page.route} preview slug`);
    }
    if (page.route === "/press") {
      expect(page.html.includes(">Press Room<"), `${page.route} heading`);
      if (!construction) {
        expect(page.html.includes("No press releases have been published yet."), `${page.route} empty state`);
      }
    }
  expect(!page.html.includes('class="breadcrumb"'), `${page.route} breadcrumb`);
    expect(!/loading="lazy"/.test(page.html), `${page.route} lazy image`);
    for (const image of page.html.matchAll(/<img\b[^>]*>/g)) {
      const tag = image[0];
      expect(/\balt="[^"]+"/.test(tag), `${page.route} alt`);
      expect(/\bwidth="\d+"/.test(tag) && /\bheight="\d+"/.test(tag), `${page.route} dimensions`);
      expect(/\.webp/.test(tag) || /\.svg/.test(tag), `${page.route} image format`);
    }
    const title = page.html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
    const description = page.html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
    const visible = `${title} ${description} ${headings.map((heading) => heading.text).join(" ")}`;
    expect(!comparisonPatterns.some((pattern) => pattern.test(visible)), `${page.route} comparison query`);
    if (!site.origin) {
      expect(!page.html.includes('rel="canonical"'), `${page.route} canonical`);
      expect(!page.html.includes("application/ld+json"), `${page.route} schema`);
    }
    const directive = construction
      ? "noindex, nofollow"
      : robotsDirectiveFor({ dev: false, origin: site.origin }, routeIndexable(page.route));
    expect(page.html.includes(`content="${directive}"`), `${page.route} robots ${directive}`);
    const keyword = keywordPages.find((item) => item.path === page.route);
    if (keyword) {
      const h1 = headings.find((heading) => heading.level === 1)?.text ?? "";
      const main = page.html.split("<main")[1] ?? page.html;
      const intro = strip(
        main.match(/<p class="article-dek">([\s\S]*?)<\/p>/)?.[1] ??
          main.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] ??
          "",
      );
      if (!(construction && page.route === "/")) {
        expect(h1 === keyword.h1, `${page.route} h1 is "${h1}"`);
      }
      expect(title === expectedTitle(keyword), `${page.route} title is "${title}"`);
      expect(description === keyword.description, `${page.route} description`);
      const hits = keywordHits(keyword, intro);
      for (const location of locations) {
        const exempt = keyword.exceptions.some((item) => item.location === location);
        if (!hits[location] && !exempt) throw new Error(`${page.route} ${location}`);
      }
    } else if (!(construction && constructionContentRoute(page.route))) {
      expect(privateRoutes.has(page.route), `${page.route} has no keyword assignment`);
    }
    for (const match of page.html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      links.push({ from: page.route, href: match[1] });
    }
  }
  const broken = brokenInternalLinks(links, routes);
  expect(broken.length === 0, broken.map((link) => `${link.from} -> ${link.href}`).join(", ") || "links");
  const slashes = trailingSlashLinks(links);
  expect(slashes.length === 0, slashes.map((link) => link.href).join(", ") || "slashes");
  const orphans = orphanPaths(
    pages.map((page) => page.route).filter((route) => !privateRoutes.has(route)),
    links,
    privateRoutes,
  );
  expect(orphans.length === 0, `orphans ${orphans.join(", ")}`);
  const searchStatus = JSON.parse(readFileSync(path.join(dist, "pagefind", "status.json"), "utf8")) as {
    documents?: number;
  };
  expect(searchStatus.documents === 0, "search index stays empty without published pages");
  expect(!statExists(path.join(dist, "pagefind", "pagefind.js")), "empty index does not ship the search bundle");
  const robots = readFileSync(path.join(dist, "robots.txt"), "utf8");
  if (construction) {
    expect(robots.includes("Disallow: /") && !robots.includes("Sitemap:"), "construction robots");
  } else {
    expect(robots.includes("Disallow: /thanks") && robots.includes("Disallow: /foundation"), "robots private");
    expect(!site.origin ? !robots.includes("Sitemap:") : robots.includes("sitemap-index.xml"), "robots sitemap");
  }
  if (!site.origin) {
    expect(!statExists(path.join(dist, "rss.xml")), "rss withheld");
    expect(!statExists(path.join(dist, "news-sitemap.xml")), "news sitemap withheld");
    expect(!statExists(path.join(dist, "sitemap-index.xml")), "sitemap withheld");
  }
  for (const page of pages) {
    const counts = exactAnchorCounts(
      [...page.html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((match) => ({ text: strip(match[1]) })),
    );
    const heavy = [...counts.entries()].filter(([, count]) => count > 8);
    expect(heavy.length === 0, `${page.route} anchors ${heavy.map(([text, count]) => `${text} ${count}`).join(", ")}`);
  }
  const asset = path.join(root, "src", "assets", "demonstration-figure.webp");
  expect(statSync(asset).isFile(), "demonstration image retained");
  const leaked = filesUnder(dist).filter((file) => path.basename(file).includes("demonstration-figure"));
  if (construction) {
    expect(leaked.length > 0, "placeholder figure is in the build");
  } else {
    expect(leaked.length === 0, `draft image in dist: ${leaked.join(", ")}`);
    for (const file of filesUnder(dist)) {
      if (!/\.(html|js|mjs|css|txt|json)$/.test(file)) continue;
      expect(!readFileSync(file, "utf8").includes("demonstration-figure"), `${file} names the draft image`);
    }
  }
  for (const name of ["llms.txt", "content-index.json", "rss.xml", "news-sitemap.xml", "sitemap-index.xml"]) {
    const file = path.join(dist, name);
    if (!statExists(file)) continue;
    const text = readFileSync(file, "utf8");
    expect(!text.includes("design-preview") && !text.includes("layout-preview"), `${name} excludes placeholders`);
    expect(!text.includes("demonstration-figure"), `${name} excludes the placeholder figure`);
  }
  const llms = readFileSync(path.join(dist, "llms.txt"), "utf8");
  const index = JSON.parse(readFileSync(path.join(dist, "content-index.json"), "utf8")) as {
    origin?: string | null;
    records?: unknown[];
  };
  expect(llms.includes("No news, research reports, country profiles, program records, or press releases are published."), "empty llms");
  expect(!site.origin ? !llms.includes("https://") : llms.includes(site.origin), "llms origin");
  expect(!llms.includes("Demonstration"), "llms omits drafts");
  expect(index.origin === site.origin && Array.isArray(index.records) && index.records.length === 0, "empty content index");
  expect(!JSON.stringify(index).includes("canonical"), "content index omits canonical");
  expect(filesUnder(dist).filter((file) => file.endsWith(".md")).length === 0, "no article markdown");
});

function filesUnder(directory: string): string[] {
  let entries;
  try {
    entries = readdirSync(directory, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...filesUnder(full));
    else if (entry.isFile()) found.push(full);
  }
  return found;
}

function statExists(file: string): boolean {
  try {
    return statSync(file).isFile();
  } catch {
    return false;
  }
}

if (failed > 0) {
  console.error(`${failed} seo checks failed`);
  process.exit(1);
}

console.log("seo checks passed");
for (const page of keywordPages) {
  if (page.exceptions.length === 0) continue;
  console.log(`exception ${page.path}`);
  for (const item of page.exceptions) {
    console.log(`  ${item.location}: ${item.proposed}`);
  }
}
