import { z } from "astro/zod";
import { clockSeconds, durationSeconds, videoProviders } from "./audit-video.ts";

export { videoProviders };

export const programTypes = [
  "real-estate",
  "fund",
  "business",
  "donation",
  "government-bond",
  "unspecified",
] as const;

export const programTypeSchema = z.enum(programTypes);

export const programStatuses = [
  "unverified",
  "active",
  "under-review",
  "suspended",
  "closed",
] as const;

export type ProgramStatus = (typeof programStatuses)[number];

export const programStatusSchema = z.enum(programStatuses);

export const programStatusLabels: Record<ProgramStatus, string> = {
  unverified: "Unverified",
  active: "Active",
  "under-review": "Under review",
  suspended: "Suspended",
  closed: "Closed",
};

export const materialSchema = z.enum(["demonstration", "reported"]);

export const topicSlugs = [
  "golden-visa",
  "residency-by-investment",
  "citizenship-by-investment",
] as const;

export const topicSchema = z.enum(topicSlugs);

export type TopicSlug = (typeof topicSlugs)[number];

export const topicLabels: Record<TopicSlug, string> = {
  "golden-visa": "Golden Visa",
  "residency-by-investment": "Residency by Investment",
  "citizenship-by-investment": "Citizenship by Investment",
};

const statedMoneySchema = z.strictObject({
  state: z.literal("stated"),
  currency: z.string().regex(/^[A-Z]{3}$/),
  amount: z.number().positive(),
});

export const moneyFactSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("unverified") }),
  z.strictObject({ state: z.literal("unknown") }),
  z.strictObject({ state: z.literal("unpublished") }),
  statedMoneySchema,
]);

export const investmentThresholdSchema = moneyFactSchema;

export const textFactSchema = z.discriminatedUnion("state", [
  z.strictObject({ state: z.literal("unverified") }),
  z.strictObject({ state: z.literal("unknown") }),
  z.strictObject({ state: z.literal("unpublished") }),
  z.strictObject({
    state: z.literal("stated"),
    text: z.string().min(1),
  }),
]);

export const verificationSchema = z.strictObject({
  status: z.enum(["unverified", "verified"]),
  verifiedOn: z.coerce.date().optional(),
  note: z.string().min(1).optional(),
});

export const regions = [
  "europe",
  "middle-east",
  "caribbean",
  "asia",
  "oceania",
  "americas",
  "africa",
  "unrecorded",
] as const;

export type Region = (typeof regions)[number];

export const regionSchema = z.enum(regions);

export const regionLabels: Record<Region, string> = {
  europe: "Europe",
  "middle-east": "Middle East",
  caribbean: "Caribbean",
  asia: "Asia",
  oceania: "Oceania",
  americas: "Americas",
  africa: "Africa",
  unrecorded: "Region not recorded",
};

export const researchTypes = ["policy-analysis", "market-research", "country-research"] as const;

export type ResearchType = (typeof researchTypes)[number];

export const researchTypeSchema = z.enum(researchTypes);

export const researchTypeLabels: Record<ResearchType, string> = {
  "policy-analysis": "Policy analysis",
  "market-research": "Market research",
  "country-research": "Country research",
};

export const editorialCategories = [
  "news",
  "policy",
  "legislation",
  "research",
  "country",
  "program",
  "regulation",
] as const;

export type EditorialCategory = (typeof editorialCategories)[number];

export const editorialCategorySchema = z.enum(editorialCategories);

export const categoryLabels: Record<(typeof editorialCategories)[number], string> = {
  news: "News",
  policy: "Policy",
  legislation: "Legislation",
  research: "Research",
  country: "Country",
  program: "Program",
  regulation: "Regulation",
};

export const sourceSchema = z.strictObject({
  label: z.string().min(1),
  url: z.url(),
  organization: z.string().min(1).optional(),
  accessedOn: z.coerce.date().optional(),
});

export const heroSchema = z.strictObject({
  src: z.string().min(1),
  alt: z.string().min(1),
  caption: z.string().min(1),
  credit: z.string().min(1),
  focal: z.string().min(1).optional(),
});

const editorialFields = {
  title: z.string().min(1),
  description: z.string().min(1),
  publishedAt: z.coerce.date(),
  updatedAt: z.coerce.date().optional(),
  draft: z.boolean().default(true),
  featured: z.boolean().default(false),
  material: materialSchema,
  category: editorialCategorySchema.optional(),
  topic: topicSchema.optional(),
  comparison: z.boolean().default(false),
  programTypes: z.array(programTypeSchema).min(1),
  sources: z.array(sourceSchema).default([]),
  verification: verificationSchema,
  hero: heroSchema.optional(),
  newsletter: z.boolean().default(true),
  newsletterAfter: z.number().int().positive().optional(),
};

