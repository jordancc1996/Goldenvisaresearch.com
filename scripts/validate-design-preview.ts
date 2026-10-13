import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { constructionNotice } from "../src/lib/preview-mode.ts";

const root = process.cwd();
const dist = path.join(root, "dist");
let failed = 0;

function expect(condition: boolean, message: string) {
  if (condition) {
    console.log(`ok  ${message}`);
    return;
  }
  failed += 1;
  console.error(`fail  ${message}`);
}

function walk(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) found.push(...walk(full));
    else found.push(full);
  }
  return found;
}

function read(file: string): string {
  return existsSync(file) ? readFileSync(file, "utf8") : "";
}

expect(existsSync(dist) && statSync(dist).isDirectory(), "dist exists");
const index = read(path.join(dist, "index.html"));
expect(index.includes(constructionNotice), "homepage construction notice");
expect(index.includes("/news/design-preview-lead"), "lead story link");
expect(index.includes("<img"), "homepage image");
expect(index.includes("wordmark-name") && index.includes("edition-nav"), "shared masthead and navigation");
expect(index.includes('content="noindex, nofollow"'), "homepage noindex");
expect(!index.includes("No news is published."), "homepage is populated");
expect(index.includes("Placeholder rows."), "tracker labels draft rows");

const news = read(path.join(dist, "news.html"));
expect(news.includes(constructionNotice), "news archive notice");
expect(news.includes("/news/design-preview-lead"), "news archive lists a placeholder");
expect(!news.includes("No news is published."), "news archive is populated");

const reports = read(path.join(dist, "reports.html"));
expect(reports.includes(constructionNotice), "research archive notice");
expect(reports.includes("/reports/"), "research archive lists a report");

const article = read(path.join(dist, "news", "design-preview-lead.html"));
expect(article.includes("<img"), "article hero");
expect(article.includes('content="noindex, nofollow"'), "article noindex");
expect(article.includes("editorial-main"), "shared article layout");
expect(article.includes("Placeholder 01."), "article placeholder number");
expect(article.includes("src/content/news/design-preview-lead.md"), "article names its file");
expect(article.includes("not published reporting."), "article placeholder label");

const files = walk(dist);
const html = files.filter((file) => file.endsWith(".html"));
expect(html.length > 28, "construction build adds placeholder pages");
expect(
  html.every((file) => readFileSync(file, "utf8").includes('content="noindex, nofollow"')),
  "every page is noindex",
);

const robots = read(path.join(dist, "robots.txt"));
expect(robots.includes("Disallow: /") && !robots.includes("Sitemap:"), "robots blocks the construction site");

for (const name of ["llms.txt", "content-index.json", "rss.xml", "news-sitemap.xml", "sitemap-index.xml"]) {
  const file = path.join(dist, name);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  expect(
    !text.includes("design-preview") && !text.includes("layout-preview") && !text.includes("demonstration-figure"),
    `${name} excludes placeholder records`,
  );
}

expect(
  files.some((file) => path.basename(file).includes("demonstration-figure")),
  "build includes the placeholder figure",
);

if (failed > 0) {
  console.error(`${failed} construction checks failed`);
  process.exit(1);
}
console.log("construction checks passed");
