export type LinkMetadataShape = {
  title: string;
  description: string;
  imageUrl: string | null;
};

export type LinkProvider = {
  id: string;
  match: (url: URL) => boolean;
  /** Static asset under /public/brands */
  brandIcon: string;
  /** Ignore og:image; preview always uses brand (SPA / unreliable previews). */
  forceBrandIcon?: boolean;
  /** Use brand when we have no stored preview (instead of Google favicon). */
  fallbackBrandIcon?: boolean;
  titleFromUrl?: (url: URL) => string | null;
  defaultTitleWhenWeak?: string;
  isWeakScrapedTitle?: (title: string, url: URL) => boolean;
  /** Simple Icons SVGs are black — invert on dark cards. */
  invertInDarkMode?: boolean;
};
