// The Inkwell Mini Site editor (INK-1572), inside the Inkress merchant
// dashboard. Left: the page's sections. Middle: a live preview rendered from
// the real template with the merchant's Inkress items. Right: setup and look.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Route } from "./+types/_app._index";
import { appKit, merchantAccessToken, requireMerchant } from "~/lib/app-kit.server.mjs";
import { ensureSite } from "~/lib/site.server.mjs";
import { contentOf } from "~/lib/inkwell/site.server";
import { toHandle } from "~/lib/inkwell/handle";
import { checkPlan, gateBlocks, PlanAccess, publishConfig } from "~/lib/inkwell/publish.server";
import {
  ACCENTS,
  Corners,
  Fulfilment,
  HeroLayout,
  KIND_WORDS,
  ListKind,
  type InkwellContent,
  type LabelValue,
  type LinkItem,
} from "~/lib/inkwell/content";

export async function loader(args: Route.LoaderArgs) {
  const { merchantId, merchant } = requireMerchant(args);
  const s = await ensureSite(appKit.storage, merchantId, merchant);
  const cfg = publishConfig();
  let gated = false;
  let planName: string | null = null;
  if (cfg) {
    try {
      const plan = await checkPlan(cfg.inkressApiBase, await merchantAccessToken(merchantId));
      gated = gateBlocks(cfg.gate, plan);
      planName = plan.access === PlanAccess.Unknown ? null : plan.planName;
    } catch {
      /* plan unknown: never block on our own failure */
    }
  }
  return {
    name: (s.businessName as string) || "My shop",
    handle: (s.handle as string) || toHandle(s.businessName),
    content: contentOf(s),
    published: Boolean(s.published && s.liveHost),
    liveHost: (s.liveHost as string | null) ?? null,
    baseDomain: cfg?.baseDomain ?? "myinkress.com",
    canPublish: Boolean(cfg),
    gated,
    planName,
  };
}

type SaveState = "idle" | "saving" | "saved" | "error";
const PreviewSize = { Phone: "phone", Desktop: "desktop" } as const;
type PreviewSize = (typeof PreviewSize)[keyof typeof PreviewSize];

async function post<T>(url: string, body: unknown): Promise<{ status: number; json: T }> {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  return { status: r.status, json: (await r.json().catch(() => ({}))) as T };
}

function Cells<T extends string>(props: { value: T; options: ReadonlyArray<{ value: T; label: string; hint?: string }>; onChange: (v: T) => void; label: string; cols?: number }) {
  return (
    <div className="ik-cells" role="radiogroup" aria-label={props.label} style={{ gridTemplateColumns: `repeat(${props.cols ?? props.options.length}, minmax(0, 1fr))` }}>
      {props.options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={props.value === o.value} className={`ik-cell${props.value === o.value ? " on" : ""}`} onClick={() => props.onChange(o.value)}>
          {o.label}
          {o.hint ? <small>{o.hint}</small> : null}
        </button>
      ))}
    </div>
  );
}

