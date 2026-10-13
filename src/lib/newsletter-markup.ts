import { site } from "../data/site.ts";

type MarkupNode = {
  type: string;
  tagName?: string;
  name?: string;
  value?: string;
  properties?: Record<string, string | string[] | undefined>;
  children?: MarkupNode[];
};

const minimumParagraphs = 6;
const defaultAfter = 3;

function text(value: string): MarkupNode {
  return { type: "text", value };
}

function element(
  tagName: string,
  properties: Record<string, string | string[] | undefined>,
  children: MarkupNode[],
): MarkupNode {
  return { type: "element", tagName, properties, children };
}

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
    if (node.type === "mdxJsxFlowElement" && node.name === "ArticleNewsletter") return true;
    return classText(node).split(/\s+/).includes("article-newsletter");
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
  if (paragraphs.length < minimumParagraphs) return null;
  const requested =
    typeof frontmatter.newsletterAfter === "number" ? frontmatter.newsletterAfter : defaultAfter;
  const after = paragraphs[requested - 1];
  if (!after) return null;
  return after.index + 1;
}

export function newsletterElement(): MarkupNode {
  const configured = typeof site.forms.newsletter === "string" && site.forms.newsletter.length > 0;
  const explanation = configured
    ? "The subscription form is on the newsletter page."
    : "Newsletter subscription is not configured. The form does not send a message.";
  const label = configured ? "Subscribe" : "Newsletter";
  return element(
    "aside",
    {
      className: ["article-newsletter"],
      ariaLabel: "Newsletter",
      "data-pagefind-ignore": "true",
    },
    [
      element("div", { className: ["article-newsletter-copy"] }, [
        element("p", { className: ["article-newsletter-name"] }, [text(site.name)]),
        element("p", { className: ["article-newsletter-heading"] }, [
          text("Policy changes, without the sales pitch."),
        ]),
      ]),
      element("div", { className: ["article-newsletter-rule"], ariaHidden: "true" }, []),
      element("div", { className: ["article-newsletter-action"] }, [
        element("p", {}, [text(explanation)]),
        element("a", { className: ["button"], href: "/newsletter" }, [text(label)]),
      ]),
    ],
  );
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function attribute(name: string, value: string): string {
  const htmlName = name === "className" ? "class" : name === "ariaLabel" ? "aria-label" : name === "ariaHidden" ? "aria-hidden" : name;
  return ` ${htmlName}="${escapeText(value)}"`;
}

export function newsletterHtml(): string {
  const node = newsletterElement();
  return renderNode(node);
}

function renderNode(node: MarkupNode): string {
  if (node.type === "text") return escapeText(node.value ?? "");
  const attrs = Object.entries(node.properties ?? {})
    .filter((entry): entry is [string, string | string[]] => entry[1] !== undefined)
    .map(([key, value]) => attribute(key, Array.isArray(value) ? value.join(" ") : value))
    .join("");
  const children = (node.children ?? []).map(renderNode).join("");
  return `<${node.tagName}${attrs}>${children}</${node.tagName}>`;
}
