export const homeRegions = [
  { label: "Europe", region: "europe" },
  { label: "Caribbean", region: "caribbean" },
  { label: "Middle East", region: "middle-east" },
  { label: "Asia-Pacific", region: "asia-pacific" },
  { label: "Americas", region: "americas" },
  { label: "Africa", region: "africa" },
] as const;

export type HomeRegion = (typeof homeRegions)[number]["region"];

export function regionQueryMatches(rowRegion: string, filter: string): boolean {
  if (!filter || filter === "all") return true;
  if (filter === "asia-pacific") return rowRegion === "asia" || rowRegion === "oceania";
  return rowRegion === filter;
}
