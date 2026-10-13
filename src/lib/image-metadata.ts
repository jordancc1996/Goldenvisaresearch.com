import type { ImageMetadata } from "astro";

export function isImageMetadata(value: unknown): value is ImageMetadata {
  if (!value || typeof value !== "object") return false;
  const image = value as Record<string, unknown>;
  return (
    typeof image.src === "string" &&
    image.src.length > 0 &&
    typeof image.width === "number" &&
    typeof image.height === "number" &&
    typeof image.format === "string"
  );
}
