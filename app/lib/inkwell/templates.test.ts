import { describe, expect, it } from "vitest";
import { buildTemplates, currencyPrefix, esc, indexPage, scriptJson, type TemplateContext } from "./templates.server";
import { sanitizeContent } from "./content";
import { renderPreview, toPreviewItem } from "./publish.server";

const ctx = (over: Record<string, unknown> = {}): TemplateContext => ({
  name: "Blue Mahoe",
  handle: "bluemahoe",
  currency: "JMD",
  version: "v1",
  content: sanitizeContent(
    {
      kind: "products",
      fulfilment: ["delivery", "pickup"],
      pickupAddress: "Hope Road",
      hero: { eyebrow: "Skincare · Kingston", headline: "Made from what grows in the yard.", line: "Butters and soaps." },
      about: { lead: "Started with grandma's cerasee." },
      testimonial: { quote: "My skin calmed down.", author: "Shanice, Portmore" },
      hours: [{ label: "Mon to Fri", value: "9:00 – 5:00" }],
      contact: { whatsapp: "8765550142", email: "hi@example.com", address: "Hope Road, Kingston" },
      ...over,
    },
    "Blue Mahoe",
  ),
});

describe("escaping", () => {
  it("neutralises HTML and Liquid in merchant text", () => {
    expect(esc(`<script>{{ site.secret }}{% raw %}"'&`)).toBe("&lt;script&gt;&#123;&#123; site.secret &#125;&#125;&#123;% raw %&#125;&quot;&#39;&amp;");
    const raw = { a: "</script>{{x}} {% y %}", b: { c: [1, { d: "}}" }] } };
    expect(scriptJson(raw)).not.toMatch(/<\/script|\{\{|\{%/);
    expect(JSON.parse(scriptJson(raw))).toEqual(raw);
  });

  it("keeps a merchant's Liquid-looking text inert in the page", () => {
    const page = indexPage(ctx({ hero: { headline: "{{ site.data }} {% render 'x' %}" } }));
    expect(page).not.toContain("{{ site.data }}");
    expect(page).not.toContain("{% render");
  });
});

describe("buildTemplates", () => {
  it("builds index, thanks, css and js with the FleekSite permalinks", () => {
    const t = buildTemplates(ctx());
    expect(t.map((x) => [x.permalink, x.kind])).toEqual([
      ["/index", "page"],
      ["/thanks", "page"],
      ["/assets/mini.css", "css"],
      ["/assets/mini.js", "js"],
    ]);
  });

  it("lists items live from the Inkress catalogue, never baked in", () => {
    const page = indexPage(ctx());
    expect(page).toContain("{% collection variants, items, limit: 100 %}");
    expect(page).toContain("data-add");
  });

  it("drops empty sections and names things by list kind", () => {
    const bare = indexPage(ctx({ about: {}, testimonial: {}, hours: [], contact: {} }));
    expect(bare).not.toContain('class="band"');
    expect(bare).not.toContain('id="contact"');
    const menu = indexPage(ctx({ kind: "menu" }));
    expect(menu).toContain(">See the menu<");
    expect(menu).toContain(">Menu<");
  });

  it("uses currency prefixes", () => {
    expect(currencyPrefix("jmd")).toBe("J$");
    expect(currencyPrefix("USD")).toBe("US$");
    expect(currencyPrefix("TTD")).toBe("TTD ");
  });
});

describe("checkout form", () => {
  it("asks for first and last name and sends them with every order, address or not", async () => {
    const page = indexPage(ctx());
    expect(page).toContain('name="first"');
    expect(page).toContain('name="last"');
    const { ASSETS_JS } = await import("./assets/js");
    expect(ASSETS_JS).toContain("first_name: f.first.value.trim()");
    expect(ASSETS_JS).toContain("name: fullName,");
    expect(ASSETS_JS).toContain("body.pickupLocation = cfg.pickupAddress");
  });
});

describe("renderPreview", () => {
  it("renders the real template with items, money formatting and inlined assets", async () => {
    const items = [
      toPreviewItem({ id: 7, title: "Sorrel & Shea Body Butter", price: 2400, unlimited: true, teaser: "200 g jar", category: { name: "Body" } }),
      toPreviewItem({ id: 8, title: "Cerasee Soap", price: 1234.5, units_remaining: 0, category: { name: "Face" } }),
    ];
    const html = await renderPreview(ctx(), items);
    expect(html).toContain("Sorrel &amp; Shea Body Butter");
    expect(html).toContain("J$2,400");
    expect(html).toContain("J$1,234.50");
    expect(html).toContain("Sold out");
    expect(html).toContain('data-cat="Body"');
    expect(html).toContain("2 items");
    expect(html).not.toContain("/assets/mini.css");
    expect(html).toContain('data-preview="1"');
    expect(html).toContain("cfg.currencyPrefix || '$'");
  });
});
