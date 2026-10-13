const minorWords = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "but",
  "by",
  "for",
  "in",
  "nor",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "without",
]);

export const properNames = [
  "Golden Visa Research",
  "Citizenship by Investment",
  "Residency by Investment",
  "Golden Visa",
  "Asia-Pacific",
  "Middle East",
  "Source Serif 4",
  "Formspree",
  "LinkedIn",
  "Inter",
];

export const h1CaseExceptions = new Set([
  "Policy changes, without the sales pitch.",
  "Type, color, and measure.",
]);

export type Heading = { level: number; text: string };

export function titleCase(value: string): string {
  const words = value.split(" ");
  return words
    .map((word, index) => {
      const lower = word.toLowerCase();
      const last = index === words.length - 1;
      if (index > 0 && !last && minorWords.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function decode(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function wordsOf(value: string): string[] {
  return value
    .replace(/[.,:;!?()[\]"“”]/g, "")
    .split(/\s+/)
    .filter(Boolean);
}

export function extractHeadings(html: string): Heading[] {
  return [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((match) => ({
    level: Number(match[1]),
    text: decode(match[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()),
  }));
}

function titleCaseFailure(text: string, allowed: Set<string>): string | null {
  if (allowed.has(text)) return null;
  const words = wordsOf(text);
  if (words.length === 0) return "empty heading";
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    const lower = word.toLowerCase();
    const edge = index === 0 || index === words.length - 1;
    if (!edge && minorWords.has(lower)) {
      if (word !== lower) return `"${word}" is capitalized in a minor position`;
      continue;
    }
    if (word[0] !== word[0].toUpperCase()) return `"${word}" is not capitalized`;
  }
  return null;
}

function sentenceCaseFailure(text: string): string | null {
  let masked = text;
  for (const name of [...properNames].sort((left, right) => right.length - left.length)) {
    masked = masked.replaceAll(name, "Proper");
  }
  const words = wordsOf(masked);
  if (words.length === 0) return "empty heading";
  if (words[0][0] !== words[0][0].toUpperCase()) return "the first word is not capitalized";
  for (const word of words.slice(1)) {
    if (word === "Proper") continue;
    if (/^[A-Z0-9]{2,}$/.test(word)) continue;
    if (word[0] === word[0].toUpperCase() && /[A-Za-z]/.test(word)) {
      return `"${word}" starts a later word with a capital`;
    }
  }
  return null;
}

export function headingIssues(headings: Heading[], storyHeadlines: string[] = []): string[] {
  const allowed = new Set([...h1CaseExceptions, ...storyHeadlines]);
  const issues: string[] = [];
  const h1s = headings.filter((heading) => heading.level === 1);
  if (h1s.length !== 1) issues.push(`expected one H1, found ${h1s.length}`);
  let previous = 0;
  const seen = new Map<string, number>();
  for (const heading of headings) {
    if (!heading.text) issues.push(`empty H${heading.level}`);
    if (heading.level > previous + 1) {
      issues.push(`H${heading.level} "${heading.text}" skips a level after H${previous || 0}`);
    }
    previous = heading.level;
    const key = `${heading.level}:${heading.text}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
    if (heading.level === 1) {
      const failure = titleCaseFailure(heading.text, allowed);
      if (failure) issues.push(`H1 "${heading.text}": ${failure}`);
    } else {
      const failure = sentenceCaseFailure(heading.text);
      if (failure) issues.push(`H${heading.level} "${heading.text}": ${failure}`);
    }
  }
  for (const [key, count] of seen) {
    if (count > 1) issues.push(`duplicate heading ${key}`);
  }
  return issues;
}
