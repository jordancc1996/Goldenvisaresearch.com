import type { AuditRegion } from "../lib/content-schema.ts";
import { site } from "./site.ts";

export const auditIndex = {
  path: "/audits",
  eyebrow: "Independent audits",
  h1: "Golden Visa & Citizenship by Investment Audits",
  title: "CBI & RBI Program Audits - Golden Visa Research",
  description:
    "Independent reviews of residency and citizenship by investment programs and the offerings sold under them: costs, risks, fine print and what the marketing leaves out.",
  note: "Every audit follows the same published methodology and cites its sources.",
};

export const auditMethodology = {
  path: "/audits/methodology",
  h1: "Audit Methodology",
  title: `Audit Methodology - ${site.name}`,
  description: "Audit methodology is a placeholder for the rules an audit will follow.",
};

export const auditTypePages = [
  {
    path: "/audits/citizenship-by-investment",
    auditType: "CBI Program",
    label: "CBI programs",
    sectionTitle: "Citizenship by investment audits",
    h1: "Citizenship by Investment Audits",
    title: "Citizenship by investment audits - Golden Visa Research",
    description:
      "Citizenship by investment audits record the published terms of a program and the claims made about those terms.",
    groupTitle: "Citizenship by investment",
  },
  {
    path: "/audits/residency-by-investment",
    auditType: "RBI Program",
    label: "RBI programs",
    sectionTitle: "Residency by investment audits",
    h1: "Residency by Investment Audits",
    title: "Residency by investment audits - Golden Visa Research",
    description:
      "Residency by investment audits record the published terms of a residency program and the claims made about those terms.",
    groupTitle: "Residency by investment",
  },
  {
    path: "/audits/investment-offerings",
    auditType: "Investment Offering",
    label: "Investment offerings",
    sectionTitle: "Investment offering audits",
    h1: "Investment Offering Audits",
    title: "Investment offering audits - Golden Visa Research",
    description:
      "Investment offering audits record one route sold under a program and the documents published about that route.",
    groupTitle: "Investment offerings",
  },
] as const;

export const auditRegionPages = [
  {
    path: "/audits/caribbean",
    region: "caribbean",
    label: "Caribbean",
    sectionTitle: "Caribbean",
    h1: "Caribbean Investment Migration Audits",
    title: "Caribbean program audits - Golden Visa Research",
    description:
      "Caribbean program audits list independent reviews of residency programs, citizenship programs, and offerings in that region.",
  },
  {
    path: "/audits/europe",
    region: "europe",
    label: "Europe",
    sectionTitle: "Europe",
    h1: "European Investment Migration Audits",
    title: "European program audits - Golden Visa Research",
    description:
      "European program audits list independent reviews of residency and citizenship programs and the offerings recorded for Europe.",
  },
  {
    path: "/audits/south-america",
    region: "south-america",
    label: "South America",
    sectionTitle: "South America",
    h1: "South American Investment Migration Audits",
    title: "South American program audits - Golden Visa Research",
    description:
      "South American program audits list independent reviews of residency and citizenship programs and offerings in South America.",
  },
] as const;

export function auditRegionPage(region: AuditRegion) {
  const page = auditRegionPages.find((item) => item.region === region);
  if (!page) throw new Error(`No audit region page is recorded for ${region}.`);
  return page;
}

export const auditFilters = [
  { href: auditIndex.path, label: "All" },
  ...auditTypePages.map((page) => ({ href: page.path, label: page.label })),
];
