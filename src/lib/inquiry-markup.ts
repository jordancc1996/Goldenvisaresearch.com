import { site } from "../data/site.ts";
import { inquiryProgramFor, inquiryPrograms } from "../data/inquiry-programs.ts";

type MarkupNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, string | string[] | boolean | undefined>;
  children?: MarkupNode[];
};

function text(value: string): MarkupNode {
  return { type: "text", value };
}

function element(
  tagName: string,
  properties: Record<string, string | string[] | boolean | undefined>,
  children: MarkupNode[],
): MarkupNode {
  return { type: "element", tagName, properties, children };
}

function field(
  id: string,
  label: string,
  control: MarkupNode,
): MarkupNode {
  return element("p", { className: ["inquiry-field"] }, [
    element("label", { htmlFor: id }, [
      text(label),
      text(" "),
      element("span", { className: ["inquiry-required"], "aria-hidden": "true" }, [text("*")]),
    ]),
    control,
    element(
      "span",
      { id: `${id}-error`, className: ["inquiry-error"], "data-error-for": id },
      [],
    ),
  ]);
}

export function inquiryFormElement(frontmatter: Record<string, unknown>): MarkupNode {
  const endpoint = site.forms.inquiry ?? "";
  const selected = inquiryProgramFor(frontmatter);
  const title = typeof frontmatter.title === "string" ? frontmatter.title : "";
  const email: MarkupNode = {
    type: "element",
    tagName: "input",
    children: [],
    properties: {
      id: "article-inquiry-email",
      name: "email",
      type: "email",
      required: true,
      autocomplete: "email",
      placeholder: "Enter your email address",
      "aria-describedby": "article-inquiry-email-error",
    },
  };
  const linkedin: MarkupNode = {
    type: "element",
    tagName: "input",
    children: [],
    properties: {
      id: "article-inquiry-linkedin",
      name: "linkedin",
      type: "url",
      required: true,
      autocomplete: "url",
      placeholder: "https://www.linkedin.com/in/yourprofile",
      "aria-describedby": "article-inquiry-linkedin-error",
    },
  };
  const program = element(
    "select",
    {
      id: "article-inquiry-program",
      name: "program",
      required: true,
      "aria-describedby": "article-inquiry-program-error",
    },
    inquiryPrograms.map((item) =>
      element(
        "option",
        {
          value: item.label,
          ...(item.id === selected ? { selected: true } : {}),
        },
        [text(item.label)],
      ),
    ),
  );
  const notes: MarkupNode[] = [
    element("p", { className: ["inquiry-privacy"] }, [
      text("Your information will be used to respond to your inquiry. Please review our "),
      element("a", { href: "/privacy" }, [text("Privacy Policy")]),
      text(" for details."),
    ]),
  ];
  if (!endpoint) {
    notes.push(
      element("p", { className: ["inquiry-note"] }, [
        text("No inquiry endpoint is configured. This form does not send or store these fields."),
      ]),
    );
  }
  return element(
    "aside",
    {
      className: ["article-inquiry"],
      "aria-labelledby": "article-inquiry-heading",
      "data-pagefind-ignore": "true",
    },
    [
      element("p", { className: ["article-inquiry-kicker"] }, [text(site.name)]),
      element("p", { className: ["article-inquiry-heading"], id: "article-inquiry-heading" }, [
        text("Interested in an Investment Immigration Program?"),
      ]),
      element("p", { className: ["article-inquiry-copy"] }, [
        text(
          "Prospective applicants should verify the latest program requirements with a qualified immigration lawyer licensed in the relevant jurisdiction and seek independent legal and tax advice before making any investment decisions.",
        ),
      ]),
      element("p", { className: ["article-inquiry-copy"] }, [
        text(
          "Stay informed with the latest golden visa news, program updates, and investment immigration developments at GoldenVisaResearch.com.",
        ),
      ]),
      element(
        "form",
        {
          className: ["article-inquiry-form"],
          method: "post",
          ...(endpoint ? { action: endpoint } : {}),
          "data-inquiry-form": "",
          "data-endpoint": endpoint,
          novalidate: true,
        },
        [
          element("p", { className: ["form-honeypot"] }, [
            element("label", { htmlFor: "article-inquiry-gotcha" }, [text("Leave this field empty")]),
            {
              type: "element",
              tagName: "input",
              children: [],
              properties: {
                id: "article-inquiry-gotcha",
                name: "_gotcha",
                type: "text",
                tabindex: "-1",
                autocomplete: "off",
              },
            },
          ]),
          {
            type: "element",
            tagName: "input",
            children: [],
            properties: { type: "hidden", name: "article_title", value: title },
          },
          {
            type: "element",
            tagName: "input",
            children: [],
            properties: { type: "hidden", name: "article_url", value: "" },
          },
          {
            type: "element",
            tagName: "input",
            children: [],
            properties: { type: "hidden", name: "lead_source", value: "GoldenVisaResearch.com" },
          },
          field("article-inquiry-email", "Email Address", email),
          field("article-inquiry-linkedin", "LinkedIn Profile URL", linkedin),
          field("article-inquiry-program", "Which program are you interested in?", program),
          element("button", { className: ["button"], type: "submit" }, [text("Explore Your Options")]),
          element(
            "p",
            { className: ["inquiry-status"], "data-form-status": "", role: "status", "aria-live": "polite" },
            [],
          ),
          ...notes,
          element("noscript", {}, [
            element("p", { className: ["inquiry-note"] }, [
              text(
                endpoint
                  ? "Without JavaScript, this form is sent directly to the inquiry endpoint."
                  : "Without JavaScript, this form does not send a message, because no inquiry endpoint is configured.",
              ),
            ]),
          ]),
        ],
      ),
    ],
  );
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const attributeNames: Record<string, string> = {
  className: "class",
  htmlFor: "for",
};

function attribute(name: string, value: string | boolean): string {
  if (value === false) return "";
  const htmlName = attributeNames[name] ?? name;
  if (value === true) return ` ${htmlName}`;
  return ` ${htmlName}="${escapeText(value)}"`;
}

function renderNode(node: MarkupNode): string {
  if (node.type === "text") return escapeText(node.value ?? "");
  const attrs = Object.entries(node.properties ?? {})
    .filter((entry): entry is [string, string | boolean | string[]] => entry[1] !== undefined)
    .map(([key, value]) => attribute(key, Array.isArray(value) ? value.join(" ") : value))
    .join("");
  const children = (node.children ?? []).map(renderNode).join("");
  if (node.tagName === "input") return `<${node.tagName}${attrs}>`;
  return `<${node.tagName}${attrs}>${children}</${node.tagName}>`;
}

export function inquiryFormHtml(frontmatter: Record<string, unknown> = {}): string {
  return renderNode(inquiryFormElement(frontmatter));
}
