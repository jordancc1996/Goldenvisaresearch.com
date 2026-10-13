export type CoverageItem = {
  id: string;
  collection: string;
  href: string;
  title: string;
  category: string;
  publishedAt: Date;
  topic?: string;
  authorIds: string[];
  countryIds: string[];
  programTypes: string[];
  placeholder: boolean;
};

export type CoverageCurrent = {
  id: string;
  collection: string;
  topic?: string;
  authorIds: string[];
  countryIds: string[];
  programTypes: string[];
};

export type CoverageGroups = {
  sidebar: CoverageItem[];
  author: CoverageItem[];
  topic: CoverageItem[];
  country: CoverageItem[];
};

const sidebarLimit = 3;
const groupLimit = 3;

function keyOf(item: { collection: string; id: string }): string {
  return `${item.collection}/${item.id}`;
}

function newest(items: CoverageItem[]): CoverageItem[] {
  return [...items].sort((left, right) => right.publishedAt.getTime() - left.publishedAt.getTime());
}

function take(items: CoverageItem[], used: Set<string>, limit: number): CoverageItem[] {
  const picked = newest(items)
    .filter((item) => !used.has(keyOf(item)))
    .slice(0, limit);
  for (const item of picked) used.add(keyOf(item));
  return picked;
}

export function buildCoverage(current: CoverageCurrent, items: CoverageItem[]): CoverageGroups {
  const rest = items.filter((item) => keyOf(item) !== keyOf(current));
  const countries = new Set(current.countryIds);
  const types = new Set(current.programTypes);
  const authors = new Set(current.authorIds);
  const sidebar = take(
    rest.filter(
      (item) =>
        item.countryIds.some((id) => countries.has(id)) ||
        item.programTypes.some((type) => types.has(type)),
    ),
    new Set(),
    sidebarLimit,
  );
  const used = new Set(sidebar.map(keyOf));
  const author = take(
    rest.filter((item) => item.authorIds.some((id) => authors.has(id))),
    used,
    groupLimit,
  );
  const topic = current.topic
    ? take(
        rest.filter((item) => item.topic === current.topic),
        used,
        groupLimit,
      )
    : [];
  const country = take(
    rest.filter((item) => item.countryIds.some((id) => countries.has(id))),
    used,
    groupLimit,
  );
  return { sidebar, author, topic, country };
}
