import { SectionFailure } from './sectionFailure';

export const PAGE_LIMIT = 100;
/** Stop after this many pages even when `meta.total` says more remain. */
export const MAX_PAGES = 4;

export interface PageMeta {
  page?: number;
  per_page?: number;
  total?: number;
}

export interface PageResult<T> {
  data: T[];
  meta?: PageMeta | null;
}

/**
 * Follows Pagy pages while `meta.total` is greater than the rows already collected.
 * Stops at {@link MAX_PAGES} or when a later page is empty. A page that is not a list fails the load.
 */
export const collectPages = async <T>(
  fetchPage: (page: number) => Promise<PageResult<T>>,
): Promise<T[]> => {
  const rows: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const next = await fetchPage(page);
    if (!Array.isArray(next?.data)) {
      throw new SectionFailure();
    }
    if (page > 1 && next.data.length === 0) {
      break;
    }

    rows.push(...next.data);
    const total = next.meta?.total;
    if (typeof total !== 'number' || !Number.isFinite(total) || rows.length >= total) {
      break;
    }
  }

  return rows;
};
