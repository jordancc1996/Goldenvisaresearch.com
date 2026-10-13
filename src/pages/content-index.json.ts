import type { APIRoute } from "astro";
import { site } from "../data/site";
import { loadMachineEntries } from "../lib/load-machine";
import { contentIndexText } from "../lib/machine-readable";

export const GET: APIRoute = async () => {
  const entries = await loadMachineEntries();
  return new Response(contentIndexText(site.origin, entries), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "x-robots-tag": "noindex, follow",
    },
  });
};
