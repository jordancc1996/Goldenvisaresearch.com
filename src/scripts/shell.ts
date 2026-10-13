const nav = document.querySelector<HTMLElement>("#edition-nav");
const masthead = document.querySelector<HTMLElement>("#masthead");
const sentinel = document.querySelector<HTMLElement>("#nav-sentinel");
const brand = document.querySelector<HTMLElement>("#edition-brand");
const main = document.querySelector<HTMLElement>("#main");

const panels = {
  sections: {
    trigger: document.querySelector<HTMLButtonElement>("#sections-trigger"),
    panel: document.querySelector<HTMLElement>("#sections-panel"),
  },
  search: {
    trigger: document.querySelector<HTMLButtonElement>("#search-trigger"),
    panel: document.querySelector<HTMLElement>("#search-panel"),
  },
  more: {
    trigger: document.querySelector<HTMLButtonElement>("#more-trigger"),
    panel: document.querySelector<HTMLElement>("#more-panel"),
  },
} as const;

type PanelName = keyof typeof panels;

let openName: PanelName | null = null;
let stuck = false;

function focusable(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), input:not([disabled])")].filter(
    (element) => !element.closest("[hidden]"),
  );
}

function syncBrand() {
  if (!brand) return;
  brand.hidden = !stuck;
}

function setOpen(name: PanelName | null) {
  openName = name;
  for (const key of Object.keys(panels) as PanelName[]) {
    const item = panels[key];
    const on = key === name;
    if (item.panel) item.panel.hidden = !on;
    item.trigger?.setAttribute("aria-expanded", on ? "true" : "false");
  }
}

function openPanel(name: PanelName) {
  const item = panels[name];
  if (!item.panel || !item.trigger) return;
  setOpen(name);
  if (name === "search") {
    item.panel.querySelector<HTMLElement>("input")?.focus();
    return;
  }
  focusable(item.panel)[0]?.focus();
}

function closePanel(restore: boolean) {
  if (!openName) return;
  const trigger = panels[openName].trigger;
  setOpen(null);
  if (restore) trigger?.focus();
}

function applyStuck(next: boolean) {
  stuck = next;
  nav?.classList.toggle("is-stuck", stuck);
  if (masthead) masthead.inert = stuck;
  syncBrand();
}

if (sentinel && nav) {
  const observer = new IntersectionObserver(
    ([entry]) => {
      applyStuck(entry ? !entry.isIntersecting : false);
    },
    { threshold: 0 },
  );
  observer.observe(sentinel);
}

for (const name of Object.keys(panels) as PanelName[]) {
  const item = panels[name];
  item.trigger?.addEventListener("click", () => {
    if (openName === name) closePanel(false);
    else openPanel(name);
  });
  item.panel?.addEventListener("click", (event) => {
    const target = event.target;
    if (target instanceof Element && target.closest("a")) closePanel(false);
  });
}

document.addEventListener("click", (event) => {
  if (!openName || !nav) return;
  if (event.target instanceof Node && nav.contains(event.target)) return;
  closePanel(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && openName) {
    event.preventDefault();
    closePanel(true);
  }
});

if (main) main.style.scrollMarginTop = "72px";
