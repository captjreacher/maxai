import { getEntry } from 'astro:content';

export async function loadPageData(id: string) {
  const page = await getEntry('pages', id);

  if (!page) {
    throw new Error(`Missing page content: ${id}`);
  }

  return page.data;
}