export function createNewsSchema<
  Author extends z.ZodType,
  Country extends z.ZodType,
  NewsRef extends z.ZodType,
  ReportRef extends z.ZodType,
>(refs: {
  author: Author;
  country: Country;
  news: NewsRef;
  report: ReportRef;
}) {
  return z.strictObject({
    ...editorialFields,
    authors: z.array(refs.author).min(1),
    review: z
      .strictObject({
        reviewer: refs.author,
        reviewedOn: z.coerce.date(),
      })
      .optional(),
    countries: z.array(refs.country).min(1),
    relatedNews: z.array(refs.news).default([]),
    relatedReports: z.array(refs.report).default([]),
  });
}

export function createReportSchema<
  Author extends z.ZodType,
  Country extends z.ZodType,
  NewsRef extends z.ZodType,
  ReportRef extends z.ZodType,
>(refs: {
  author: Author;
  country: Country;
  news: NewsRef;
  report: ReportRef;
}) {
  return createNewsSchema(refs).extend({
    researchType: researchTypeSchema.optional(),
    findings: z.array(z.string().min(1)).default([]),
    methodology: z.string().min(1).optional(),
    attachment: z
      .strictObject({
        href: z.string().min(1),
        label: z.string().min(1),
      })
      .optional(),
  });
}

export function createProgramSchema<
  Author extends z.ZodType,
  Country extends z.ZodType,
  NewsRef extends z.ZodType,
  ReportRef extends z.ZodType,
>(refs: {
  author: Author;
  country: Country;
  news: NewsRef;
  report: ReportRef;
}) {
  return z.strictObject({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean().default(true),
    featured: z.boolean().default(false),
    material: materialSchema,
    category: editorialCategorySchema.default("program"),
    comparison: z.boolean().default(false),
    authors: z.array(refs.author).min(1),
    review: z
      .strictObject({
        reviewer: refs.author,
        reviewedOn: z.coerce.date(),
      })
      .optional(),
    topic: topicSchema.optional(),
    country: refs.country,
    programType: programTypeSchema,
    recordStatus: programStatusSchema,
    legalBasis: z.string().min(1),
    minimumInvestment: investmentThresholdSchema,
    investmentRoutes: textFactSchema.default({ state: "unverified" }),
    governmentFees: moneyFactSchema.default({ state: "unverified" }),
    eligibility: z.string().min(1),
    applicationRequirements: textFactSchema.default({ state: "unverified" }),
    applicationProcess: z.string().min(1),
    processing: z.string().min(1),
    physicalPresence: textFactSchema.default({ state: "unverified" }),
    familyEligibility: z.string().min(1),
    citizenshipEligibility: textFactSchema.default({ state: "unverified" }),
    sources: z.array(sourceSchema).default([]),
    verification: verificationSchema,
    hero: heroSchema.optional(),
    newsletter: z.boolean().default(true),
    newsletterAfter: z.number().int().positive().optional(),
    relatedNews: z.array(refs.news).default([]),
    relatedReports: z.array(refs.report).default([]),
  });
}

export function createPressSchema<
  Author extends z.ZodType,
  Country extends z.ZodType,
  NewsRef extends z.ZodType,
  ReportRef extends z.ZodType,
>(refs: {
  author: Author;
  country: Country;
  news: NewsRef;
  report: ReportRef;
}) {
  return z.strictObject({
    title: z.string().min(1),
    description: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean().default(true),
    material: materialSchema,
    topic: topicSchema.optional(),
    comparison: z.boolean().default(false),
    authors: z.array(refs.author).default([]),
    countries: z.array(refs.country).default([]),
    programTypes: z.array(programTypeSchema).default(["unspecified"]),
    dateline: z.string().min(1).optional(),
    organization: z.string().min(1).optional(),
    boilerplate: z.string().min(1).optional(),
    mediaContact: z.string().min(1).optional(),
    sources: z.array(sourceSchema).default([]),
    verification: verificationSchema,
    hero: heroSchema.optional(),
    newsletter: z.boolean().default(true),
    newsletterAfter: z.number().int().positive().optional(),
    relatedNews: z.array(refs.news).default([]),
    relatedReports: z.array(refs.report).default([]),
  });
}

