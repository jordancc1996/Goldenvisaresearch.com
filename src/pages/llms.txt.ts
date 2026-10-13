import type { APIRoute } from "astro";
import { site } from "../data/site";
import { loadMachineEntries } from "../lib/load-machine";
import { llmsText } from "../lib/machine-readable";

export const GET: APIRoute = async () => {
  const entries = await loadMachineEntries();
  return new Response(llmsText(site.origin, entries), {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-robots-tag": "noindex, follow",
    },
  });
};
