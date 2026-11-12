// Inkwell Mini Site content (INK-1572): what the merchant edits in the
// dashboard. Stored as one jsonb column (`site.inkwell`); everything the
// customer sees is rendered from this plus the live Inkress catalogue.

export const ListKind = { Products: "products", Services: "services", Menu: "menu" } as const;
export type ListKind = (typeof ListKind)[keyof typeof ListKind];

export const Fulfilment = { Delivery: "delivery", Pickup: "pickup", InTouch: "in_touch" } as const;
export type Fulfilment = (typeof Fulfilment)[keyof typeof Fulfilment];

export const HeroLayout = { Left: "left", Centred: "centred" } as const;
export type HeroLayout = (typeof HeroLayout)[keyof typeof HeroLayout];

export const Corners = { Square: "square", Rounded: "rounded" } as const;
export type Corners = (typeof Corners)[keyof typeof Corners];

export interface LabelValue {
  label: string;
  value: string;
}

export interface LinkItem {
  label: string;
  url: string;
}

export interface InkwellContent {
  kind: ListKind;
  fulfilment: Fulfilment[];
  pickupAddress: string;
  hero: { eyebrow: string; headline: string; line: string; layout: HeroLayout };
  accent: string;
  corners: Corners;
  about: { lead: string; body: string };
  testimonial: { quote: string; author: string };
  hours: LabelValue[];
  contact: { whatsapp: string; email: string; address: string };
  links: LinkItem[];
}

/** The merchant colours on offer (name → hex). Any other #rrggbb is accepted too. */
export const ACCENTS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: "Verdigris", hex: "#0E5C50" },
  { name: "Cobalt", hex: "#2346D8" },
  { name: "Hibiscus", hex: "#B4234B" },
  { name: "Ink", hex: "#13123A" },
  { name: "Logwood", hex: "#5B2A86" },
];

/** Per list kind: the list heading, the hero button and the item button. */
export const KIND_WORDS: Record<ListKind, { heading: string; cta: string; add: string; noun: string }> = {
  products: { heading: "Shop", cta: "Shop", add: "Add", noun: "item" },
  services: { heading: "Services", cta: "Book", add: "Book", noun: "service" },
  menu: { heading: "Menu", cta: "See the menu", add: "Add", noun: "dish" },
};

export function defaultContent(name: string): InkwellContent {
  return {
    kind: ListKind.Products,
    fulfilment: [Fulfilment.Delivery, Fulfilment.Pickup],
    pickupAddress: "",
    hero: { eyebrow: "", headline: `${name}`, line: "", layout: HeroLayout.Left },
    accent: ACCENTS[0]!.hex,
    corners: Corners.Square,
    about: { lead: "", body: "" },
    testimonial: { quote: "", author: "" },
    hours: [],
    contact: { whatsapp: "", email: "", address: "" },
    links: [],
  };
}

const str = (v: unknown, max: number): string => String(v ?? "").trim().slice(0, max);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  (allowed as readonly string[]).includes(String(v)) ? (v as T) : fallback;
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});

export function cleanUrl(u: unknown): string {
  const s = String(u ?? "").trim();
  if (!s || /\s/.test(s)) return "";
  if (/^https?:\/\//i.test(s)) return s.slice(0, 400);
  if (/^[a-z0-9]([a-z0-9-]*\.)+[a-z]{2,}(\/.*)?$/i.test(s)) return `https://${s}`.slice(0, 400);
  return "";
}

/** Digits only, with Jamaica's 1 when a 7- or 10-digit local number is given. */
export function whatsappNumber(v: unknown): string {
  const d = String(v ?? "").replace(/\D/g, "");
  if (d.length === 7) return `1876${d}`;
  if (d.length === 10) return `1${d}`;
  return d.slice(0, 15);
}

/** The one authoritative sanitizer: anything posted becomes a valid InkwellContent. */
export function sanitizeContent(input: unknown, name: string): InkwellContent {
  const d = defaultContent(name);
  const b = rec(input);
  const hero = rec(b.hero);
  const about = rec(b.about);
  const t = rec(b.testimonial);
  const contact = rec(b.contact);
  const fulfilment = list(b.fulfilment)
    .map((f) => oneOf(f, Object.values(Fulfilment), Fulfilment.Pickup))
    .filter((f, i, all) => all.indexOf(f) === i);
  return {
    kind: oneOf(b.kind, Object.values(ListKind), d.kind),
    fulfilment: fulfilment.length ? fulfilment : [Fulfilment.InTouch],
    pickupAddress: str(b.pickupAddress, 160),
    hero: {
      eyebrow: str(hero.eyebrow, 80),
      headline: str(hero.headline, 90) || d.hero.headline,
      line: str(hero.line, 200),
      layout: oneOf(hero.layout, Object.values(HeroLayout), d.hero.layout),
    },
    accent: /^#[0-9a-fA-F]{6}$/.test(String(b.accent)) ? String(b.accent).toUpperCase() : d.accent,
    corners: oneOf(b.corners, Object.values(Corners), d.corners),
    about: { lead: str(about.lead, 140), body: str(about.body, 900) },
    testimonial: { quote: str(t.quote, 280), author: str(t.author, 80) },
    hours: list(b.hours)
      .map((r) => ({ label: str(rec(r).label, 40), value: str(rec(r).value, 40) }))
      .filter((r) => r.label)
      .slice(0, 8),
    contact: { whatsapp: whatsappNumber(contact.whatsapp), email: str(contact.email, 120), address: str(contact.address, 160) },
    links: list(b.links)
      .map((l) => ({ label: str(rec(l).label, 30), url: cleanUrl(rec(l).url) }))
      .filter((l) => l.label && l.url)
      .slice(0, 6),
  };
}
