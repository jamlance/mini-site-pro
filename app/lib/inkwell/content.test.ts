import { describe, expect, it } from "vitest";
import { cleanUrl, defaultContent, sanitizeContent, whatsappNumber } from "./content";
import { toHandle, HANDLE_RE } from "./handle";

describe("sanitizeContent", () => {
  it("turns junk into valid content with defaults", () => {
    const c = sanitizeContent({ kind: "weapons", fulfilment: ["teleport"], accent: "red", corners: "blob", hero: { layout: "diagonal" } }, "Blue Mahoe");
    expect(c.kind).toBe("products");
    expect(c.fulfilment).toEqual(["pickup"]);
    expect(c.accent).toBe(defaultContent("x").accent);
    expect(c.corners).toBe("square");
    expect(c.hero.layout).toBe("left");
    expect(c.hero.headline).toBe("Blue Mahoe");
  });

  it("keeps valid choices, dedupes fulfilment, caps lengths and lists", () => {
    const c = sanitizeContent(
      {
        kind: "menu",
        fulfilment: ["delivery", "delivery", "in_touch"],
        accent: "#2346d8",
        hero: { headline: "x".repeat(500) },
        hours: Array.from({ length: 20 }, (_, i) => ({ label: `Day ${i}`, value: "9-5" })),
        links: [{ label: "IG", url: "instagram.com/me" }, { label: "Bad", url: "javascript:alert(1)" }],
      },
      "Shop",
    );
    expect(c.kind).toBe("menu");
    expect(c.fulfilment).toEqual(["delivery", "in_touch"]);
    expect(c.accent).toBe("#2346D8");
    expect(c.hero.headline).toHaveLength(90);
    expect(c.hours).toHaveLength(8);
    expect(c.links).toEqual([{ label: "IG", url: "https://instagram.com/me" }]);
  });

  it("falls back to 'we'll be in touch' when every way to get it is switched off", () => {
    expect(sanitizeContent({ fulfilment: [] }, "x").fulfilment).toEqual(["in_touch"]);
  });
});

describe("helpers", () => {
  it("normalises Jamaican WhatsApp numbers", () => {
    expect(whatsappNumber("876 555 0142")).toBe("18765550142");
    expect(whatsappNumber("555-0142")).toBe("18765550142");
    expect(whatsappNumber("+1 (876) 555-0142")).toBe("18765550142");
  });

  it("only accepts http(s) or bare-domain links", () => {
    expect(cleanUrl("https://x.com/a")).toBe("https://x.com/a");
    expect(cleanUrl("x.com")).toBe("https://x.com");
    expect(cleanUrl("javascript:alert(1)")).toBe("");
    expect(cleanUrl("a b.com")).toBe("");
  });

  it("makes DNS-safe handles", () => {
    expect(toHandle("Blue Mahoe Botanicals!")).toBe("blue-mahoe-botanicals");
    expect(toHandle("Café Négril")).toBe("cafe-negril");
    expect(HANDLE_RE.test(toHandle("—Fade Theory—"))).toBe(true);
    expect(toHandle("x".repeat(60))).toHaveLength(40);
  });
});
