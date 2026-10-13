import { visibleInProduction, type ContentRecord } from "./content.ts";

export type CorrectionRecord = {
  title: string;
  summary: string;
  publishedAt: Date;
  draft?: boolean;
  material?: "demonstration" | "reported";
  path: string;
  previous: string;
  corrected: string;
  source?: { label: string; url: string };
};

export function correctionsForPath(
  entries: ContentRecord<CorrectionRecord>[],
  pathname: string,
): ContentRecord<CorrectionRecord>[] {
  const path = pathname.replace(/\/+$/, "") || "/";
  return entries
    .filter(
      (entry) =>
        visibleInProduction(entry as ContentRecord<CorrectionRecord & { publishedAt: Date }>) &&
        entry.data.path === path,
    )
    .sort((left, right) => right.data.publishedAt.getTime() - left.data.publishedAt.getTime());
}
