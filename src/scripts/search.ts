type SearchStatus = { documents?: number };

type SearchRecord = {
  url: string;
  excerpt: string;
  meta?: { title?: string };
};

type SearchEngine = {
  init: () => Promise<void>;
  search: (query: string) => Promise<{ results: Array<{ data: () => Promise<SearchRecord> }> }>;
};

const form = document.querySelector<HTMLFormElement>("[data-search-page]");
const input = document.querySelector<HTMLInputElement>("#search-query");
const status = document.querySelector<HTMLElement>("[data-search-status]");
const list = document.querySelector<HTMLOListElement>("[data-search-results]");

function say(message: string) {
  if (status) status.textContent = message;
}

function resultPath(url: string) {
  const path = url.split(/[?#]/)[0].replace(/\.html$/, "");
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path || "/";
}

function plainExcerpt(value: string) {
  return value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

async function loadEngine(): Promise<SearchEngine | "empty" | "unavailable"> {
  let documents = 0;
  try {
    const response = await fetch("/pagefind/status.json");
    if (!response.ok) return "unavailable";
    const body = (await response.json()) as SearchStatus;
    documents = body.documents ?? 0;
  } catch {
    return "unavailable";
  }
  if (documents < 1) return "empty";
  try {
    const load = new Function("return import('/pagefind/pagefind.js')") as () => Promise<SearchEngine>;
    const pagefind = await load();
    await pagefind.init();
    return pagefind;
  } catch {
    return "unavailable";
  }
}

let engine: Promise<SearchEngine | "empty" | "unavailable"> | undefined;

async function show(query: string) {
  if (!list) return;
  list.replaceChildren();
  const term = query.trim();
  if (!term) {
    say("Enter a word or phrase.");
    return;
  }
  engine ??= loadEngine();
  const ready = await engine;
  if (ready === "unavailable") {
    say("Search is not available.");
    return;
  }
  if (ready === "empty") {
    say("No published pages are indexed.");
    return;
  }
  const found = await ready.search(term);
  if (found.results.length === 0) {
    say("No published pages match that search.");
    return;
  }
  say(found.results.length === 1 ? "1 result." : `${found.results.length} results.`);
  for (const result of found.results) {
    const data = await result.data();
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = resultPath(data.url);
    link.textContent = data.meta?.title || resultPath(data.url);
    const excerpt = document.createElement("p");
    excerpt.textContent = plainExcerpt(data.excerpt);
    item.append(link, excerpt);
    list.append(item);
  }
}

function moveFocus(direction: 1 | -1) {
  if (!list) return;
  const links = [...list.querySelectorAll("a")];
  if (links.length === 0) return;
  const current = links.indexOf(document.activeElement as HTMLAnchorElement);
  const next = current === -1 ? (direction === 1 ? 0 : links.length - 1) : current + direction;
  links[(next + links.length) % links.length]?.focus();
}

list?.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  event.preventDefault();
  moveFocus(event.key === "ArrowDown" ? 1 : -1);
});

input?.addEventListener("keydown", (event) => {
  if (event.key !== "ArrowDown") return;
  const first = list?.querySelector("a");
  if (!first) return;
  event.preventDefault();
  first.focus();
});

const initial = new URLSearchParams(window.location.search).get("q") ?? "";
if (input) input.value = initial;
void show(initial);

form?.addEventListener("submit", () => {
  if (input) input.setAttribute("aria-invalid", input.value.trim() ? "false" : "true");
});

export {};