function Rows<T extends LabelValue | LinkItem>(props: { rows: T[]; onChange: (rows: T[]) => void; empty: () => T; keys: [keyof T & string, keyof T & string]; placeholders: [string, string]; max: number; addLabel: string }) {
  const [a, b] = props.keys;
  return (
    <div className="ik-rows">
      {props.rows.map((r, i) => (
        <div className="ik-row" key={i}>
          <input aria-label={props.placeholders[0]} placeholder={props.placeholders[0]} value={String(r[a] ?? "")} onChange={(e) => props.onChange(props.rows.map((x, j) => (j === i ? { ...x, [a]: e.target.value } : x)))} />
          <input aria-label={props.placeholders[1]} placeholder={props.placeholders[1]} value={String(r[b] ?? "")} onChange={(e) => props.onChange(props.rows.map((x, j) => (j === i ? { ...x, [b]: e.target.value } : x)))} />
          <button type="button" className="ik-x" aria-label="Remove" onClick={() => props.onChange(props.rows.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {props.rows.length < props.max ? (
        <button type="button" className="ik-link" onClick={() => props.onChange([...props.rows, props.empty()])}>{props.addLabel}</button>
      ) : null}
    </div>
  );
}

function Gate({ planName }: { planName: string | null }) {
  return (
    <main className="ik-gate">
      <div className="ik-gate-in">
        <p className="ik-eyebrow">Mini Store · Inkwell plan</p>
        <h1>Your own shop page at yourname.myinkress.com</h1>
        <p className="ik-muted">Items, hours and WhatsApp on one page. Customers pay by card or bank transfer through Inkress.</p>
        <div className="ik-plans" role="table" aria-label="Plans">
          <div className="c" />
          <div className="pl"><b>{planName || "Your plan"}</b><span>Current</span></div>
          <div className="pl on"><b>Inkwell</b><span>J$1,500 / month</span></div>
          <div className="c k">Mini Store page</div><div className="c">No</div><div className="c y">Yes</div>
          <div className="c k">Inkress fee per sale</div><div className="c">3% + J$40 on Quill</div><div className="c y">1.5% + J$40</div>
          <div className="c k">Most per payout</div><div className="c">J$50,000 on Quill</div><div className="c y">J$150,000</div>
        </div>
        <p className="ik-muted">Move to Inkwell in Settings › Billing. Nothing changes until you move.</p>
      </div>
    </main>
  );
}

export default function Editor({ loaderData }: Route.ComponentProps) {
  if (loaderData.gated) return <Gate planName={loaderData.planName} />;
  return <EditorBody data={loaderData} />;
}

function EditorBody({ data }: { data: Route.ComponentProps["loaderData"] }) {
  const [name, setName] = useState(data.name);
  const [handle, setHandle] = useState(data.handle);
  const [c, setC] = useState<InkwellContent>(data.content);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [handleNote, setHandleNote] = useState<string>("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(data.published);
  const [liveHost, setLiveHost] = useState(data.liveHost);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [size, setSize] = useState<PreviewSize>(PreviewSize.Phone);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const first = useRef(true);
  const words = KIND_WORDS[c.kind];

  const set = useCallback(<K extends keyof InkwellContent>(k: K, v: InkwellContent[K]) => setC((x) => ({ ...x, [k]: v })), []);

  // Debounced autosave + preview refresh on every change.
  useEffect(() => {
    const t = setTimeout(async () => {
      const prev = await fetch("/inkwell/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: c, name, handle }) }).then((r) => r.text()).catch(() => "");
      if (prev) setPreviewHtml(prev);
      if (first.current) { first.current = false; return; }
      setSaveState("saving");
      const r = await post<{ ok: boolean; message?: string; field?: string }>("/api/inkwell", { intent: "save", content: c, name, handle });
      setSaveState(r.json.ok ? "saved" : "error");
      if (!r.json.ok && r.json.message) setMessage({ kind: "err", text: r.json.message });
    }, 700);
    return () => clearTimeout(t);
  }, [c, name, handle]);

  // Web address availability.
  useEffect(() => {
    const t = setTimeout(async () => {
      const r = await post<{ ok: boolean; handle: string; free: boolean; reason?: string }>("/api/inkwell", { intent: "handle", handle });
      setHandleNote(r.json.free ? "" : r.json.reason || "That address is taken.");
    }, 500);
    return () => clearTimeout(t);
  }, [handle]);

  async function publish() {
    setPublishing(true);
    setMessage(null);
    const r = await post<{ ok: boolean; host?: string; url?: string; message?: string; gate?: boolean }>("/api/inkwell", { intent: "publish", content: c, name, handle });
    setPublishing(false);
    if (r.json.ok && r.json.host) {
      setPublished(true);
      setLiveHost(r.json.host);
      setMessage({ kind: "ok", text: `Published. Live at ${r.json.host}` });
    } else {
      setMessage({ kind: "err", text: r.json.message || "Publishing failed. Try again." });
    }
  }

  async function takeOffline() {
    const r = await post<{ ok: boolean; message?: string }>("/api/inkwell", { intent: "offline" });
    if (r.json.ok) { setPublished(false); setMessage({ kind: "ok", text: "Your site is offline. Publish to bring it back." }); }
    else setMessage({ kind: "err", text: r.json.message || "Couldn't take the site offline." });
  }

  const liveUrl = liveHost ? `https://${liveHost}` : null;
  const fulfil = (f: Fulfilment) => c.fulfilment.includes(f);
  const toggleFulfil = (f: Fulfilment) => set("fulfilment", fulfil(f) ? c.fulfilment.filter((x) => x !== f) : [...c.fulfilment, f]);
  const shareText = useMemo(() => (liveUrl ? encodeURIComponent(`${name}: ${liveUrl}`) : ""), [liveUrl, name]);

  return (
    <div className="ik-ed">
      <header className="ik-top">
        <span className="ik-title">Mini Store</span>
        <span className="ik-plan">Inkwell</span>
        <span className="ik-grow" />
        <span className="ik-status" aria-live="polite">{saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Not saved" : ""}</span>
        {published && liveUrl ? (
          <span className="ik-live"><span className="dot" />Live at <a href={liveUrl} target="_blank" rel="noopener">{liveHost}</a></span>
        ) : (
          <span className="ik-live off">Not published yet</span>
        )}
        {published && liveUrl ? <a className="ik-btn ghost" href={`https://wa.me/?text=${shareText}`} target="_blank" rel="noopener">Share</a> : null}
        <button type="button" className="ik-btn solid" onClick={publish} disabled={publishing || !data.canPublish || Boolean(handleNote)}>{publishing ? "Publishing…" : published ? "Publish changes" : "Publish"}</button>
      </header>
      {message ? <p className={`ik-msg ${message.kind}`} role="status">{message.text}</p> : null}
      {!data.canPublish ? <p className="ik-msg err">Publishing isn't set up on this install yet. You can still edit and preview.</p> : null}

      <div className="ik-body">
        <aside className="ik-side">
          <section>
            <h2>Business</h2>
            <label className="ik-field">Business name<input value={name} maxLength={80} onChange={(e) => setName(e.target.value)} /></label>
          </section>

          <details open>
            <summary>Hero</summary>
            <label className="ik-field"><span className="ik-lbl">Small line above <em>Optional</em></span><input value={c.hero.eyebrow} maxLength={80} placeholder="What you do · Town · Since 2019" onChange={(e) => set("hero", { ...c.hero, eyebrow: e.target.value })} /></label>
            <label className="ik-field">Headline<input value={c.hero.headline} maxLength={90} onChange={(e) => set("hero", { ...c.hero, headline: e.target.value })} /></label>
            <label className="ik-field"><span className="ik-lbl">Short line <em>Optional</em></span><textarea rows={2} value={c.hero.line} maxLength={200} onChange={(e) => set("hero", { ...c.hero, line: e.target.value })} /></label>
          </details>

          <details>
            <summary>{words.heading}</summary>
            <p className="ik-help">Your items come from Products in your Inkress dashboard. Prices, photos and stock update on their own.</p>
          </details>

          <details>
            <summary>About + testimonial</summary>
            <label className="ik-field"><span className="ik-lbl">Lead line <em>Optional</em></span><input value={c.about.lead} maxLength={140} onChange={(e) => set("about", { ...c.about, lead: e.target.value })} /></label>
            <label className="ik-field"><span className="ik-lbl">A few sentences <em>Optional</em></span><textarea rows={4} value={c.about.body} maxLength={900} onChange={(e) => set("about", { ...c.about, body: e.target.value })} /></label>
            <label className="ik-field"><span className="ik-lbl">Customer quote <em>Optional</em></span><textarea rows={2} value={c.testimonial.quote} maxLength={280} onChange={(e) => set("testimonial", { ...c.testimonial, quote: e.target.value })} /></label>
            <label className="ik-field">Who said it<input value={c.testimonial.author} maxLength={80} placeholder="Name, town" onChange={(e) => set("testimonial", { ...c.testimonial, author: e.target.value })} /></label>
            <p className="ik-help">Empty here hides the dark band.</p>
          </details>

          <details>
            <summary>Hours + contact</summary>
            <label className="ik-field">WhatsApp number<input value={c.contact.whatsapp} inputMode="tel" placeholder="876 000 0000" onChange={(e) => set("contact", { ...c.contact, whatsapp: e.target.value })} /></label>
            <label className="ik-field">Email<input value={c.contact.email} type="email" onChange={(e) => set("contact", { ...c.contact, email: e.target.value })} /></label>
            <label className="ik-field">Address<input value={c.contact.address} maxLength={160} onChange={(e) => set("contact", { ...c.contact, address: e.target.value })} /></label>
            <p className="ik-sub">Hours</p>
            <Rows rows={c.hours} onChange={(rows) => set("hours", rows)} empty={() => ({ label: "", value: "" })} keys={["label", "value"]} placeholders={["Monday to Friday", "9:00 – 5:00"]} max={8} addLabel="Add hours" />
          </details>

          <details>
            <summary>Links</summary>
            <Rows rows={c.links} onChange={(rows) => set("links", rows)} empty={() => ({ label: "", url: "" })} keys={["label", "url"]} placeholders={["Instagram", "instagram.com/you"]} max={6} addLabel="Add a link" />
          </details>
        </aside>

        <main className="ik-preview">
          <div className="ik-cells ik-size" role="tablist" aria-label="Preview size">
            <button type="button" role="tab" aria-selected={size === PreviewSize.Phone} className={`ik-cell${size === PreviewSize.Phone ? " on" : ""}`} onClick={() => setSize(PreviewSize.Phone)}>Phone</button>
            <button type="button" role="tab" aria-selected={size === PreviewSize.Desktop} className={`ik-cell${size === PreviewSize.Desktop ? " on" : ""}`} onClick={() => setSize(PreviewSize.Desktop)}>Desktop</button>
          </div>
          <div className={`ik-frame ${size}`}>
            {previewHtml ? <iframe title="Preview of your site" srcDoc={previewHtml} sandbox="allow-scripts allow-same-origin allow-modals" /> : <div className="ik-skeleton" aria-label="Loading preview" />}
          </div>
        </main>

        <aside className="ik-side">
          <section>
            <h2>Web address</h2>
            <div className={`ik-addr${handleNote ? " bad" : ""}`}>
              <input aria-label="Web address" value={handle} onChange={(e) => setHandle(toHandle(e.target.value) || e.target.value.toLowerCase())} />
              <span>.{data.baseDomain}</span>
            </div>
            {handleNote ? <p className="ik-help bad">{handleNote}</p> : null}
          </section>

          <section>
            <h2>What you sell</h2>
            <Cells label="What you sell" value={c.kind} onChange={(v) => set("kind", v)} options={[{ value: ListKind.Products, label: "Products" }, { value: ListKind.Services, label: "Services" }, { value: ListKind.Menu, label: "Menu" }]} />
            <p className="ik-help">Names the list and its button. Menus show no photos.</p>
          </section>

          <section>
            <h2>How customers get it</h2>
            <div className="ik-cells" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
              {([Fulfilment.Delivery, Fulfilment.Pickup, Fulfilment.InTouch] as const).map((f) => (
                <button key={f} type="button" aria-pressed={fulfil(f)} className={`ik-cell${fulfil(f) ? " on" : ""}`} onClick={() => toggleFulfil(f)}>
                  {f === Fulfilment.Delivery ? "Delivery" : f === Fulfilment.Pickup ? "Pickup" : "In touch"}
                  <small>{f === Fulfilment.Delivery ? "Your zones" : f === Fulfilment.Pickup ? "Free" : "You arrange"}</small>
                </button>
              ))}
            </div>
            {fulfil(Fulfilment.Pickup) ? <label className="ik-field">Pickup address<input value={c.pickupAddress} maxLength={160} onChange={(e) => set("pickupAddress", e.target.value)} /></label> : null}
            <p className="ik-help">Delivery is priced at checkout from your delivery zones in Inkress.</p>
          </section>

          <section className="ik-rule">
            <h2>Colour</h2>
            <div className="ik-cells" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
              {ACCENTS.map((a) => (
                <button key={a.hex} type="button" aria-label={a.name} aria-pressed={c.accent === a.hex} className={`ik-cell sw${c.accent === a.hex ? " on" : ""}`} onClick={() => set("accent", a.hex)}>
                  <span style={{ background: a.hex }} />
                </button>
              ))}
            </div>
            <p className="ik-help">{ACCENTS.find((a) => a.hex === c.accent)?.name ?? c.accent}. Used on the main button, Add links and one line.</p>
          </section>

          <section>
            <h2>Hero layout</h2>
            <Cells label="Hero layout" value={c.hero.layout} onChange={(v) => set("hero", { ...c.hero, layout: v })} options={[{ value: HeroLayout.Left, label: "Left" }, { value: HeroLayout.Centred, label: "Centred" }]} />
          </section>

          <section>
            <h2>Corners</h2>
            <Cells label="Corners" value={c.corners} onChange={(v) => set("corners", v)} options={[{ value: Corners.Square, label: "Square" }, { value: Corners.Rounded, label: "Rounded" }]} />
          </section>

          {published ? (
            <section className="ik-rule">
              <button type="button" className="ik-link" onClick={takeOffline}>Take the site offline</button>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
