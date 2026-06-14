// The two editor shells. The editable CANVAS is the building surface in both;
// they differ in how the canvas + contextual panels are arranged. Merchant
// switches between them in Settings.
import type { ReactNode } from "react";

export type PanelKey = "build" | "products" | "theme" | "page" | "settings";

export const PANELS: { key: PanelKey; label: string; glyph: string }[] = [
  { key: "build", label: "Build", glyph: "◫" },
  { key: "products", label: "Products", glyph: "❏" },
  { key: "theme", label: "Theme", glyph: "◐" },
  { key: "page", label: "Page", glyph: "⬡" },
  { key: "settings", label: "Settings", glyph: "⚙" },
];

const initials = (s?: string) =>
  String(s || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export type ShellProps = {
  brand: { name: string; logo: string; accent: string };
  handle: string;
  published: boolean;
  publicUrl: string;
  saved: boolean;
  panel: PanelKey;
  setPanel: (k: PanelKey) => void;
  panelNode: ReactNode; // null for the Build panel (canvas is the surface)
  canvas: ReactNode; // the editable canvas
  onPublish: () => void;
  publishing: boolean;
};

function BrandMark({ name, logo, accent }: { name: string; logo: string; accent: string }) {
  return logo ? (
    <img className="mk-brandmark" src={logo} alt="" />
  ) : (
    <span className="mk-brandmark ph" style={{ background: `color-mix(in oklch, ${accent} 18%, var(--bv-surface))`, color: accent }}>{initials(name)}</span>
  );
}

function Saved({ saved }: { saved: boolean }) {
  return <span className={`mk-savedot ${saved ? "ok" : ""}`}>{saved ? "✓ Saved" : "Saving…"}</span>;
}
function PublishButton({ published, onPublish, publishing }: { published: boolean; onPublish: () => void; publishing: boolean }) {
  return <button className={`bv-btn ${published ? "" : "primary"}`} onClick={onPublish} disabled={publishing}>{publishing ? "…" : published ? "● Live" : "Publish"}</button>;
}

/* ───────────────────────── Studio: canvas centre stage ───────────────────────── */
export function ShellStudio(p: ShellProps) {
  const build = p.panel === "build";
  return (
    <div className="mk-studio">
      <header className="mk-studio-top">
        <div className="mk-studio-brand">
          <BrandMark {...p.brand} />
          <div>
            <div className="mk-studio-name">{p.brand.name || "Your storefront"}</div>
            <div className="mk-studio-handle">/s/{p.handle}</div>
          </div>
        </div>
        <div className="mk-studio-actions">
          <Saved saved={p.saved} />
          <a className="bv-btn sm" href={p.publicUrl} target="_blank" rel="noopener">View ↗</a>
          <PublishButton published={p.published} onPublish={p.onPublish} publishing={p.publishing} />
        </div>
      </header>

      <div className="mk-studio-body" data-build={build ? "1" : "0"}>
        <nav className="mk-rail" aria-label="Editor sections">
          {PANELS.map((t) => (
            <button key={t.key} className={`mk-rail-btn ${p.panel === t.key ? "is-active" : ""}`} onClick={() => p.setPanel(t.key)} aria-current={p.panel === t.key}>
              <span className="mk-rail-glyph" aria-hidden>{t.glyph}</span><span>{t.label}</span>
            </button>
          ))}
        </nav>
        {!build && <section className="mk-studio-controls">{p.panelNode}</section>}
        <section className="mk-studio-canvas">{p.canvas}</section>
      </div>
    </div>
  );
}

/* ───────────────────────── Sidebar: admin workspace ───────────────────────── */
export function ShellSidebar(p: ShellProps) {
  const build = p.panel === "build";
  const split = p.panel === "theme";
  return (
    <div className="mk-side">
      <aside className="mk-side-nav">
        <div className="mk-side-brand">
          <BrandMark {...p.brand} />
          <div className="mk-side-brandtext">
            <div className="mk-side-name">{p.brand.name || "Your storefront"}</div>
            <div className={`mk-side-status ${p.published ? "live" : ""}`}>{p.published ? "● Live" : "○ Draft"}</div>
          </div>
        </div>
        <nav className="mk-side-list" aria-label="Editor sections">
          {PANELS.map((t) => (
            <button key={t.key} className={`mk-side-item ${p.panel === t.key ? "is-active" : ""}`} onClick={() => p.setPanel(t.key)} aria-current={p.panel === t.key}>
              <span className="mk-side-glyph" aria-hidden>{t.glyph}</span><span>{t.label}</span>
            </button>
          ))}
        </nav>
        <div className="mk-side-foot">
          <Saved saved={p.saved} />
          <a className="bv-btn sm" href={p.publicUrl} target="_blank" rel="noopener">View site ↗</a>
          <PublishButton published={p.published} onPublish={p.onPublish} publishing={p.publishing} />
        </div>
      </aside>

      <main className={`mk-side-main ${build ? "canvas" : split ? "split" : "panel"}`}>
        {build ? (
          p.canvas
        ) : split ? (
          <>
            <div className="mk-side-panel">{p.panelNode}</div>
            <div className="mk-side-canvascol">{p.canvas}</div>
          </>
        ) : (
          <div className="mk-side-panel">{p.panelNode}</div>
        )}
      </main>
    </div>
  );
}
