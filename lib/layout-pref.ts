/**
 * Library layout. The top-bar layout is the only one: no sidebar column; the
 * logo and profile live in the feed's top bar, and the sidebar only appears
 * as a floating card while a pasted link is being saved. "sidebar" stays in
 * the type for the components' styling hooks (data-layout).
 */
export type LibraryLayout = "bar" | "sidebar";

export const LIBRARY_LAYOUT: LibraryLayout = "bar";
