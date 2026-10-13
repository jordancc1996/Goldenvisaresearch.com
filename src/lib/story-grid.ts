export type GridStory = {
  href: string;
  title: string;
  categoryLabel: string;
  publishedAt: Date;
  summary?: string;
  hero?: {
    src: import("astro").ImageMetadata;
    alt: string;
    caption: string;
    credit: string;
    focal?: string;
  };
};

export type StoryColumn = {
  stories: GridStory[];
  image: boolean;
};

/**
 * Four columns when six stories exist: text, image, text, image.
 * Fewer stories use fewer columns. Stories are never repeated to fill a gap.
 */
export function storyColumns(stories: GridStory[]): StoryColumn[] {
  const count = stories.length;
  if (count <= 0) return [];
  if (count === 1) return [{ stories: stories.slice(0, 1), image: Boolean(stories[0]?.hero) }];
  if (count === 2) {
    return [
      { stories: stories.slice(0, 1), image: false },
      { stories: stories.slice(1, 2), image: Boolean(stories[1]?.hero) },
    ];
  }
  if (count === 3) {
    return [
      { stories: stories.slice(0, 1), image: false },
      { stories: stories.slice(1, 2), image: Boolean(stories[1]?.hero) },
      { stories: stories.slice(2, 3), image: false },
    ];
  }
  if (count === 4) {
    return [
      { stories: stories.slice(0, 2), image: false },
      { stories: stories.slice(2, 3), image: Boolean(stories[2]?.hero) },
      { stories: stories.slice(3, 4), image: false },
    ];
  }
  if (count === 5) {
    return [
      { stories: stories.slice(0, 2), image: false },
      { stories: stories.slice(2, 3), image: Boolean(stories[2]?.hero) },
      { stories: stories.slice(3, 5), image: false },
    ];
  }
  return [
    { stories: stories.slice(0, 2), image: false },
    { stories: stories.slice(2, 3), image: true },
    { stories: stories.slice(3, 5), image: false },
    { stories: stories.slice(5, 6), image: true },
  ];
}
