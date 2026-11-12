import { describe, expect, it } from "vitest";
import { checkPlan, gateBlocks, GateMode, handleIsFree, PlanAccess, planHasMiniStore, publishConfig, publishToFleekSite, PublishError } from "./publish.server";
import { sanitizeContent } from "./content";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("publishConfig", () => {
  it("is off without FleekSite settings", () => {
    expect(publishConfig({ INKRESS_API_BASE: "https://api.inkress.com/api/v1" } as NodeJS.ProcessEnv)).toBeNull();
  });

  it("picks dev defaults from a dev Inkress API and enforces on prod", () => {
    const dev = publishConfig({ FLEEKSITE_API_BASE: "https://fs/", INKWELL_PROVISION_SECRET: "s", INKRESS_API_BASE: "https://api-dev.inkress.com/api/v1" } as NodeJS.ProcessEnv)!;
    expect(dev).toMatchObject({ fleeksiteBase: "https://fs", baseDomain: "dev.myinkress.com", checkoutBase: "https://dev.inkress.com", gate: "observe" });
    const prod = publishConfig({ FLEEKSITE_API_BASE: "https://fs", INKWELL_PROVISION_SECRET: "s", INKRESS_API_BASE: "https://api.inkress.com/api/v1" } as NodeJS.ProcessEnv)!;
    expect(prod).toMatchObject({ baseDomain: "myinkress.com", checkoutBase: "https://inkress.com", gate: "enforce" });
  });
});

describe("plan gate", () => {
  it("reads mini_store from object or list features", () => {
    expect(planHasMiniStore({ mini_store: true })).toBe(true);
    expect(planHasMiniStore({ mini_store: false })).toBe(false);
    expect(planHasMiniStore(["payment_links", "mini_store"])).toBe(true);
    expect(planHasMiniStore(null)).toBe(false);
  });

  it("checks the merchant's own plan and never blocks on an unknown answer", async () => {
    const inkwell = await checkPlan("https://api", "t", async () => json({ result: { billing_plan: { name: "Inkwell Plan", features: { mini_store: true } } } }));
    expect(inkwell).toEqual({ access: PlanAccess.Allowed, planName: "Inkwell Plan" });
    const quill = await checkPlan("https://api", "t", async () => json({ result: { billing_plan: { name: "Quill Plan", features: { mini_store: false } } } }));
    expect(gateBlocks(GateMode.Enforce, quill)).toBe(true);
    expect(gateBlocks(GateMode.Observe, quill)).toBe(false);
    const down = await checkPlan("https://api", "t", async () => json({}, 500));
    expect(down.access).toBe(PlanAccess.Unknown);
    expect(gateBlocks(GateMode.Enforce, down)).toBe(false);
  });
});

describe("FleekSite client", () => {
  const cfg = { fleeksiteBase: "https://fs", secret: "sek", baseDomain: "dev.myinkress.com", inkressApiBase: "https://api-dev.inkress.com/api/v1", checkoutBase: "https://dev.inkress.com", gate: GateMode.Observe };
  const ctx = { name: "Blue Mahoe", handle: "bluemahoe", currency: "JMD", version: "v", content: sanitizeContent({}, "Blue Mahoe") };

  it("posts the site, the Inkress link and the templates with the secret", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const r = await publishToFleekSite(cfg, { merchantId: 77, merchantUsername: "bluemahoe", email: "o@e.com", published: true, ctx }, async (url, init) => {
      seen = { url: String(url), init: init! };
      return json({ state: "ok", data: { item: { site_uid: "u1", host: "bluemahoe.dev.myinkress.com", created: true } } }, 201);
    });
    expect(r).toEqual({ siteUid: "u1", host: "bluemahoe.dev.myinkress.com", created: true });
    expect(seen!.url).toBe("https://fs/api/v1/inkwell/sites");
    const h = seen!.init.headers as Record<string, string>;
    expect(h.Authorization).toBe("Bearer sek");
    const body = JSON.parse(String(seen!.init.body));
    expect(body).toMatchObject({ merchant_id: 77, handle: "bluemahoe", base_domain: "dev.myinkress.com", api_base: "https://api-dev.inkress.com/api/v1", published: true });
    expect(body.templates).toHaveLength(4);
  });

  it("explains a taken address and surfaces other failures", async () => {
    await expect(publishToFleekSite(cfg, { merchantId: 1, merchantUsername: "a", email: "a@b.c", published: true, ctx }, async () => json({ state: "error", data: { text: "x is taken" } }, 409))).rejects.toThrow(/taken/);
    await expect(publishToFleekSite(cfg, { merchantId: 1, merchantUsername: "a", email: "a@b.c", published: true, ctx }, async () => json({}, 500))).rejects.toBeInstanceOf(PublishError);
  });

  it("asks FleekSite whether a handle is free", async () => {
    expect(await handleIsFree(cfg, "bluemahoe", 77, async () => json({ state: "ok", data: { item: { free: true } } }))).toBe(true);
    expect(await handleIsFree(cfg, "bluemahoe", 77, async () => json({ state: "ok", data: { item: { free: false } } }))).toBe(false);
  });
});
