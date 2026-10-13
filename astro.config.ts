import { spawn } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { satteri } from "@astrojs/markdown-satteri";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";
import { site } from "./src/data/site";
import { articleNewsletterPlugin } from "./src/plugins/article-newsletter";
import { allowInSitemap } from "./src/lib/metadata";
import { auditContentDirectory, stalePublishedWarnings } from "./src/lib/publish-audit";

function publicationAudit(): AstroIntegration {
  return {
    name: "publication-audit",
    hooks: {
      "astro:build:start": () => {
        const failures = auditContentDirectory();
        if (failures.length > 0) {
          throw new Error(`Published content failed verification.\n${failures.join("\n")}`);
        }
        const stale = stalePublishedWarnings();
        if (stale.length > 0) {
          console.warn(`Records flagged for editorial review.\n${stale.join("\n")}`);
        }
      },
    },
  };
}

function withholdFeedUntilOrigin(origin: string | null): AstroIntegration {
  return {
    name: "withhold-feed-until-origin",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const root = fileURLToPath(dir);
        if (!origin) await rm(path.join(root, "rss.xml"), { force: true });
        const newsSitemap = path.join(root, "news-sitemap.xml");
        try {
          const text = await readFile(newsSitemap, "utf8");
          if (!origin || !text.includes("<loc>")) await rm(newsSitemap, { force: true });
        } catch {
          await rm(newsSitemap, { force: true });
        }
      },
    },
  };
}

function pagefindIndex(): AstroIntegration {
  return {
    name: "pagefind-index",
    hooks: {
      "astro:build:done": async ({ dir }) => {
        const root = fileURLToPath(dir);
        const script = fileURLToPath(new URL("./scripts/index-pagefind.mjs", import.meta.url));
        await new Promise<void>((resolve, reject) => {
          const child = spawn(process.execPath, [script, root], { stdio: "inherit" });
          child.on("error", reject);
          child.on("exit", (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Pagefind indexing exited with code ${code ?? "unknown"}.`));
          });
        });
      },
    },
  };
}

const origin = site.origin;
const constructionOff = ["false", "0", "off"].includes(
  (process.env.CONSTRUCTION_MODE ?? "").trim().toLowerCase(),
);
const constructionMode = !constructionOff;

export default defineConfig({
  ...(origin ? { site: origin } : {}),
  output: "static",
  trailingSlash: site.trailingSlash,
  build: {
    format: site.trailingSlash === "never" ? "file" : "directory",
  },
  markdown: {
    processor: satteri({
      hastPlugins: [articleNewsletterPlugin],
    }),
  },
  integrations: [
    mdx(),
    publicationAudit(),
    withholdFeedUntilOrigin(origin),
    pagefindIndex(),
    ...(origin && !constructionMode
      ? [
          sitemap({
            filter: allowInSitemap,
          }),
        ]
      : []),
  ],
  vite: {
    plugins: [tailwindcss()],
    define: {
      "globalThis.__CONSTRUCTION_MODE__": JSON.stringify(constructionMode),
      "process.env.CONSTRUCTION_MODE": JSON.stringify(constructionMode ? "true" : "false"),
    },
  },
});
