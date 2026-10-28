/**
 * Video providers an audit can name. Add a value here, then the matching
 * embed URL in embedUrl, when a new host should be allowed.
 * Later values can include a self-hosted file.
 */
export const videoProviders = ["youtube", "vimeo", "bunny"] as const;

export type VideoProvider = (typeof videoProviders)[number];

const durationPattern = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/;
const clockPattern = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export function durationSeconds(value: string): number | null {
  const match = durationPattern.exec(value);
  if (!match) return null;
  if (!match[1] && !match[2] && !match[3]) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

/** Listing label. PT18M30S is 18 MIN. Seconds under a minute stay in SEC. */
export function durationLabel(value: string): string {
  const total = durationSeconds(value);
  if (total === null) return "";
  const minutes = Math.floor(total / 60);
  if (minutes < 1) return `${total} SEC`;
  return `${minutes} MIN`;
}

export function clockSeconds(value: string): number | null {
  const match = clockPattern.exec(value);
  if (!match) return null;
  const head = Number(match[1]);
  const middle = Number(match[2]);
  if (match[3]) {
    const seconds = Number(match[3]);
    if (middle > 59 || seconds > 59) return null;
    return head * 3600 + middle * 60 + seconds;
  }
  if (middle > 59) return null;
  return head * 60 + middle;
}

export function embedUrl(provider: VideoProvider, id: string, start = 0): string {
  if (provider === "youtube") {
    const url = new URL(`https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}`);
    url.searchParams.set("rel", "0");
    url.searchParams.set("modestbranding", "1");
    url.searchParams.set("autoplay", "1");
    if (start > 0) url.searchParams.set("start", String(start));
    return url.href;
  }
  if (provider === "vimeo") {
    const url = new URL(`https://player.vimeo.com/video/${encodeURIComponent(id)}`);
    url.searchParams.set("dnt", "1");
    url.searchParams.set("byline", "0");
    url.searchParams.set("portrait", "0");
    url.searchParams.set("title", "0");
    url.searchParams.set("autoplay", "1");
    if (start > 0) url.hash = `t=${start}s`;
    return url.href;
  }
  const path = id
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");
  const url = new URL(`https://iframe.mediadelivery.net/embed/${path}`);
  url.searchParams.set("autoplay", "true");
  url.searchParams.set("preload", "true");
  if (start > 0) url.searchParams.set("t", String(start));
  return url.href;
}
