import { embedUrl, type VideoProvider } from "./audit-video";

function isProvider(value: string | undefined): value is VideoProvider {
  return value === "youtube" || value === "vimeo" || value === "bunny";
}

function mount(root: HTMLElement, start: number) {
  const provider = root.dataset.provider;
  const id = root.dataset.id;
  if (!isProvider(provider) || !id) return;
  const iframe = document.createElement("iframe");
  iframe.src = embedUrl(provider, id, start);
  iframe.title = root.dataset.title || "Video";
  iframe.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = "strict-origin-when-cross-origin";
  const button = root.querySelector("[data-audit-play]");
  if (button) button.replaceWith(iframe);
  else root.append(iframe);
}

export function startAuditPlayer() {
  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const chapter = target.closest<HTMLElement>("[data-start]");
    const play = target.closest<HTMLElement>("[data-audit-play]");
    const root = (chapter ?? play)?.closest<HTMLElement>("[data-audit-player]");
    if (!root?.dataset.provider || !root.dataset.id) return;
    const start = chapter ? Number(chapter.dataset.start || "0") : 0;
    const existing = root.querySelector("iframe");
    if (existing && chapter) {
      const provider = root.dataset.provider;
      if (!isProvider(provider)) return;
      existing.src = embedUrl(provider, root.dataset.id, Number.isFinite(start) ? start : 0);
      return;
    }
    if (!existing) mount(root, Number.isFinite(start) ? start : 0);
  });
}
