import type { APIRoute } from "astro";
import { site } from "../../../data/site";
import { loadMachineEntries } from "../../../lib/load-machine";
import { markdownDocument } from "../../../lib/machine-readable";

export async function getStaticPaths() {
  const entries = await loadMachineEntries();
  return entries.map((entry) => ({
    params: { collection: entry.collection, id: entry.id },
  }));
}

export const GET: APIRoute = async ({ params }) => {
  const entries = await loadMachineEntries();
  const entry = entries.find((item) => item.collection === params.collection && item.id === params.id);
  if (!entry) {
    return new Response("Not found.\n", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(markdownDocument(site.origin, entry), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "x-robots-tag": "noindex, follow",
    },
  });
};
