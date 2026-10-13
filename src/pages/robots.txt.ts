import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { site } from "../data/site";
import { visibleInProduction } from "../lib/content";
import { withinNewsSitemapWindow } from "../lib/metadata";

export async function GET(_context: APIContext) {
  const news = await getCollection("news", (entry) => visibleInProduction(entry));
  const recent = news.filter((entry) => withinNewsSitemapWindow(entry.data.publishedAt, new Date()));
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /thanks",
    "Disallow: /foundation",
  ];
  if (site.origin) {
    lines.push(`Sitemap: ${new URL("/sitemap-index.xml", site.origin).href}`);
    if (recent.length > 0) {
      lines.push(`Sitemap: ${new URL("/news-sitemap.xml", site.origin).href}`);
    }
  }
  return new Response(`${lines.join("\n")}\n`, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
