import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  throw new Error("Pagefind needs the built site directory.");
}

const outputPath = path.join(root, "pagefind");

async function htmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === "pagefind") continue;
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

let eligible = 0;
for (const file of await htmlFiles(root)) {
  const html = await readFile(file, "utf8");
  if (html.includes("data-pagefind-body")) eligible += 1;
}

if (eligible === 0) {
  await mkdir(outputPath, { recursive: true });
  await writeFile(path.join(outputPath, "status.json"), `${JSON.stringify({ documents: 0 })}\n`);
  process.exit(0);
}

const { close, createIndex } = await import("pagefind");
const created = await createIndex({ writePlayground: false });
if (!created.index || created.errors.length > 0) {
  await close();
  throw new Error(created.errors.join("\n") || "Pagefind did not start.");
}

const indexed = await created.index.addDirectory({ path: root, glob: "**/*.html" });
if (indexed.errors.length > 0) {
  await close();
  throw new Error(indexed.errors.join("\n"));
}

if (indexed.page_count > 0) {
  const written = await created.index.writeFiles({ outputPath });
  if (written.errors.length > 0) {
    await close();
    throw new Error(written.errors.join("\n"));
  }
}

await mkdir(outputPath, { recursive: true });
await writeFile(
  path.join(outputPath, "status.json"),
  `${JSON.stringify({ documents: indexed.page_count })}\n`,
);
await close();
