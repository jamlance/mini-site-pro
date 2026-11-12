// Inkwell Mini Site publishing (INK-1572): the plan check, the FleekSite
// provisioning call (FS-669) and the in-editor preview.
//
// FleekSite owns hosting at <handle>.<base domain>; this app owns the content.
// Publishing renders the template set and hands it to FleekSite, which
// creates or updates the merchant's site in one call.
import { Liquid, Tag, type Context, type Emitter, type TagToken, type TopLevelToken } from "liquidjs";
import type { InkwellContent } from "./content";
import { buildTemplates, indexPage, type SiteTemplate, type TemplateContext } from "./templates.server";
import { ASSETS_CSS } from "./assets/css";
import { ASSETS_JS } from "./assets/js";

/** How the Inkwell plan gate behaves (same modes as Inkress's RequireFeature rollout). */
export const GateMode = { Off: "off", Observe: "observe", Enforce: "enforce" } as const;
export type GateMode = (typeof GateMode)[keyof typeof GateMode];

export interface PublishConfig {
  fleeksiteBase: string;
  secret: string;
  baseDomain: string;
  inkressApiBase: string;
  checkoutBase: string;
  gate: GateMode;
}

/** Everything comes from env; publishing is off (null) until FleekSite is configured. */
export function publishConfig(env: NodeJS.ProcessEnv = process.env): PublishConfig | null {
  const fleeksiteBase = (env.FLEEKSITE_API_BASE || "").replace(/\/$/, "");
  const secret = env.INKWELL_PROVISION_SECRET || "";
  const inkressApiBase = (env.INKRESS_API_BASE || "").replace(/\/$/, "");
  if (!fleeksiteBase || !secret || !inkressApiBase) return null;
  const isDev = /api-dev\.|\/\/dev\./.test(inkressApiBase);
  const gate = Object.values(GateMode).includes(env.INKWELL_GATE as GateMode) ? (env.INKWELL_GATE as GateMode) : isDev ? GateMode.Observe : GateMode.Enforce;
  return {
    fleeksiteBase,
    secret,
    baseDomain: env.INKWELL_BASE_DOMAIN || (isDev ? "dev.myinkress.com" : "myinkress.com"),
    inkressApiBase,
    checkoutBase: (env.INKRESS_CHECKOUT_BASE || (isDev ? "https://dev.inkress.com" : "https://inkress.com")).replace(/\/$/, ""),
    gate,
  };
}

export const PlanAccess = { Allowed: "allowed", NeedsInkwell: "needs_inkwell", Unknown: "unknown" } as const;
export type PlanAccess = (typeof PlanAccess)[keyof typeof PlanAccess];

export interface PlanCheck {
  access: PlanAccess;
  planName: string | null;
}

/** Does a plan's `features` (object or list) include mini_store? */
export function planHasMiniStore(features: unknown): boolean {
  if (Array.isArray(features)) return features.some((f) => String(f) === "mini_store" || (typeof f === "object" && f !== null && (f as { key?: string }).key === "mini_store"));
  if (features && typeof features === "object") return (features as Record<string, unknown>).mini_store === true;
  return false;
}

/** The merchant's own plan (POST /merchants/account/plan, as the Inkress dashboard reads it). */
export async function checkPlan(apiBase: string, accessToken: string, fetchImpl: typeof fetch = fetch): Promise<PlanCheck> {
  try {
    const res = await fetchImpl(`${apiBase}/merchants/account/plan`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
    });
    if (!res.ok) return { access: PlanAccess.Unknown, planName: null };
    const j = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const sub = (j?.result ?? j?.data ?? j) as Record<string, unknown> | null;
    const plan = (sub?.billing_plan ?? null) as Record<string, unknown> | null;
    if (!plan) return { access: PlanAccess.Unknown, planName: null };
    const planName = typeof plan.name === "string" ? plan.name : null;
    return { access: planHasMiniStore(plan.features) ? PlanAccess.Allowed : PlanAccess.NeedsInkwell, planName };
  } catch {
    return { access: PlanAccess.Unknown, planName: null };
  }
}

/** Whether the editor shows the upgrade screen instead of publishing. */
export function gateBlocks(mode: GateMode, check: PlanCheck): boolean {
  return mode === GateMode.Enforce && check.access === PlanAccess.NeedsInkwell;
}

export interface PublishInput {
  merchantId: number;
  merchantUsername: string;
  email: string;
  published: boolean;
  ctx: TemplateContext;
}

export interface PublishResult {
  siteUid: string;
  host: string;
  created: boolean;
}

export class PublishError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function fleeksiteHeaders(cfg: PublishConfig): Record<string, string> {
  // X-Request-Host: FleekSite resolves a tenant for every request; the platform host is a safe one.
  return { Authorization: `Bearer ${cfg.secret}`, "Content-Type": "application/json", Accept: "application/json", "X-Request-Host": "fleeksite.com" };
}

