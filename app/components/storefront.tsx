import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { THEMES, DEFAULT_THEME, arr, money } from "~/lib/blocks.mjs";

export type StoreProduct = {
  id: number;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  image_url?: string | null;
};
export type StoreSite = {
  handle: string;
  business_name?: string | null;
  tagline?: string | null;
  accent?: string | null;
  theme?: string | null;
  logo?: string | null;
  hero_image?: string | null;
  cta_label?: string | null;
  show_social_proof?: boolean;
  currency?: string | null;
  sections: { id: string; type: string; data: any }[];
};

export type Block = { id: string; type: string; data: any };

/** Inline-edit context passed down when a block is rendered on the editable
 *  canvas. `onText(field, value)` writes back into the block's data. */
export type EditCtx = { onText: (field: string, value: string) => void };

const initials = (s?: string | null) =>
  String(s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

/** Inline-editable text node (contentEditable). Uncontrolled to keep the caret
 *  stable; commits on input. Only used on the editable canvas. */
function EditableText({
  value, onChange, tag = "span", className, placeholder, multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  tag?: "span" | "div" | "h1" | "h2" | "h3" | "p";
  className?: string;
  placeholder?: string;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el && el.textContent !== (value || "")) el.textContent = value || "";
  }, [value]);
  const Tag = tag as any;
  return (
    <Tag
      ref={ref}
      className={`mk-edit ${className || ""}`}
      contentEditable
      suppressContentEditableWarning
      data-ph={placeholder}
      onPointerDown={(e: any) => e.stopPropagation()}
      onClick={(e: any) => e.stopPropagation()}
      onInput={(e: any) => onChange(e.currentTarget.textContent || "")}
      onKeyDown={(e: any) => {
        if (!multiline && e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); }
      }}
    />
  );
}

/** Renders ONE block's content. Identical output for the public storefront and
 *  the editable canvas — when `edit` is supplied, text fields become inline
 *  editable so what you edit is exactly what ships. */
