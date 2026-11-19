import "server-only";

/**
 * Lectura de las bases de Notion de Eco Motors (solo lectura, desde el servidor).
 * Requiere NOTION_TOKEN (integración interna) y compartir cada base con la integración.
 */
const NOTION_VERSION = "2025-09-03";

export const NOTION_SOURCES = {
  miembros: process.env.NOTION_MEMBERS_DS ?? "c1c2f627-6a59-4446-b94c-7f446d1f88d2",
  calendario: process.env.NOTION_CALENDAR_DS ?? "41a753ad-9210-81a5-aa65-000b96fa2e19",
};

export const notionEnabled = () => Boolean(process.env.NOTION_TOKEN);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotionPage = { id: string; url: string; properties: Record<string, any> };

export async function queryDataSource(id: string, body: Record<string, unknown> = {}): Promise<NotionPage[]> {
  const pages: NotionPage[] = [];
  let cursor: string | undefined;
  do {
    const res = await fetch(`https://api.notion.com/v1/data_sources/${id}/query`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...body, page_size: 100, start_cursor: cursor }),
      cache: "no-store",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message ?? `Notion respondió ${res.status}`);
    }
    const data = await res.json();
    pages.push(...data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return pages;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const text = (p: any): string =>
  (p?.title ?? p?.rich_text ?? []).map((t: { plain_text: string }) => t.plain_text).join("").trim();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const select = (p: any): string | null => p?.select?.name ?? null;
