import type { ImageMetadata } from "astro";
import { getCollection, getEntry, render } from "astro:content";
import { readHero, type ArticleHero, type ArticleSource, type TocHeading } from "./load-article";
import { isPublicEntry, visibleInProduction } from "./content";
import { isReservedAuditSlug, auditRegionLabels, auditTypeLabels, type AuditRegion, type AuditType } from "./content-schema";
import { clockSeconds, durationLabel, type VideoProvider } from "./audit-video";
import { isImageMetadata } from "./image-metadata";
import { markedLabel } from "./placeholder-marks";
import { auditsOfType, relatedAudits, splitAuditLead, storyRows } from "./audit-groups";

export { auditsOfType, relatedAudits, splitAuditLead, storyRows };
export { auditsInRegion, groupedAudits } from "./audit-groups";

export type AuditCard = {
  id: string;
  href: string;
  title: string;
  summary: string;
  category: string;
  categoryLabel: string;
  countries: { name: string; href?: string }[];
  kicker: string;
  publishedAt: Date;
  lastVerifiedDate: Date;
  country: string;
  region: AuditRegion;
  regionLabel: string;
  regionHref: string;
  auditType: AuditType;
  subjectName: string;
  verdict: string;
  featured: boolean;
  umbrellaProgram?: string;
  reviewedBy?: string;
  demonstration: boolean;
  indexable: boolean;
  sources: ArticleSource[];
  hero?: ArticleHero;
  video?: AuditVideoView;
};

export type AuditVideoView = {
  provider: VideoProvider;
  id: string;
  title: string;
  description: string;
  duration?: string;
  durationLabel: string;
  uploadDate?: Date;
  thumbnail: ImageMetadata;
  thumbnailAlt: string;
  chapters: { time: string; label: string; seconds: number }[];
  transcript: { time: string; text: string }[];
};

function assertAuditSlugs(
  entries: { id: string; data: { slug: string } }[],
): void {
  for (const entry of entries) {
    if (isReservedAuditSlug(entry.id) || isReservedAuditSlug(entry.data.slug)) {
      throw new Error(`Audit slug "${entry.id}" is reserved for an audit route.`);
    }
    if (entry.data.slug !== entry.id) {
      throw new Error(`Audit slug "${entry.data.slug}" does not match ${entry.id}.`);
    }
  }
}

export async function loadAudits(): Promise<AuditCard[]> {
  const entries = await getCollection("audits");
  assertAuditSlugs(entries);
  const visible = entries.filter((entry) =>
    isPublicEntry({
      id: entry.id,
      data: {
        publishedAt: entry.data.publishedDate,
        draft: entry.data.draft,
        material: entry.data.material,
        verification: entry.data.verification,
        comparison: entry.data.comparison,
      },
    }),
  );
  const cards = await Promise.all(visible.map(async (entry) => toCard(entry)));
  return cards.sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());
}

async function toCard(entry: Awaited<ReturnType<typeof getCollection<"audits">>>[number]): Promise<AuditCard> {
  const label = auditTypeLabels[entry.data.auditType];
  const indexable = visibleInProduction({
    id: entry.id,
    data: {
      publishedAt: entry.data.publishedDate,
      draft: entry.data.draft,
      material: entry.data.material,
      verification: entry.data.verification,
      comparison: entry.data.comparison,
    },
  });
  const video = readAuditVideo(entry.data.video);
  const hero = video
    ? {
        src: video.thumbnail,
        alt: video.thumbnailAlt,
        caption: entry.data.heroCaption || video.title,
        credit: entry.data.heroCredit || "No separate credit is recorded.",
        focal: entry.data.heroFocal,
      }
    : await readHero(
    entry.data.heroImage && entry.data.heroImageAlt && entry.data.heroCaption && entry.data.heroCredit
      ? {
          src: entry.data.heroImage,
          alt: entry.data.heroImageAlt,
          caption: entry.data.heroCaption,
          credit: entry.data.heroCredit,
          focal: entry.data.heroFocal,
        }
      : undefined,
  );
  return {
    id: entry.id,
    href: `/audits/${entry.id}`,
    title: entry.data.title,
    summary: entry.data.standfirst,
    category: entry.data.auditType,
    categoryLabel: markedLabel("audits", entry.id, label),
    countries: [{ name: entry.data.country }],
    kicker: markedLabel("audits", entry.id, label),
    publishedAt: entry.data.publishedDate,
    lastVerifiedDate: entry.data.lastVerifiedDate,
    country: entry.data.country,
    region: entry.data.region,
    regionLabel: auditRegionLabels[entry.data.region],
    regionHref: `/audits/${entry.data.region}`,
    auditType: entry.data.auditType,
    subjectName: entry.data.subjectName,
    verdict: entry.data.verdict,
    featured: entry.data.featured === true,
    umbrellaProgram: entry.data.umbrellaProgram,
    reviewedBy: entry.data.reviewedBy,
    demonstration: entry.data.material === "demonstration" || entry.data.draft !== false,
    indexable,
    sources: entry.data.sources.map((source) => ({
      label: source.label,
      url: source.url,
      accessedOn: source.accessedDate,
    })),
    hero,
    video,
  };
}

function readAuditVideo(
  video: Awaited<ReturnType<typeof getCollection<"audits">>>[number]["data"]["video"],
): AuditVideoView | undefined {
  if (!video?.thumbnail || !video.thumbnailAlt || !isImageMetadata(video.thumbnail)) return undefined;
  const chapters = (video.chapters ?? []).flatMap((chapter) => {
    const seconds = clockSeconds(chapter.time);
    if (seconds === null) return [];
    return [{ time: chapter.time, label: chapter.label, seconds }];
  });
  return {
    provider: video.provider,
    id: video.id,
    title: video.title,
    description: video.description,
    duration: video.duration,
    durationLabel: video.duration ? durationLabel(video.duration) : "",
    uploadDate: video.uploadDate,
    thumbnail: video.thumbnail,
    thumbnailAlt: video.thumbnailAlt,
    chapters,
    transcript: video.transcript ?? [],
  };
}

export async function auditPaths() {
  const audits = await loadAudits();
  return audits.map((audit) => ({ params: { slug: audit.id } }));
}

export async function loadAuditPage(id: string) {
  const entry = await getEntry("audits", id);
  if (!entry) throw new Error(`Missing audit: ${id}`);
  const audits = await loadAudits();
  const audit = audits.find((item) => item.id === id);
  if (!audit) throw new Error(`Audit is not available: ${id}`);
  const rendered = await render(entry);
  const headings: TocHeading[] = rendered.headings
    .filter((heading) => heading.depth === 2)
    .map((heading) => ({ depth: heading.depth, slug: heading.slug, text: heading.text }));
  headings.push({ depth: 2, slug: "what-to-check-before-you-invest", text: "What to check before you invest" });
  if (audit.video && audit.video.transcript.length > 0) {
    headings.push({ depth: 2, slug: "transcript", text: "Transcript" });
  }
  headings.push({ depth: 2, slug: "sources", text: "Sources" });
  return {
    audit,
    headings,
    related: relatedAudits(audit, audits),
    Content: rendered.Content,
  };
}

export function auditDocumentTitle(subjectName: string, verdict: string): string {
  const hook = verdict.trim().replace(/\.+$/, "");
  return `${subjectName} audit: ${hook} - Golden Visa Research`;
}
