// POST /inkwell/preview — the editor's live preview (INK-1572): the real page
// template rendered locally with the merchant's Inkress items and the content
// as it is in the editor right now (not yet saved). Returns HTML for an iframe.
import type { Route } from "./+types/inkwell.preview";
import { appKit, requireMerchant } from "~/lib/app-kit.server.mjs";
import { ensureSite } from "~/lib/site.server.mjs";
import { sanitizeContent } from "~/lib/inkwell/content";
import { templateContext, toHandle } from "~/lib/inkwell/site.server";
import { renderPreview, toPreviewItem, type PreviewItem } from "~/lib/inkwell/publish.server";

export async function action(args: Route.ActionArgs) {
  const { merchantId, merchant, admin, scopes } = requireMerchant(args);
  const s = await ensureSite(appKit.storage, merchantId, merchant);
  const b = (await args.request.json().catch(() => ({}))) as { content?: unknown; name?: string; handle?: string };
  const name = String(b.name || s.businessName || "My shop").slice(0, 80);
  const content = sanitizeContent(b.content, name);
  let items: PreviewItem[] = [];
  if (scopes.includes("products:read")) {
    try {
      const r = (await admin.products.list({ page_size: 100 })) as { result?: { entries?: Record<string, unknown>[] } };
      items = (r?.result?.entries || []).map(toPreviewItem);
    } catch {
      /* preview without items */
    }
  }
  const ctx = templateContext({ ...s, businessName: name, handle: toHandle(b.handle) || s.handle }, content);
  const html = await renderPreview(ctx, items);
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
