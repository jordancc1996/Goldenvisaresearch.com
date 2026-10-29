import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { durationSeconds, embedUrl, type VideoProvider } from "./audit-video.ts";
import { isReservedAuditSlug } from "./content-schema.ts";
import { splitFrontmatter } from "./publish-audit.ts";

export type AuditSitemapVideo = {
  thumbnail_loc: string;
  title: string;
  description: string;
  player_loc: string;
  duration?: number;
  publication_date?: string;
};

type VideoRecord = {
  provider?: VideoProvider;
  id?: string;
  title?: string;
  description?: string;
  duration?: string;
  uploadDate?: Date | string;
  thumbnail?: unknown;
  transcript?: unknown[];
};

type AuditRecord = {
  draft?: boolean;
  material?: string;
  comparison?: boolean;
  verification?: { status?: string };
  video?: VideoRecord;
};

export function sitemapVideoFromAudit(
  data: AuditRecord,
  pageUrl: string,
  thumbnailUrl: string | undefined,
): AuditSitemapVideo | undefined {
  const video = data.video;
  if (!video?.provider || !video.id || !video.title || !video.description) return undefined;
  const published =
    data.draft === false &&
    data.material === "reported" &&
    data.comparison !== true &&
    data.verification?.status === "verified";
  if (!published || !thumbnailUrl) return undefined;
  const player = embedUrl(video.provider, video.id);
  if (player === pageUrl) return undefined;
  const seconds = video.duration ? durationSeconds(video.duration) : null;
  const uploaded = video.uploadDate ? new Date(video.uploadDate) : undefined;
  return {
    thumbnail_loc: thumbnailUrl,
    title: video.title,
    description: video.description,
    player_loc: player,
    ...(seconds !== null ? { duration: seconds } : {}),
    ...(uploaded && !Number.isNaN(uploaded.getTime()) ? { publication_date: uploaded.toISOString() } : {}),
  };
}

function posterFromBuiltPage(origin: string, slug: string): string | undefined {
  const file = path.join(process.cwd(), "dist", "audits", `${slug}.html`);
  if (!existsSync(file)) return undefined;
  const html = readFileSync(file, "utf8");
  const match = html.match(/class="audit-video-still"[^>]*\ssrc="([^"]+)"|src="([^"]+)"[^>]*class="audit-video-still"/);
  const src = match?.[1] || match?.[2];
  if (!src) return undefined;
  return new URL(src, origin).href;
}

export function auditSitemapItem<T extends { url: string }>(item: T): T & { video?: AuditSitemapVideo[] } {
  let pathname = "";
  let origin = "";
  try {
    const url = new URL(item.url);
    origin = url.origin;
    pathname = url.pathname.replace(/\.html$/, "").replace(/\/+$/, "");
  } catch {
    return item;
  }
  const match = pathname.match(/^\/audits\/([^/]+)$/);
  if (!match || isReservedAuditSlug(match[1])) return item;
  const file = path.join(process.cwd(), "src", "content", "audits", `${match[1]}.md`);
  if (!existsSync(file)) return item;
  const data = splitFrontmatter(readFileSync(file, "utf8")).data as AuditRecord;
  const poster = posterFromBuiltPage(origin, match[1]);
  const video = sitemapVideoFromAudit(data, item.url, poster);
  if (!video || video.player_loc === item.url) return item;
  return { ...item, video: [video] };
}
