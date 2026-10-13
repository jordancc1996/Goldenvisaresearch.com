import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { canonicalUrl, site } from "../data/site";
import { xmlEscape, withinNewsSitemapWindow } from "../lib/metadata";
import { feedRecords } from "../lib/publishing";

export async function GET(_context: APIContext) {
  if (!site.origin) {
    return new Response("Canonical origin is not configured.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const now = new Date();
  const news = feedRecords(await getCollection("news"));
  const urls = news.flatMap((entry) => {
    if (!withinNewsSitemapWindow(entry.data.publishedAt, now)) return [];
    const loc = canonicalUrl(`/news/${entry.id}`);
    if (!loc) return [];
    return [
      [
        "  <url>",
        `    <loc>${xmlEscape(loc)}</loc>`,
        "    <news:news>",
        "      <news:publication>",
        `        <news:name>${xmlEscape(site.name)}</news:name>`,
        `        <news:language>${site.locale}</news:language>`,
        "      </news:publication>",
        `      <news:publication_date>${entry.data.publishedAt.toISOString()}</news:publication_date>`,
        `      <news:title>${xmlEscape(entry.data.title)}</news:title>`,
        "    </news:news>",
        "  </url>",
      ].join("\n"),
    ];
  });
  if (urls.length === 0) {
    return new Response("No news articles are inside the two-day window.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
