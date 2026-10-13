import type { Root } from "hast";
import type { HastContent, HastVisitorContext } from "satteri";
import { newsletterElement, newsletterInsertIndex } from "../lib/newsletter-markup.ts";

function marker(node: Root["children"][number]) {
  if (node.type === "element") {
    const className = node.properties?.className;
    return {
      type: node.type,
      tagName: node.tagName,
      properties: {
        className: Array.isArray(className)
          ? className.filter((item): item is string => typeof item === "string")
          : typeof className === "string"
            ? className
            : undefined,
      },
    };
  }
  if (node.type === "mdxJsxFlowElement") {
    return { type: node.type, name: typeof node.name === "string" ? node.name : undefined };
  }
  return { type: node.type };
}

export const articleNewsletterPlugin = {
  name: "article-newsletter",
  before(root: Root, ctx: HastVisitorContext) {
    const frontmatter = (ctx.data as { astro?: { frontmatter?: Record<string, unknown> } }).astro?.frontmatter ?? {};
    const index = newsletterInsertIndex(root.children.map(marker), frontmatter);
    if (index === null) return;
    ctx.insertChildAt(root, index, newsletterElement() as HastContent);
  },
};
