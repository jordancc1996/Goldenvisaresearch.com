import { isArchiveEntry } from "./archive.ts";
import type { ContentRecord } from "./content.ts";

type PressRouteData = {
  publishedAt: Date;
  draft?: boolean;
  material?: "demonstration" | "reported";
  verification?: { status?: string };
  developmentOnly?: boolean;
  comparison?: boolean;
};

export function pressRouteParams(entries: ContentRecord<PressRouteData>[], production: boolean) {
  return entries
    .filter((entry) => (production ? isArchiveEntry(entry) : true))
    .map((entry) => ({ params: { slug: entry.id } }));
}

export type SupportingTarget = {
  id: string;
  title: string;
  archive: boolean;
};

export function supportingLinks(
  ids: string[],
  collection: "news" | "reports",
  targets: SupportingTarget[],
  production: boolean,
): { href: string; title: string }[] {
  const byId = new Map(targets.map((item) => [item.id, item]));
  const links: { href: string; title: string }[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    const target = byId.get(id);
    if (!target) continue;
    if (production && !target.archive) continue;
    links.push({ href: `/${collection}/${id}`, title: target.title });
  }
  return links;
}
