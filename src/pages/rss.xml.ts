import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import type { APIContext } from "astro";
import { site } from "../data/site";
import { feedRecords } from "../lib/publishing";

export async function GET(context: APIContext) {
  if (!context.site) {
    return new Response("Canonical origin is not configured.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const news = feedRecords(await getCollection("news"));
  const reports = feedRecords(await getCollection("reports"));
  const items = [
    ...news.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/news/${entry.id}`,
    })),
    ...reports.map((entry) => ({
      title: entry.data.title,
      description: entry.data.description,
      pubDate: entry.data.publishedAt,
      link: `/reports/${entry.id}`,
    })),
  ];

  return rss({
    title: site.name,
    description: site.description,
    site: context.site,
    trailingSlash: false,
    customData: `<language>${site.locale}</language>`,
    items,
  });
}

