// POST /api/inkwell — the Inkwell Mini Site editor's actions (INK-1572):
//   save     store content (+ business name, handle)
//   publish  save, then render the templates and publish to FleekSite
//   offline  take the live site down (kept, not deleted)
//   handle   is a web address free?
import { eq } from "drizzle-orm";
import type { Route } from "./+types/api.inkwell";
import { appKit, merchantAccessToken, requireMerchant } from "~/lib/app-kit.server.mjs";
import { site } from "~/db/schema.server.mjs";
import { ensureSite } from "~/lib/site.server.mjs";
import { contentOf, HANDLE_RE, saveContent, templateContext, toHandle } from "~/lib/inkwell/site.server";
import { checkPlan, gateBlocks, handleIsFree, PlanAccess, publishConfig, publishToFleekSite, PublishError } from "~/lib/inkwell/publish.server";

const EditorIntent = { Save: "save", Publish: "publish", Offline: "offline", Handle: "handle" } as const;
type EditorIntent = (typeof EditorIntent)[keyof typeof EditorIntent];

const fail = (message: string, status = 400, field?: string) => Response.json({ ok: false, message, field }, { status });

export async function action(args: Route.ActionArgs) {
  const { merchantId, merchant } = requireMerchant(args);
  const storage = appKit.storage;
  if (!storage) return fail("Storage is not configured.", 503);
  const m = (merchant || {}) as { username?: string; email?: string; name?: string };
  const b = (await args.request.json().catch(() => ({}))) as { intent?: EditorIntent; content?: unknown; name?: string; handle?: string };
  const s0 = await ensureSite(storage, merchantId, merchant);
  const cfg = publishConfig();

  if (b.intent === EditorIntent.Handle) {
    const handle = toHandle(b.handle);
    if (!HANDLE_RE.test(handle)) return Response.json({ ok: true, handle, free: false, reason: "Use letters, numbers and dashes." });
    if (!cfg) return Response.json({ ok: true, handle, free: true });
    return Response.json({ ok: true, handle, free: await handleIsFree(cfg, handle, merchantId) });
  }

  const name = String(b.name ?? s0.businessName ?? "").trim().slice(0, 80);
  if (!name) return fail("Your business name can't be empty.", 400, "name");
  const handle = b.handle !== undefined ? toHandle(b.handle) : s0.handle || toHandle(name);
  if (!HANDLE_RE.test(handle)) return fail("Use letters, numbers and dashes for the web address.", 400, "handle");

  if (b.intent === EditorIntent.Save || b.intent === EditorIntent.Publish) {
    const taken = await storage.raw.one(`SELECT merchant_id FROM site WHERE handle=$1 AND merchant_id<>$2`, [handle, merchantId]);
    if (taken) return fail("That web address is taken. Try another.", 409, "handle");
    await storage.db.update(site).set({ handle }).where(eq(site.merchantId, merchantId));
    const content = await saveContent(storage, merchantId, name, b.content ?? contentOf(s0));
    if (b.intent === EditorIntent.Save) return Response.json({ ok: true, saved: true });

    if (!cfg) return fail("Publishing isn't set up on this install yet.", 503);
    const plan = await checkPlan(cfg.inkressApiBase, await merchantAccessToken(merchantId));
    if (gateBlocks(cfg.gate, plan)) return Response.json({ ok: false, gate: true, message: "Mini Store is on the Inkwell plan." }, { status: 402 });
    if (plan.access !== PlanAccess.Allowed) console.log(`[inkwell] gate ${cfg.gate}: merchant ${merchantId} plan=${plan.planName ?? "?"} access=${plan.access}`);

    const s = (await storage.db.select().from(site).where(eq(site.merchantId, merchantId)).limit(1))[0];
    try {
      const result = await publishToFleekSite(cfg, {
        merchantId,
        merchantUsername: m.username || String(merchantId),
        email: m.email || s.email || "support@inkress.com",
        published: true,
        ctx: templateContext(s, content),
      });
      await storage.db
        .update(site)
        .set({ published: true, fleeksiteSiteUid: result.siteUid, liveHost: result.host, publishedAt: new Date() })
        .where(eq(site.merchantId, merchantId));
      return Response.json({ ok: true, published: true, host: result.host, url: `https://${result.host}` });
    } catch (e) {
      const status = e instanceof PublishError ? e.status : 502;
      return fail(e instanceof Error ? e.message : "Publishing failed. Try again.", status === 409 ? 409 : 502, status === 409 ? "handle" : undefined);
    }
  }

  if (b.intent === EditorIntent.Offline) {
    if (!cfg || !s0.liveHost) return Response.json({ ok: true, published: false });
    try {
      await publishToFleekSite(cfg, {
        merchantId,
        merchantUsername: m.username || String(merchantId),
        email: m.email || s0.email || "support@inkress.com",
        published: false,
        ctx: templateContext(s0, contentOf(s0)),
      });
    } catch (e) {
      return fail(e instanceof Error ? e.message : "Couldn't take the site offline.", 502);
    }
    await storage.db.update(site).set({ published: false }).where(eq(site.merchantId, merchantId));
    return Response.json({ ok: true, published: false });
  }

  return fail("Unknown action.");
}
