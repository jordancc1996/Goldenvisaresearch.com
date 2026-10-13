const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-toc-link]")];
const targets = links
  .map((link) => {
    const id = link.getAttribute("href")?.slice(1);
    return id ? document.getElementById(id) : null;
  })
  .filter((target): target is HTMLElement => Boolean(target));

const uniqueTargets = [...new Map(targets.map((target) => [target.id, target])).values()];

function setCurrent(id: string) {
  for (const link of links) {
    if (link.getAttribute("href") === `#${id}`) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  }
}

if (uniqueTargets.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
      const next = visible[0]?.target;
      if (next instanceof HTMLElement) setCurrent(next.id);
    },
    { rootMargin: "-20% 0px -65% 0px", threshold: [0, 1] },
  );
  for (const target of uniqueTargets) observer.observe(target);
  setCurrent(uniqueTargets[0].id);
}

for (const button of document.querySelectorAll<HTMLButtonElement>(".share-bar button[aria-disabled='true']")) {
  button.addEventListener("click", (event) => {
    event.preventDefault();
  });
}

const copyButton = document.querySelector<HTMLButtonElement>("[data-copy-link]");
const copyStatus = document.querySelector<HTMLElement>("[data-copy-status]");

copyButton?.addEventListener("click", async () => {
  if (!copyStatus) return;
  try {
    await navigator.clipboard.writeText(window.location.href);
    copyStatus.textContent = "Link copied";
  } catch {
    copyStatus.textContent = "Copy is not available in this browser.";
  }
});
