/**
 * Stable numbers for construction placeholders.
 * 01-11 are the homepage lead, secondary rail, and latest news.
 * 12-32 continue down the homepage topic and research sections.
 * 33-53 are the remaining records. They have pages and appear in the archives.
 * The number stays on the kicker. The page names the file to replace.
 */
const placeholders = [
  ["news", "design-preview-lead", "md"],
  ["news", "design-preview-secondary-one", "md"],
  ["news", "design-preview-secondary-two", "md"],
  ["news", "design-preview-secondary-three", "md"],
  ["news", "design-preview-secondary-four", "md"],
  ["news", "design-preview-latest-one", "md"],
  ["news", "design-preview-latest-two", "md"],
  ["news", "design-preview-latest-three", "md"],
  ["news", "design-preview-latest-four", "md"],
  ["news", "design-preview-latest-five", "md"],
  ["news", "design-preview-latest-six", "md"],
  ["news", "layout-preview-article", "mdx"],
  ["news", "design-preview-golden-visa-1", "md"],
  ["news", "design-preview-golden-visa-2", "md"],
  ["news", "design-preview-golden-visa-3", "md"],
  ["news", "design-preview-golden-visa-4", "md"],
  ["news", "layout-preview-news", "md"],
  ["news", "layout-preview-related-beta", "md"],
  ["news", "layout-preview-related-delta", "md"],
  ["news", "design-preview-residency-by-investment-1", "md"],
  ["news", "design-preview-residency-by-investment-2", "md"],
  ["news", "design-preview-residency-by-investment-3", "md"],
  ["news", "layout-preview-related-gamma", "md"],
  ["news", "layout-preview-related-epsilon", "md"],
  ["news", "design-preview-citizenship-by-investment-1", "md"],
  ["news", "design-preview-citizenship-by-investment-2", "md"],
  ["news", "design-preview-citizenship-by-investment-3", "md"],
  ["news", "design-preview-citizenship-by-investment-4", "md"],
  ["reports", "demonstration-research-report", "md"],
  ["reports", "demonstration-report-alpha", "md"],
  ["reports", "demonstration-report-beta", "md"],
  ["reports", "layout-preview-report", "md"],
  ["news", "demonstration-news-record", "md"],
  ["news", "demonstration-policy-note", "mdx"],
  ["news", "demonstration-table-record", "md"],
  ["news", "demonstration-record-without-figure", "md"],
  ["news", "demonstration-news-alpha", "md"],
  ["news", "demonstration-news-beta", "md"],
  ["news", "demonstration-news-gamma", "md"],
  ["news", "demonstration-news-delta", "mdx"],
  ["news", "design-preview-residency-by-investment-4", "md"],
  ["programs", "demonstration-greece-route", "md"],
  ["programs", "demonstration-program-guide", "md"],
  ["programs", "demonstration-spain-route", "md"],
  ["countries", "greece", "md"],
  ["countries", "italy", "md"],
  ["countries", "portugal", "md"],
  ["countries", "spain", "md"],
  ["press", "layout-preview-release", "md"],
  ["authors", "demonstration-editor-one", "md"],
  ["authors", "demonstration-editor-two", "md"],
  ["authors", "layout-preview-desk", "md"],
  ["authors", "layout-preview-editor", "md"],
] as const;

const byKey = new Map(
  placeholders.map((item, index) => [
    `${item[0]}/${item[1]}`,
    { mark: String(index + 1).padStart(2, "0"), extension: item[2] },
  ]),
);

export function placeholderMark(collection: string, id: string): string | undefined {
  return byKey.get(`${collection}/${id}`)?.mark;
}

export function placeholderPath(collection: string, id: string): string | undefined {
  const entry = byKey.get(`${collection}/${id}`);
  if (!entry) return undefined;
  return `src/content/${collection}/${id}.${entry.extension}`;
}

export function markedLabel(collection: string, id: string, label: string): string {
  const mark = placeholderMark(collection, id);
  return mark ? `${mark} ${label}` : label;
}

export function placeholderPageNote(collection: string, id: string, sentence: string): string {
  const mark = placeholderMark(collection, id);
  const path = placeholderPath(collection, id);
  if (!mark || !path) return sentence;
  return `Placeholder ${mark}. ${sentence} Replace ${path}.`;
}
