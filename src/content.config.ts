import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import {
  authorSchema,
  correctionSchema,
  createCountrySchema,
  createNewsSchema,
  createPressSchema,
  createProgramSchema,
  createReportSchema,
} from "./lib/content-schema";
import { omitPrivateContentImages, shouldResolveContentImage } from "./lib/content-images";

const loader = (directory: string) =>
  glob({
    pattern: "**/*.{md,mdx}",
    base: `./src/content/${directory}`,
  });

const relation = {
  author: reference("authors"),
  country: reference("countries"),
  news: reference("news"),
  report: reference("reports"),
};

function heroField(image: () => z.ZodType) {
  return z
    .object({
      src: image(),
      alt: z.string().min(1),
      caption: z.string().min(1),
      credit: z.string().min(1),
      focal: z.string().min(1).optional(),
    })
    .strict()
    .optional();
}

// Construction mode keeps placeholder heroes. CONSTRUCTION_MODE=false strips them.
function gateUnpublishedImages(schema: z.ZodType) {
  return schema.transform((data) => {
    const record = data as {
      draft?: boolean;
      material?: string;
      developmentOnly?: boolean;
      verification?: { status?: string };
      hero?: unknown;
      photo?: unknown;
    };
    if (shouldResolveContentImage(record, omitPrivateContentImages())) return data;
    return { ...record, hero: undefined, photo: undefined };
  });
}

const news = defineCollection({
  loader: loader("news"),
  schema: ({ image }) => {
    const parsed = createNewsSchema(relation).extend({ hero: heroField(image) });
    return gateUnpublishedImages(parsed) as unknown as typeof parsed;
  },
});

const reports = defineCollection({
  loader: loader("reports"),
  schema: ({ image }) => {
    const parsed = createReportSchema(relation).extend({ hero: heroField(image) });
    return gateUnpublishedImages(parsed) as unknown as typeof parsed;
  },
});

const programs = defineCollection({
  loader: loader("programs"),
  schema: ({ image }) => {
    const parsed = createProgramSchema(relation).extend({ hero: heroField(image) });
    return gateUnpublishedImages(parsed) as unknown as typeof parsed;
  },
});

const countries = defineCollection({
  loader: loader("countries"),
  schema: ({ image }) => {
    const parsed = createCountrySchema({ report: relation.report }).extend({
      hero: heroField(image),
    });
    return gateUnpublishedImages(parsed) as unknown as typeof parsed;
  },
});

const authors = defineCollection({
  loader: loader("authors"),
  schema: ({ image }) => {
    const parsed = authorSchema.extend({
      photo: z
        .object({
          src: image(),
          alt: z.string().min(1),
          credit: z.string().min(1),
        })
        .strict()
        .optional(),
    });
    return gateUnpublishedImages(parsed) as unknown as typeof parsed;
  },
});

const press = defineCollection({
  loader: loader("press"),
  schema: ({ image }) => {
    const parsed = createPressSchema(relation).extend({ hero: heroField(image) });
    return gateUnpublishedImages(parsed) as unknown as typeof parsed;
  },
});

const corrections = defineCollection({
  loader: loader("corrections"),
  schema: correctionSchema,
});

export const collections = { news, reports, programs, countries, authors, corrections, press };
