import { site } from "./site";

export type NavItem = {
  label: string;
  href: string;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const editionNav: NavItem[] = [
  { label: "News", href: "/news" },
  { label: "Research", href: "/reports" },
  { label: "Golden visas", href: "/topics/golden-visa" },
  { label: "Residency by investment", href: "/topics/residency-by-investment" },
  { label: "Citizenship by investment", href: "/topics/citizenship-by-investment" },
  { label: "Countries", href: "/countries" },
];

export const moreNav: NavItem[] = [
  { label: "Programs", href: "/programs" },
  { label: "Program tracker", href: "/tracker" },
  { label: "Press Room", href: "/press" },
  { label: "About", href: "/about" },
];

export const primaryNav: NavItem[] = editionNav;

export const newsletterLink: NavItem = {
  label: "Newsletter",
  href: "/newsletter",
};

const publicationNav: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Editorial standards", href: "/editorial-standards" },
  { label: "Methodology", href: "/methodology" },
  { label: "Corrections", href: "/corrections" },
  { label: "Press Room", href: "/press" },
];

const serviceNav: NavItem[] = [
  { label: "Search", href: "/search" },
  newsletterLink,
  { label: "Contact", href: "/contact" },
];

const legalOnly: NavItem[] = [
  { label: "Disclaimer", href: "/disclaimer" },
  { label: "Privacy", href: "/privacy" },
];

export const sectionDirectory: NavGroup[] = [
  {
    label: "Coverage",
    items: [
      editionNav[0],
      editionNav[1],
      editionNav[5],
      moreNav[0],
      moreNav[1],
    ],
  },
  {
    label: "Topics",
    items: [editionNav[2], editionNav[3], editionNav[4]],
  },
  {
    label: "Publication",
    items: publicationNav,
  },
  {
    label: "Reader services",
    items: serviceNav,
  },
];

export const legalNav: NavItem[] = [...publicationNav, ...moreNav.slice(0, 2), ...serviceNav.slice(1), ...legalOnly];

export const announcement = {
  text: site.description,
};

export type Crumb = {
  label: string;
  href?: string;
};

export function navIsCurrent(pathname: string, href: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}
