import type { ReactNode } from "react";

/** Feed column. First in the DOM so phones show links before the sidebar. */
export const vaultFeedColumnClass =
  "flex min-h-0 min-w-0 flex-1 flex-col lg:col-start-2 lg:row-start-1 lg:h-full lg:overflow-hidden";

/** Sidebar column. On a wide screen it sits in the first grid column. */
export const vaultSidebarColumnClass =
  "lg:col-start-1 lg:row-start-1 lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-hidden";

type Props = {
  feed: ReactNode;
  sidebar: ReactNode;
  footer: ReactNode;
};

/**
 * Phone layout reads feed, then sidebar. Wide screens keep the sidebar on
 * the left by placing that column explicitly.
 */
export default function VaultColumns({ feed, sidebar, footer }: Props) {
  return (
    <>
      <div data-vault-column="feed" className={vaultFeedColumnClass}>
        {feed}
      </div>
      <div data-vault-column="sidebar" className={vaultSidebarColumnClass}>
        {sidebar}
      </div>
      {footer}
    </>
  );
}
