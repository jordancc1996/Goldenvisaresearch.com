export {};

const root = document.querySelector<HTMLElement>("[data-directory]");
const form = document.querySelector<HTMLFormElement>("[data-directory-form]");
if (root && form) {
  const rows = [...root.querySelectorAll<HTMLElement>("[data-directory-row]")];
  const country = form.querySelector<HTMLSelectElement>('[data-filter="country"]');
  const type = form.querySelector<HTMLSelectElement>('[data-filter="type"]');
  const status = form.querySelector<HTMLSelectElement>('[data-filter="status"]');
  const order = form.querySelector<HTMLSelectElement>('[data-filter="order"]');
  const count = root.querySelector<HTMLElement>("[data-directory-count]");
  const list = root.querySelector<HTMLElement>(".directory-rows");

  const apply = () => {
    const countryValue = country?.value ?? "";
    const typeValue = type?.value ?? "";
    const statusValue = status?.value ?? "";
    const sort = order?.value === "verified" ? "verified" : "alphabetical";
    for (const row of rows) {
      const matches =
        (!countryValue || row.dataset.country === countryValue) &&
        (!typeValue || row.dataset.type === typeValue) &&
        (!statusValue || row.dataset.status === statusValue);
      row.hidden = !matches;
    }
    const shown = rows.filter((row) => !row.hidden);
    shown.sort((left, right) => {
      if (sort === "verified") {
        const leftTime = left.dataset.verified ? Number(left.dataset.verified) : -1;
        const rightTime = right.dataset.verified ? Number(right.dataset.verified) : -1;
        if (leftTime !== rightTime) return rightTime - leftTime;
      }
      const byCountry = (left.dataset.countryName ?? "").localeCompare(right.dataset.countryName ?? "", "en");
      if (byCountry !== 0) return byCountry;
      return (left.dataset.programName ?? "").localeCompare(right.dataset.programName ?? "", "en");
    });
    if (list) {
      for (const row of shown) list.appendChild(row);
      for (const row of rows) {
        if (row.hidden) list.appendChild(row);
      }
    }
    if (count) {
      const total = shown.length;
      count.textContent =
        total === 0 ? "No programs match these filters." : total === 1 ? "1 program" : `${total} programs`;
    }
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    apply();
  });
  form.addEventListener("change", apply);
}
