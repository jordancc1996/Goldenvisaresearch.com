export type LinkRef = { from: string; href: string };

const skip = /^(https?:|mailto:|tel:|#|javascript:)/i;

export function internalPath(href: string): string | null {
  const value = href.trim();
  if (!value.startsWith("/") || skip.test(value)) return null;
  const path = value.split(/[?#]/)[0] || "/";
  if (path !== "/" && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function brokenInternalLinks(links: LinkRef[], routes: Set<string>): LinkRef[] {
  return links.filter((link) => {
    const path = internalPath(link.href);
    return path !== null && !routes.has(path);
  });
}

export function trailingSlashLinks(links: LinkRef[]): LinkRef[] {
  return links.filter((link) => {
    const bare = link.href.split(/[?#]/)[0];
    return bare.startsWith("/") && bare.length > 1 && bare.endsWith("/");
  });
}

export function orphanPaths(routes: string[], links: LinkRef[], excluded: Set<string>): string[] {
  const inbound = new Set<string>();
  for (const link of links) {
    const path = internalPath(link.href);
    if (path) inbound.add(path);
  }
  return routes.filter((route) => route !== "/" && !excluded.has(route) && !inbound.has(route));
}

export function exactAnchorCounts(pairs: { text: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const pair of pairs) {
    const text = pair.text.replace(/\s+/g, " ").trim();
    if (!text) continue;
    counts.set(text, (counts.get(text) ?? 0) + 1);
  }
  return counts;
}
