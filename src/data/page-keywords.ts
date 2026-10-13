export type KeywordLocation = "h1" | "title" | "description" | "slug" | "intro";

export type KeywordException = {
  location: KeywordLocation;
  proposed: string;
};

export type KeywordPage = {
  path: string;
  keyword: string;
  intent: "informational";
  h1: string;
  description: string;
  exceptions: KeywordException[];
};

export const comparisonPatterns = [/\bbest\b/i, /\bcheapest\b/i, /\bversus\b/i, /\bvs\.?\b/i];

export const keywordPages: KeywordPage[] = [
  {
    path: "/",
    keyword: "investment migration research",
    intent: "informational",
    h1: "News",
    description: "Independent investment migration research and news.",
    exceptions: [
      {
        location: "h1",
        proposed: "Keep the empty-state H1 as News. A published lead headline replaces it, and that headline is not rewritten.",
      },
      {
        location: "title",
        proposed: "Keep the HTML title as Golden Visa Research.",
      },
      {
        location: "slug",
        proposed: "The homepage slug stays /.",
      },
      {
        location: "intro",
        proposed: "The empty-state sentence stays: No news is published.",
      },
    ],
  },
  {
    path: "/news",
    keyword: "news",
    intent: "informational",
    h1: "News",
    description: "News on investment migration policy, legislation, and regulation.",
    exceptions: [],
  },
  {
    path: "/news/policy",
    keyword: "policy",
    intent: "informational",
    h1: "Policy",
    description: "Policy articles in the news archive.",
    exceptions: [],
  },
  {
    path: "/news/legislation",
    keyword: "legislation",
    intent: "informational",
    h1: "Legislation",
    description: "Legislation articles in the news archive.",
    exceptions: [],
  },
  {
    path: "/news/regulation",
    keyword: "regulation",
    intent: "informational",
    h1: "Regulation",
    description: "Regulation articles in the news archive.",
    exceptions: [],
  },
  {
    path: "/reports",
    keyword: "research",
    intent: "informational",
    h1: "Research",
    description: "Research reports, with publication dates and finding previews.",
    exceptions: [
      {
        location: "slug",
        proposed: "Keep the archive at /reports. Do not rename it to /research.",
      },
    ],
  },
  {
    path: "/reports/policy-analysis",
    keyword: "policy analysis",
    intent: "informational",
    h1: "Policy Analysis",
    description: "Policy analysis reports in the research archive.",
    exceptions: [],
  },
  {
    path: "/reports/market-research",
    keyword: "market research",
    intent: "informational",
    h1: "Market Research",
    description: "Market research reports in the research archive.",
    exceptions: [],
  },
  {
    path: "/reports/country-research",
    keyword: "country research",
    intent: "informational",
    h1: "Country Research",
    description: "Country research reports in the research archive.",
    exceptions: [],
  },
  {
    path: "/countries",
    keyword: "countries",
    intent: "informational",
    h1: "Countries",
    description: "Countries with a published profile, grouped by region.",
    exceptions: [],
  },
  {
    path: "/programs",
    keyword: "programs",
    intent: "informational",
    h1: "Programs",
    description: "Programs are stored as one record each. Facts are read from the program collection.",
    exceptions: [],
  },
  {
    path: "/tracker",
    keyword: "program status",
    intent: "informational",
    h1: "Program Status",
    description:
      "Program status for each published program, listed alphabetically by country and name. A verified date older than 180 days is marked Review due.",
    exceptions: [
      {
        location: "slug",
        proposed: "Keep /tracker. Do not rename it to /program-status.",
      },
    ],
  },
  {
    path: "/topics/golden-visa",
    keyword: "golden visa",
    intent: "informational",
    h1: "Golden Visa",
    description:
      "Golden visa, on this site, means published coverage of residence routes that require an investment. It is not citizenship.",
    exceptions: [],
  },
  {
    path: "/topics/residency-by-investment",
    keyword: "residency by investment",
    intent: "informational",
    h1: "Residency by Investment",
    description:
      "Residency by investment is a visa or residence permit granted after an investment condition in that country's law. It is not citizenship.",
    exceptions: [],
  },
  {
    path: "/topics/citizenship-by-investment",
    keyword: "citizenship by investment",
    intent: "informational",
    h1: "Citizenship by Investment",
    description:
      "Citizenship by investment is the grant of citizenship after an investment condition in that country's law. It is not a residence permit.",
    exceptions: [],
  },
  {
    path: "/about",
    keyword: "about",
    intent: "informational",
    h1: "About",
    description: "About Golden Visa Research, which publishes news and research on investment migration.",
    exceptions: [
      {
        location: "intro",
        proposed:
          "Keep the purpose sentence: Golden Visa Research publishes news and research on investment migration.",
      },
    ],
  },
  {
    path: "/editorial-standards",
    keyword: "editorial standards",
    intent: "informational",
    h1: "Editorial Standards",
    description: "Editorial standards for what this site publishes, and the decisions that are not recorded.",
    exceptions: [
      {
        location: "intro",
        proposed: "Keep the publication-rule sentence. Do not start it with the keyword.",
      },
    ],
  },
  {
    path: "/methodology",
    keyword: "methodology",
    intent: "informational",
    h1: "Methodology",
    description: "Methodology for sources, program status, investment figures, and last verified dates.",
    exceptions: [
      {
        location: "intro",
        proposed: "Keep the primary-source sentence. Do not start it with the keyword.",
      },
    ],
  },
  {
    path: "/corrections",
    keyword: "corrections",
    intent: "informational",
    h1: "Corrections",
    description: "Corrections log for published pages. No historical corrections are invented.",
    exceptions: [
      {
        location: "intro",
        proposed: "Keep the substantive-update sentence. Do not start it with the keyword.",
      },
    ],
  },
  {
    path: "/contact",
    keyword: "contact",
    intent: "informational",
    h1: "Contact",
    description: "Contact for an editorial message. No postal address is recorded.",
    exceptions: [
      {
        location: "intro",
        proposed: "Keep the sentence that no postal address is recorded. Do not start it with the keyword.",
      },
    ],
  },
  {
    path: "/disclaimer",
    keyword: "disclaimer",
    intent: "informational",
    h1: "Disclaimer",
    description: "Disclaimer for this publication. Golden Visa Research is not legal, tax, or immigration advice.",
    exceptions: [
      {
        location: "intro",
        proposed:
          "Keep the sentence: Golden Visa Research is an informational publication. It is not legal advice, tax advice, or immigration advice.",
      },
    ],
  },
  {
    path: "/privacy",
    keyword: "privacy",
    intent: "informational",
    h1: "Privacy",
    description: "Privacy for this site. No form provider, analytics, or lead sharing is configured.",
    exceptions: [
      {
        location: "intro",
        proposed: "Keep the sentence: Golden Visa Research is a static website.",
      },
    ],
  },
  {
    path: "/press",
    keyword: "press",
    intent: "informational",
    h1: "Press Room",
    description: "This section contains announcements and press releases from Golden Visa Research.",
    exceptions: [],
  },
  {
    path: "/newsletter",
    keyword: "newsletter",
    intent: "informational",
    h1: "Policy changes, without the sales pitch.",
    description: "Newsletter subscription for Golden Visa Research. The form provider is not configured.",
    exceptions: [
      {
        location: "h1",
        proposed: "Keep the approved headline: Policy changes, without the sales pitch.",
      },
    ],
  },
];

export function expectedTitle(page: KeywordPage): string {
  if (page.path === "/") return "Golden Visa Research";
  if (page.path === "/newsletter") return "Newsletter - Golden Visa Research";
  return `${page.h1} - Golden Visa Research`;
}

export function keywordHits(page: KeywordPage, intro: string): Record<KeywordLocation, boolean> {
  const keyword = page.keyword.toLowerCase();
  const firstWords = (value: string, count: number) =>
    value
      .toLowerCase()
      .replace(/[.,:;!?]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, count)
      .join(" ");
  const slug = page.path.toLowerCase().replace(/\//g, " ").replace(/-/g, " ");
  return {
    h1: page.h1.toLowerCase().includes(keyword),
    title: expectedTitle(page).toLowerCase().startsWith(keyword),
    description: firstWords(page.description, 7).includes(keyword),
    slug: page.path === "/" ? false : slug.includes(keyword),
    intro: firstWords(intro, 10).includes(keyword),
  };
}
