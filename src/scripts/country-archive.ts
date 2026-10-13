import { regionQueryMatches } from "../data/home-regions";

const root = document.querySelector<HTMLElement>("[data-country-archive]");
if (root) {
  const input = root.querySelector<HTMLInputElement>("[data-country-search]");
  const buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-archive-filter]")];
  const rows = [...root.querySelectorAll<HTMLElement>("[data-country-row]")];
  const groups = [...root.querySelectorAll<HTMLElement>("[data-region-group]")];
  const empty = root.querySelector<HTMLElement>("[data-filter-empty]");
  const live = root.querySelector<HTMLElement>("[data-archive-count]");
  const requested = new URLSearchParams(window.location.search).get("region") ?? "all";
  let region = requested;

  const apply = () => {
    const needle = (input?.value ?? "").trim().toLowerCase();
    let shown = 0;
    for (const row of rows) {
      const name = (row.dataset.name ?? "").toLowerCase();
      const rowRegion = row.dataset.region ?? "";
      const match = regionQueryMatches(rowRegion, region) && (!needle || name.includes(needle));
      row.hidden = !match;
      if (match) shown += 1;
    }
    for (const group of groups) {
      group.hidden = !group.querySelector("[data-country-row]:not([hidden])");
    }
    if (empty) empty.hidden = !(rows.length > 0 && shown === 0);
    if (live && rows.length > 0) {
      live.textContent = shown === 1 ? "1 country" : `${shown} countries`;
    }
  };

  root.addEventListener("submit", (event) => {
    event.preventDefault();
    apply();
  });
  const syncPressed = () => {
    for (const item of buttons) {
      item.setAttribute("aria-pressed", item.dataset.archiveFilter === region ? "true" : "false");
    }
  };

  input?.addEventListener("input", apply);
  for (const button of buttons) {
    button.addEventListener("click", () => {
      region = button.dataset.archiveFilter ?? "all";
      syncPressed();
      apply();
    });
  }
  syncPressed();
  apply();
}
