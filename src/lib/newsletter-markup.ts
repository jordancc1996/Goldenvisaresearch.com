import { inquiryFormElement } from "./inquiry-markup.ts";

type MarkupNode = {
  type: string;
  tagName?: string;
  name?: string;
  value?: string;
  properties?: Record<string, string | string[] | boolean | undefined>;
  children?: MarkupNode[];
};

const minimumParagraphs = 6;
const defaultAfter = 3;

export function newsletterEligible(frontmatter: Record<string, unknown>): boolean {
  if (frontmatter.newsletter === false) return false;
  return (
    Array.isArray(frontmatter.authors) ||
    typeof frontmatter.organization === "string" ||
    typeof frontmatter.researchType === "string" ||
    typeof frontmatter.programType === "string"
  );
}

function classText(node: MarkupNode): string {
  const value = node.properties?.className ?? node.properties?.class;
  if (Array.isArray(value)) return value.join(" ");
  return typeof value === "string" ? value : "";
}

export function hasNewsletterMarker(children: MarkupNode[]): boolean {
  return children.some((node) => {
    if (
      node.type === "mdxJsxFlowElement" &&
      (node.name === "ArticleNewsletter" || node.name === "ArticleLeadCTA")
    ) {
      return true;
    }
    const classes = classText(node).split(/\s+/);
    return classes.includes("article-newsletter") || classes.includes("article-inquiry");
  });
}

export function newsletterInsertIndex(
  children: MarkupNode[],
  frontmatter: Record<string, unknown>,
): number | null {
  if (!newsletterEligible(frontmatter) || hasNewsletterMarker(children)) return null;
  const paragraphs = children
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => node.type === "element" && node.tagName === "p");
  if (paragraphs.length >= minimumParagraphs) {
    const requested =
      typeof frontmatter.newsletterAfter === "number" ? frontmatter.newsletterAfter : defaultAfter;
    const after = paragraphs[requested - 1];
    if (after) return after.index + 1;
  }
  return children.length;
}

export function newsletterElement(frontmatter: Record<string, unknown> = {}): MarkupNode {
  return inquiryFormElement(frontmatter) as MarkupNode;
}
