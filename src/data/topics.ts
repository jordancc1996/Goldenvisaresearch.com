import { topicLabels, topicSlugs, type TopicSlug } from "../lib/content-schema.ts";

export type TopicPage = {
  slug: TopicSlug;
  title: string;
  description: string;
  scope: string[];
  questions: { heading: string; answer: string }[];
};

const pages: Record<TopicSlug, Omit<TopicPage, "slug" | "title">> = {
  "golden-visa": {
    description:
      "Golden visa, on this site, means published coverage of residence routes that require an investment. It is not citizenship.",
    scope: [
      "Golden visa is a common name for a residence route that requires a qualifying investment. It is not one statute, and the name does not by itself describe the same legal result in every country.",
      "On this site the term means residence. It does not mean citizenship. A residence permit and a later citizenship application are different legal results.",
    ],
    questions: [
      {
        heading: "What does golden visa mean on this site?",
        answer:
          "It marks published news, research, and country profiles about residence routes that require an investment. The label is not a finding that a named program is open, or that an investment amount has been verified.",
      },
      {
        heading: "Does a golden visa grant citizenship?",
        answer:
          "No. Residence is permission to reside. Citizenship is membership of a state. A person may be able to apply for citizenship later only where that country's law allows it. This page does not state that any program leads to citizenship.",
      },
    ],
  },
  "residency-by-investment": {
    description:
      "Residency by investment is a visa or residence permit granted after an investment condition in that country's law. It is not citizenship.",
    scope: [
      "Residency by investment means a state grants a visa, a residence permit, or both, after the applicant meets an investment or other financial condition in that state's law.",
      "The permit is permission to reside. It can expire or be withdrawn under the law that created it. It does not make the holder a citizen.",
    ],
    questions: [
      {
        heading: "What does residency by investment mean?",
        answer:
          "It means permission to reside, granted after a financial condition set by law. The condition, the length of the permit, and the right to renew it depend on that law. This site states those facts only when a published record has verified them.",
      },
      {
        heading: "How is residency different from citizenship?",
        answer:
          "Residency is permission to live in a country. Citizenship is membership of that country. An investment can be tied to one result or the other. The two results are not interchangeable, and a residence permit is not a passport.",
      },
    ],
  },
  "citizenship-by-investment": {
    description:
      "Citizenship by investment is the grant of citizenship after an investment condition in that country's law. It is not a residence permit.",
    scope: [
      "Citizenship by investment means a state grants citizenship after the applicant meets an investment condition in that state's law. Citizenship is membership of the state.",
      "Some laws grant citizenship without a prior residence permit. Others require residence first and treat a later citizenship application as a separate step. This site does not treat those routes as the same thing.",
    ],
    questions: [
      {
        heading: "What does citizenship by investment mean?",
        answer:
          "It means a grant of citizenship after an investment condition. It is not a visa and it is not a residence permit. A published record has to state the legal basis before this site describes a named route as citizenship.",
      },
      {
        heading: "How is citizenship different from residency?",
        answer:
          "Citizenship is membership of a state. Residency is permission to reside. Where a law offers residence first, a later citizenship application stays under the citizenship topic only when the published file records that topic. The file is not listed again in full on the residency hub.",
      },
    ],
  },
};

export const topicPages: TopicPage[] = topicSlugs.map((slug) => ({
  slug,
  title: topicLabels[slug],
  ...pages[slug],
}));

export function topicPage(slug: string): TopicPage | undefined {
  return topicPages.find((page) => page.slug === slug);
}

export function topicPath(slug: TopicSlug): string {
  return `/topics/${slug}`;
}
