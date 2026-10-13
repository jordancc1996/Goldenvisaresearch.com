import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist-preview");
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

expect(existsSync(dist) && statSync(dist).isDirectory(), "dist-preview exists");
const indexPath = path.join(dist, "index.html");
const index = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";
expect(index.includes("Design preview — demonstration content, not published reporting."), "homepage notice");
expect(index.includes("/news/design-preview-lead"), "lead story link");
expect(index.includes("<img"), "homepage image");
expect(index.includes("wordmark-name") && index.includes("edition-nav"), "shared masthead and navigation");
expect(index.includes('content="noindex, nofollow"'), "homepage noindex");
expect(!index.includes("No news is published."), "homepage is populated");

const articlePath = path.join(dist, "news", "design-preview-lead.html");
const article = existsSync(articlePath) ? readFileSync(articlePath, "utf8") : "";
expect(article.includes("<img"), "article hero");
expect(article.includes('content="noindex, nofollow"'), "article noindex");
expect(article.includes("editorial-main"), "shared article layout");

const files = walk(dist);
const html = files.filter((file) => file.endsWith(".html"));
expect(html.length > 28, "preview build adds demonstration pages");
expect(
  html.every((file) => readFileSync(file, "utf8").includes('content="noindex, nofollow"')),
  "every preview page is noindex",
);

const robots = existsSync(path.join(dist, "robots.txt")) ? readFileSync(path.join(dist, "robots.txt"), "utf8") : "";
expect(robots.includes("Disallow: /") && !robots.includes("Sitemap:"), "robots blocks the preview");

for (const name of ["llms.txt", "content-index.json", "rss.xml", "news-sitemap.xml", "sitemap-index.xml"]) {
  const file = path.join(dist, name);
  if (!existsSync(file)) continue;
  const text = readFileSync(file, "utf8");
  expect(
    !text.includes("design-preview") && !text.includes("layout-preview") && !text.includes("demonstration-figure"),
    `${name} excludes demonstration records`,
  );
}

expect(
  files.some((file) => path.basename(file).includes("demonstration-figure")),
  "preview build includes the demonstration figure",
);

if (failed > 0) {
  console.error(`${failed} design preview checks failed`);
  process.exit(1);
}
console.log("design preview checks passed");
