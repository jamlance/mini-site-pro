// Inkwell Mini Site: load/save the merchant's content and build the template
// context from the site row (INK-1572).
import { eq } from "drizzle-orm";
import { site } from "~/db/schema.server.mjs";
import { sanitizeContent, defaultContent, type InkwellContent } from "./content";
import type { TemplateContext } from "./templates.server";

type Storage = { db: any; raw: any };
type SiteRow = typeof site.$inferSelect;

export { HANDLE_RE, toHandle } from "./handle";

export function contentOf(s: SiteRow): InkwellContent {
  const name = s.businessName || "My shop";
  return s.inkwell ? sanitizeContent(s.inkwell, name) : seedContent(s);
}

/** First-run content from what the older editor already knew about the shop. */
export function seedContent(s: SiteRow): InkwellContent {
  const name = s.businessName || "My shop";
  const c = defaultContent(name);
  c.hero.line = s.tagline || "";
  c.about.lead = s.about && s.about !== `Welcome to ${name}.` ? s.about : "";
  c.contact.whatsapp = s.phone || "";
  c.contact.email = s.email || "";
  c.contact.address = s.address || "";
  return sanitizeContent(c, name);
}

export async function saveContent(storage: Storage, merchantId: number, name: string, content: unknown): Promise<InkwellContent> {
  const clean = sanitizeContent(content, name);
  await storage.db.update(site).set({ inkwell: clean, businessName: name, accent: clean.accent }).where(eq(site.merchantId, merchantId));
  return clean;
}

export function templateContext(s: SiteRow, content: InkwellContent): TemplateContext {
  return {
    name: s.businessName || "My shop",
    handle: s.handle || `shop-${s.merchantId}`,
    currency: (s.currency || "JMD").toUpperCase(),
    content,
    version: Date.now().toString(36),
  };
}