export function BlockView({
  block, site, products, accent, theme, paidCount = 0, preview = false, edit, onOrder, index = 0,
}: {
  block: Block;
  site: StoreSite;
  products: StoreProduct[];
  accent: string;
  theme: any;
  paidCount?: number;
  preview?: boolean;
  edit?: EditCtx;
  onOrder?: (p: StoreProduct) => void;
  index?: number;
}): ReactNode {
  const d = block.data || {};
  const T = (field: string, value: string, opts: { tag?: any; className?: string; ph?: string; multiline?: boolean } = {}) =>
    edit ? (
      <EditableText value={value} onChange={(v) => edit.onText(field, v)} tag={opts.tag || "span"} className={opts.className} placeholder={opts.ph} multiline={opts.multiline} />
    ) : (
      value
    );

  switch (block.type) {
    case "hero": {
      const img = d.image || site.hero_image;
      const title = d.title || site.business_name || "Shop";
      const sub = d.subtitle || site.tagline || "";
      const href = d.cta_target === "contact" ? "#contact" : "#products";
      const align = theme.align === "center" ? "center" : "left";
      return (
        <header className={`mk-store-hero is-${align} ${img ? "has-img" : "no-img"}`}>
          {img && <div className="mk-store-hero-img" style={{ backgroundImage: `url('${img}')` }} aria-hidden />}
          <div className="mk-store-hero-inner">
            <div className="mk-store-brandrow">
              {site.logo ? <img className="mk-store-logo" src={site.logo} alt="" /> : <span className="mk-store-logo ph" aria-hidden>{initials(title)}</span>}
              {site.show_social_proof !== false && paidCount > 0 && <span className="mk-store-proof">{paidCount} order{paidCount === 1 ? "" : "s"} fulfilled</span>}
            </div>
            <h1 className="mk-store-title">{edit ? <EditableText value={d.title || ""} onChange={(v) => edit.onText("title", v)} tag="span" placeholder={site.business_name || "Your business name"} /> : title}</h1>
            {(edit || sub) && <p className="mk-store-sub">{edit ? <EditableText value={d.subtitle || ""} onChange={(v) => edit.onText("subtitle", v)} tag="span" placeholder={site.tagline || "A short tagline"} /> : sub}</p>}
            {products.length > 0 && (
              <div className="mk-store-herocta">
                <a className="mk-store-cta" href={preview ? undefined : href}>{d.cta_label || site.cta_label || "Shop now"}</a>
                <a className="mk-store-cta2" href={preview ? undefined : "#contact"}>Contact</a>
              </div>
            )}
          </div>
        </header>
      );
    }
    case "products":
      return (
        <section className="mk-store-band" id="products">
          <div className="mk-store-wrap">
            <div className="mk-store-head">
              <h2 className="mk-store-h2">{T("heading", d.heading || "Shop", { ph: "Shop" })}</h2>
              {products.length > 0 && <span className="mk-store-count">{products.length} item{products.length === 1 ? "" : "s"}</span>}
            </div>
            {products.length === 0 ? (
              <div className="mk-store-emptyblock">Products you add show up here.</div>
            ) : (
              <div className="mk-store-grid">
                {products.map((p) => (
                  <article key={p.id} className="mk-store-card">
                    {p.image_url ? <div className="mk-store-thumb" style={{ backgroundImage: `url('${p.image_url}')` }} /> : <div className="mk-store-thumb ph">{initials(p.name)}</div>}
                    <div className="mk-store-cbody">
                      <h3 className="mk-store-pname">{p.name}</h3>
                      {p.description && <p className="mk-store-pdesc">{p.description}</p>}
                      <div className="mk-store-prow">
                        <span className="mk-store-price tnum">{money(p.price, p.currency)}</span>
                        <button className="mk-store-buy" type="button" disabled={preview} onClick={() => !preview && onOrder?.(p)}>Order</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    case "text":
      return (
        <section className={`mk-store-band ${index % 2 ? "alt" : ""}`}>
          <div className="mk-store-wrap mk-store-prose">
            <h2 className="mk-store-h2">{T("heading", d.heading || "", { ph: "Heading" })}</h2>
            <div className="mk-store-about">{T("body", d.body || "", { tag: "div", ph: "Write something about your business…", multiline: true })}</div>
          </div>
        </section>
      );
    case "gallery": {
      const imgs = arr(d.images);
      return (
        <section className="mk-store-band">
          <div className="mk-store-wrap">
            <h2 className="mk-store-h2">{T("heading", d.heading || "", { ph: "Gallery" })}</h2>
            {imgs.length === 0 ? (
              <div className="mk-store-emptyblock">Add photos from the block toolbar.</div>
            ) : (
              <div className="mk-store-gal">
                {imgs.map((u: string, i: number) => <div key={i} className="mk-store-gphoto" style={{ backgroundImage: `url('${u}')` }} />)}
              </div>
            )}
          </div>
        </section>
      );
    }
    case "links": {
      const links = arr(d.links);
      return (
        <section className={`mk-store-band ${index % 2 ? "alt" : ""}`}>
          <div className="mk-store-wrap">
            <h2 className="mk-store-h2">{T("heading", d.heading || "", { ph: "Find us online" })}</h2>
            {links.length === 0 ? (
              <div className="mk-store-emptyblock">Add links from the block toolbar.</div>
            ) : (
              <div className="mk-store-links">
                {links.map((l: any, i: number) => <a key={i} className="mk-store-chip" href={preview ? undefined : l.url} target="_blank" rel="noopener">{l.label}<span aria-hidden>↗</span></a>)}
              </div>
            )}
          </div>
        </section>
      );
    }
    case "contact":
      return (
        <section className={`mk-store-band ${index % 2 ? "alt" : ""}`} id="contact">
          <div className="mk-store-wrap mk-store-contactwrap">
            <h2 className="mk-store-h2">{T("heading", d.heading || "", { ph: "Visit or call" })}</h2>
            <div className="mk-store-contact">
              {(edit || d.phone) && <div className="mk-store-crow"><span className="mk-store-cico" aria-hidden>✆</span><span>{T("phone", d.phone || "", { ph: "Phone number" })}</span></div>}
              {(edit || d.email) && <div className="mk-store-crow"><span className="mk-store-cico" aria-hidden>✉</span><span>{T("email", d.email || "", { ph: "Email address" })}</span></div>}
              {(edit || d.address) && <div className="mk-store-crow"><span className="mk-store-cico" aria-hidden>◎</span><span>{T("address", d.address || "", { ph: "Street address" })}</span></div>}
            </div>
          </div>
        </section>
      );
    case "hours": {
      const rows = arr(d.rows);
      return (
        <section className={`mk-store-band ${index % 2 ? "alt" : ""}`}>
          <div className="mk-store-wrap mk-store-hourswrap">
            <h2 className="mk-store-h2">{T("heading", d.heading || "", { ph: "Opening hours" })}</h2>
            {rows.length === 0 ? (
              <div className="mk-store-emptyblock">Add opening hours from the block toolbar.</div>
            ) : (
              <dl className="mk-store-hours">
                {rows.map((r: any, i: number) => <div key={i} className="mk-store-hrow"><dt>{r.label}</dt><dd className="tnum">{r.value}</dd></div>)}
              </dl>
            )}
          </div>
        </section>
      );
    }
    case "testimonials": {
      const items = arr(d.items);
      return (
        <section className="mk-store-band">
          <div className="mk-store-wrap">
            <h2 className="mk-store-h2">{T("heading", d.heading || "", { ph: "What people say" })}</h2>
            {items.length === 0 ? (
              <div className="mk-store-emptyblock">Add customer quotes from the block toolbar.</div>
            ) : (
              <div className="mk-store-tg">
                {items.map((it: any, i: number) => (
                  <figure key={i} className="mk-store-tcard">
                    <span className="mk-store-quote" aria-hidden>&ldquo;</span>
                    <blockquote>{it.quote}</blockquote>
                    {it.author && <figcaption>{it.author}</figcaption>}
                  </figure>
                ))}
              </div>
            )}
          </div>
        </section>
      );
    }
    default:
      return null;
  }
}

export function rootAccentStyle(accent: string): CSSProperties {
  return {
    ["--accent" as any]: accent,
    ["--accent-tint" as any]: `color-mix(in oklch, ${accent} 14%, var(--mk-surface))`,
    ["--accent-wash" as any]: `color-mix(in oklch, ${accent} 7%, var(--mk-bg))`,
    ["--accent-line" as any]: `color-mix(in oklch, ${accent} 26%, var(--mk-border))`,
  };
}

export function themeFor(site: StoreSite) {
  const theme = (THEMES as Record<string, any>)[site.theme || DEFAULT_THEME] || (THEMES as any)[DEFAULT_THEME];
  return { theme, accent: site.accent || theme.accent };
}

/** The public storefront (SSR) + the passive preview. */
export function Storefront({
  site, products, paidCount = 0, preview = false,
}: {
  site: StoreSite;
  products: StoreProduct[];
  paidCount?: number;
  preview?: boolean;
}) {
  const [order, setOrder] = useState<StoreProduct | null>(null);
  const { theme, accent } = themeFor(site);
  const sections = arr(site.sections);

  return (
    <div className="mk-store" style={rootAccentStyle(accent)}>
      {sections.map((b, i) => (
        <div key={b.id}>
          <BlockView block={b} site={site} products={products} accent={accent} theme={theme} paidCount={paidCount} preview={preview} onOrder={setOrder} index={i} />
        </div>
      ))}
      <footer className="mk-store-foot">
        <span>{site.business_name}</span>
        <span className="mk-store-foot-by">Powered by Inkress</span>
      </footer>
      {order && !preview && <CheckoutModal site={site} product={order} onClose={() => setOrder(null)} />}
    </div>
  );
}

function CheckoutModal({ site, product, onClose }: { site: StoreSite; product: StoreProduct; onClose: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function go() {
    if (busy) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr("Enter a valid email.");
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ handle: site.handle, product_id: product.id, name, email }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.payment_url) { window.top ? (window.top.location.href = j.payment_url) : (window.location.href = j.payment_url); return; }
      setErr(j.message || "We couldn’t start checkout. Please try again.");
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mk-store-modal" onClick={() => !busy && onClose()}>
      <div className="mk-store-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Order ${product.name}`}>
        <button className="mk-store-x" onClick={() => !busy && onClose()} aria-label="Close">×</button>
        <div className="mk-store-sheet-lead">
          <span className="mk-store-sheet-k">You’re ordering</span>
          <h3 className="mk-store-sheet-name">{product.name}</h3>
          <div className="mk-store-mprice tnum">{money(product.price, product.currency)}</div>
        </div>
        <label htmlFor="cn">Your name</label>
        <input id="cn" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <label htmlFor="ce">Email for the receipt</label>
        <input id="ce" type="email" placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="merr" />
        {err && <div id="merr" className="mk-store-err" role="alert">{err}</div>}
        <button className="mk-store-go" disabled={busy} onClick={go}>{busy ? "Creating your order…" : "Continue to payment"}</button>
        <p className="mk-store-secure">Secure checkout by Inkress</p>
      </div>
    </div>
  );
}