/** Render the template set and create/update the merchant's FleekSite site. */
export async function publishToFleekSite(cfg: PublishConfig, input: PublishInput, fetchImpl: typeof fetch = fetch): Promise<PublishResult> {
  const templates: SiteTemplate[] = buildTemplates(input.ctx);
  const res = await fetchImpl(`${cfg.fleeksiteBase}/api/v1/inkwell/sites`, {
    method: "POST",
    headers: fleeksiteHeaders(cfg),
    body: JSON.stringify({
      merchant_id: input.merchantId,
      merchant_username: input.merchantUsername,
      handle: input.ctx.handle,
      name: input.ctx.name,
      email: input.email,
      currency: input.ctx.currency,
      base_domain: cfg.baseDomain,
      api_base: cfg.inkressApiBase,
      checkout_base: cfg.checkoutBase,
      published: input.published,
      templates,
    }),
  });
  const j = (await res.json().catch(() => ({}))) as { state?: string; data?: { item?: Record<string, unknown>; text?: string }; result?: { text?: string } };
  if (!res.ok || j.state !== "ok" || !j.data?.item) {
    const text = j.data?.text || j.result?.text || `FleekSite answered ${res.status}`;
    throw new PublishError(res.status === 409 ? "That web address is taken. Try another." : text, res.status);
  }
  const item = j.data.item;
  return { siteUid: String(item.site_uid), host: String(item.host), created: Boolean(item.created) };
}

/** Is the handle free on FleekSite for this merchant? */
export async function handleIsFree(cfg: PublishConfig, handle: string, merchantId: number, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const q = new URLSearchParams({ base_domain: cfg.baseDomain, merchant_id: String(merchantId), api_base: cfg.inkressApiBase });
  const res = await fetchImpl(`${cfg.fleeksiteBase}/api/v1/inkwell/handles/${encodeURIComponent(handle)}?${q}`, { headers: fleeksiteHeaders(cfg) });
  const j = (await res.json().catch(() => ({}))) as { data?: { item?: { free?: boolean } } };
  return Boolean(j.data?.item?.free);
}

// ── Preview ─────────────────────────────────────────────

/** A catalogue product in the shape the templates read (`v.post`, as FleekSite maps Inkress products). */
export interface PreviewItem {
  id: number;
  title: string;
  price: number;
  quantity: number;
  cover_image: string | null;
  teaser: string | null;
  body: string;
  label: string | null;
  category_name: string | null;
  data: Record<string, unknown>;
}

/** Map an admin-SDK product to the preview item shape (mirrors FleekSite's toVariantRow, the parts templates use). */
export function toPreviewItem(p: Record<string, unknown>): PreviewItem {
  const data = (p.data && typeof p.data === "object" ? p.data : {}) as Record<string, unknown>;
  const regular = Number(p.price) || 0;
  const discounted = Number(data.discounted_price) || 0;
  const image = typeof p.image === "string" ? p.image : null;
  const category = p.category && typeof p.category === "object" ? (p.category as { name?: string }).name ?? null : null;
  return {
    id: Number(p.id),
    title: String(p.title ?? `Item ${p.id}`),
    price: discounted > 0 && discounted < regular ? discounted : regular,
    quantity: p.unlimited ? 999999 : Number(p.units_remaining ?? 0),
    cover_image: image,
    teaser: typeof p.teaser === "string" && p.teaser ? p.teaser : null,
    body: typeof data.description === "string" ? data.description : "",
    label: null,
    category_name: category,
    data,
  };
}

/** `{% collection variants, name, limit: n %}` for the preview: binds the merchant's items. */
function collectionTag(items: PreviewItem[]) {
  return class CollectionTag extends Tag {
    private varName: string;
    constructor(token: TagToken, remain: TopLevelToken[], liquid: Liquid) {
      super(token, remain, liquid);
      const parts = token.args.split(",").map((s) => s.trim());
      this.varName = parts[1] || "items";
    }
    *render(ctx: Context, _emitter: Emitter): Generator<unknown, void, unknown> {
      (ctx.bottom() as Record<string, unknown>)[this.varName] = items.map((post) => ({ post }));
    }
  };
}

/** The index page rendered locally with the merchant's items, CSS/JS inlined (for the editor iframe). */
export async function renderPreview(ctx: TemplateContext, items: PreviewItem[]): Promise<string> {
  const engine = new Liquid({ strictFilters: false, strictVariables: false });
  engine.registerTag("collection", collectionTag(items));
  const html = await engine.parseAndRender(indexPage(ctx), {});
  return html
    // Function replacers: the assets contain `$'` etc., which string replacements would expand.
    .replace(/<link rel="stylesheet" href="\/assets\/mini\.css[^"]*">/, () => `<style>${ASSETS_CSS}</style>`)
    .replace(/<script src="\/assets\/mini\.js[^"]*" defer><\/script>/, () => `<script>${ASSETS_JS.replace(/<\/script/gi, () => "<\\/script")}</script>`)
    .replace("<body>", '<body data-preview="1">');
}

export type { InkwellContent };
