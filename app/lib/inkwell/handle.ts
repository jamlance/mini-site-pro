// Web address handles for Inkwell Mini Sites (INK-1572): shared by the editor UI and the server.

export const HANDLE_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;

/** A DNS-safe handle from any name ("Blue Mahoe Botanicals" → "blue-mahoe-botanicals"). */
export function toHandle(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}
