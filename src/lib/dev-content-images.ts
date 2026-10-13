import { isImageMetadata } from "./image-metadata";

const loaders = import.meta.glob("../assets/*.{webp,avif}", { import: "default" });

export async function resolveDevContentImage(src: string) {
  const name = src.split(/[\\/]/).pop()?.split("?")[0];
  if (!name) return undefined;
  const key = Object.keys(loaders).find((item) => item.endsWith(`/${name}`));
  if (!key) return undefined;
  const loaded = await loaders[key]();
  return isImageMetadata(loaded) ? loaded : undefined;
}