export function createCountrySchema<T extends z.ZodType>(refs: { report: T }) {
  return z.strictObject({
    name: z.string().min(1),
    summary: z.string().min(1),
    publishedAt: z.coerce.date(),
    updatedAt: z.coerce.date().optional(),
    draft: z.boolean().default(true),
    material: materialSchema,
    region: regionSchema.default("unrecorded"),
    topic: topicSchema.optional(),
    overview: z.string().min(1).optional(),
    methodology: z.string().min(1).optional(),
    relatedReports: z.array(refs.report).default([]),
    sources: z.array(sourceSchema).default([]),
    verification: verificationSchema,
    hero: heroSchema.optional(),
  });
}

export const correctionSchema = z.strictObject({
  title: z.string().min(1),
  summary: z.string().min(1),
  publishedAt: z.coerce.date(),
  draft: z.boolean().default(true),
  material: materialSchema,
  path: z.string().regex(/^\//),
  previous: z.string().min(1),
  corrected: z.string().min(1),
  source: sourceSchema.optional(),
});

export const authorSchema = z.strictObject({
  name: z.string().min(1),
  role: z.string().min(1),
  summary: z.string().min(1),
  draft: z.boolean().default(true),
  developmentOnly: z.boolean().default(false),
  material: materialSchema,
  expertise: z.array(z.string().min(1)).default([]),
  linkedin: z.url().optional(),
  disclosures: z.string().min(1).optional(),
});

const idSchema = z.string().min(1);

export const newsInputSchema = createNewsSchema({
  author: idSchema,
  country: idSchema,
  news: idSchema,
  report: idSchema,
});

export const reportInputSchema = createReportSchema({
  author: idSchema,
  country: idSchema,
  news: idSchema,
  report: idSchema,
});

export const countryInputSchema = createCountrySchema({
  report: idSchema,
});

export const programInputSchema = createProgramSchema({
  author: idSchema,
  country: idSchema,
  news: idSchema,
  report: idSchema,
});

export const pressInputSchema = createPressSchema({
  author: idSchema,
  country: idSchema,
  news: idSchema,
  report: idSchema,
});

/**
 * Regions an audit can name. Order does not matter.
 * 1. Add the value here and a label in auditRegionLabels.
 * 2. Add an auditRegionPages entry with that region value and path /audits/<region>.
 * 3. Add a static src/pages/audits/<region>.astro file that renders AuditRegionPage.
 * 4. Add a regionKeywordCopy entry for that region in page-keywords.ts.
 * Do not add [region].astro. A repeated region or path fails the build.
 * Later values can include middle-east, asia-pacific, and north-america.
 */
export const auditRegions = ["caribbean", "europe", "south-america"] as const;

export type AuditRegion = (typeof auditRegions)[number];

export const auditRegionSchema = z.enum(auditRegions);

export const auditRegionLabels: Record<AuditRegion, string> = {
  caribbean: "Caribbean",
  europe: "Europe",
  "south-america": "South America",
};

export const reservedAuditSlugs = [
  "citizenship-by-investment",
  "residency-by-investment",
  "investment-offerings",
  "methodology",
  ...auditRegions,
] as const;

export function isReservedAuditSlug(id: string): boolean {
  return (reservedAuditSlugs as readonly string[]).includes(id);
}

export const auditTypes = ["CBI Program", "RBI Program", "Investment Offering"] as const;

export const auditTypeSchema = z.enum(auditTypes);

export type AuditType = (typeof auditTypes)[number];

export const auditTypeLabels: Record<AuditType, string> = {
  "CBI Program": "CBI program audit",
  "RBI Program": "RBI program audit",
  "Investment Offering": "Offering audit",
};

const auditSourceSchema = z.strictObject({
  label: z.string().min(1),
  url: z.url(),
  accessedDate: z.coerce.date().optional(),
});

export const videoProviderSchema = z.enum(videoProviders);

const videoClockSchema = z.string().regex(/^\d{1,2}:\d{2}(?::\d{2})?$/, "use mm:ss");

const videoChapterSchema = z.strictObject({
  time: videoClockSchema,
  label: z.string().min(1),
});

/**
 * The transcript is timed lines in this file, not a heading in the body and
 * not a second file. Body headings are the audit sections. A sibling file is
 * outside the one-file audit collection. These lines stay public HTML.
 */
const videoTranscriptSchema = z.strictObject({
  time: videoClockSchema,
  text: z.string().min(1),
});

export function createAuditVideoSchema(thumbnail: z.ZodType = z.string().min(1).optional()) {
  return z.strictObject({
    provider: videoProviderSchema,
    id: z.string().regex(/^[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)?$/, "use the provider id, not a page URL"),
    title: z.string().min(1).max(100),
    description: z.string().min(1).max(2048),
    duration: z.string().optional(),
    uploadDate: z.coerce.date().optional(),
    thumbnail,
    thumbnailAlt: z.string().min(1).optional(),
    chapters: z.array(videoChapterSchema).optional(),
    transcript: z.array(videoTranscriptSchema).optional(),
  });
}

export function createAuditSchema(
  heroImage: z.ZodType = z.string().min(1).optional(),
  thumbnail: z.ZodType = z.string().min(1).optional(),
) {
  return z
    .strictObject({
      title: z.string().min(1),
      slug: z.string().min(1).refine((slug) => !isReservedAuditSlug(slug), "reserved for an audit route"),
      standfirst: z.string().min(1),
      subjectName: z.string().min(1),
      auditType: auditTypeSchema,
      region: auditRegionSchema,
      country: z.string().min(1),
      umbrellaProgram: z.string().min(1).optional(),
      publishedDate: z.coerce.date(),
      lastVerifiedDate: z.coerce.date(),
      verdict: z.string().min(1),
      featured: z.boolean().default(false),
      heroImage,
      heroImageAlt: z.string().min(1).optional(),
      heroCaption: z.string().min(1).optional(),
      heroCredit: z.string().min(1).optional(),
      heroFocal: z.string().min(1).optional(),
      video: createAuditVideoSchema(thumbnail).optional(),
      sources: z.array(auditSourceSchema).default([]),
      reviewedBy: z.string().min(1).optional(),
      draft: z.boolean().default(true),
      material: materialSchema.default("demonstration"),
      comparison: z.boolean().default(false),
      verification: verificationSchema.default({ status: "unverified" }),
    })
    .superRefine((data, ctx) => {
      const image = [data.heroImage, data.heroImageAlt, data.heroCaption, data.heroCredit];
      const present = image.filter(Boolean).length;
      if (present !== 0 && present !== image.length) {
        ctx.addIssue({
          code: "custom",
          message: "An audit image needs a path, alt text, caption, and credit",
          path: ["heroImage"],
        });
      }
      if (data.auditType === "Investment Offering" && !data.umbrellaProgram) {
        ctx.addIssue({
          code: "custom",
          message: "An offering audit names the program it sits under",
          path: ["umbrellaProgram"],
        });
      }
      const video = data.video;
      if (!video) return;
      if (video.thumbnail && !video.thumbnailAlt) {
        ctx.addIssue({
          code: "custom",
          message: "A video thumbnail needs alt text",
          path: ["video", "thumbnailAlt"],
        });
      }
      if (video.duration && durationSeconds(video.duration) === null) {
        ctx.addIssue({
          code: "custom",
          message: "Use an ISO 8601 duration such as PT18M30S",
          path: ["video", "duration"],
        });
      }
      for (const [index, chapter] of (video.chapters ?? []).entries()) {
        if (clockSeconds(chapter.time) === null) {
          ctx.addIssue({
            code: "custom",
            message: "Use a chapter time such as 04:10",
            path: ["video", "chapters", index, "time"],
          });
        }
      }
      const published =
        data.draft === false && data.material === "reported" && data.verification?.status === "verified";
      if (!published) return;
      if (!video.thumbnail) {
        ctx.addIssue({
          code: "custom",
          message: "A published video needs a thumbnail",
          path: ["video", "thumbnail"],
        });
      }
      if (!video.duration) {
        ctx.addIssue({
          code: "custom",
          message: "A published video needs a duration",
          path: ["video", "duration"],
        });
      }
      if (!video.uploadDate) {
        ctx.addIssue({
          code: "custom",
          message: "A published video needs an upload date",
          path: ["video", "uploadDate"],
        });
      }
      if (!video.transcript?.length) {
        ctx.addIssue({
          code: "custom",
          message: "A published video needs a transcript",
          path: ["video", "transcript"],
        });
      }
    });
}

export const auditInputSchema = createAuditSchema();

export type InvestmentThreshold = z.infer<typeof investmentThresholdSchema>;
export type TextFact = z.infer<typeof textFactSchema>;
export type ProgramType = z.infer<typeof programTypeSchema>;

export const programTypeLabels: Record<ProgramType, string> = {
  "real-estate": "Real estate",
  fund: "Fund",
  business: "Business",
  donation: "Donation",
  "government-bond": "Government bond",
  unspecified: "Unspecified",
};
export type NewsData = z.infer<typeof newsInputSchema>;
export type ReportData = z.infer<typeof reportInputSchema>;
export type CountryData = z.infer<typeof countryInputSchema>;
export type ProgramData = z.infer<typeof programInputSchema>;
export type AuthorData = z.infer<typeof authorSchema>;
export type CorrectionData = z.infer<typeof correctionSchema>;
