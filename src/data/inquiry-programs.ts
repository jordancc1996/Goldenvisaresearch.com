export const inquiryProgramIds = [
  "argentina-cbi",
  "portugal-hqa",
  "portugal-golden-visa",
  "italy-investor-visa",
  "us-eb5",
  "greece-golden-visa",
  "malta-prp",
  "panama-qiv",
  "hungary-guest",
  "other",
] as const;

export type InquiryProgramId = (typeof inquiryProgramIds)[number];

export const inquiryPrograms: { id: InquiryProgramId; label: string }[] = [
  { id: "argentina-cbi", label: "Argentina Citizenship by Investment" },
  { id: "portugal-hqa", label: "Portugal HQA Program" },
  { id: "portugal-golden-visa", label: "Portugal Golden Visa" },
  { id: "italy-investor-visa", label: "Italy Investor Visa (Golden Visa)" },
  { id: "us-eb5", label: "United States EB-5 Investor Program" },
  { id: "greece-golden-visa", label: "Greece Golden Visa" },
  { id: "malta-prp", label: "Malta Permanent Residence Programme" },
  { id: "panama-qiv", label: "Panama Qualified Investor Visa" },
  { id: "hungary-guest", label: "Hungary Guest Investor Residence Permit" },
  { id: "other", label: "Other / Not Sure Yet" },
];

const countryProgram: Record<string, InquiryProgramId> = {
  argentina: "argentina-cbi",
  italy: "italy-investor-visa",
  greece: "greece-golden-visa",
  malta: "malta-prp",
  panama: "panama-qiv",
  hungary: "hungary-guest",
  "united-states": "us-eb5",
  usa: "us-eb5",
};

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

export function inquiryProgramFor(frontmatter: Record<string, unknown>): InquiryProgramId {
  const explicit = frontmatter.inquiryProgram;
  if (typeof explicit === "string" && inquiryPrograms.some((program) => program.id === explicit)) {
    return explicit as InquiryProgramId;
  }
  if (frontmatter.comparison === true) return "other";
  const countries = textList(frontmatter.countries);
  if (countries.length === 0 && typeof frontmatter.country === "string") countries.push(frontmatter.country);
  if (countries.length !== 1) return "other";
  return countryProgram[countries[0]] ?? "other";
}

export function linkedInProfileUrl(value: string): boolean {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return false;
  const path = url.pathname.replace(/\/+$/, "");
  return /^\/in\/[A-Za-z0-9_%\-]+$/.test(path);
}
