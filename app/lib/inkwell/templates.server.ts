// Inkwell Mini Site templates (INK-1572): turns the merchant's content into
// the FleekSite template set served at <handle>.myinkress.com.
//
// Text the merchant typed is baked in (escaped for HTML and Liquid). Items
// stay live: the list is a `{% collection variants %}` over the Inkress
// catalogue, so prices, stock and photos never need a re-publish.
import { ASSETS_CSS } from "./assets/css";
import { ASSETS_JS } from "./assets/js";
import { Fulfilment, KIND_WORDS, type InkwellContent } from "./content";

export const TemplateKind = { Page: "page", Css: "css", Js: "js" } as const;
export type TemplateKind = (typeof TemplateKind)[keyof typeof TemplateKind];

export interface SiteTemplate {
  permalink: string;
  title: string;
  kind: TemplateKind;
  body: string;
  description?: string;
}

export interface TemplateContext {
  name: string;
  handle: string;
  currency: string;
  content: InkwellContent;
  /** Bumped per publish so browsers fetch the new CSS/JS. */
  version: string;
}

/** HTML-escape, then neutralise Liquid delimiters so merchant text can never run as Liquid. */
export function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;");
}

/**
 * JSON safe inside <script type="application/json"> and inert to Liquid. `<`,
 * `{{` and `{%` can only occur inside JSON strings (never in its structure),
 * so escaping them there keeps the JSON valid.
 */
export function scriptJson(v: unknown): string {
  return JSON.stringify(v)
    .replace(/</g, "\\u003c")
    .replace(/\{\{/g, "{\\u007b")
    .replace(/\{%/g, "{\\u0025");
}

export function currencyPrefix(code: string): string {
  const c = code.toUpperCase();
  if (c === "JMD") return "J$";
  if (c === "USD") return "US$";
  if (c === "CAD") return "CA$";
  return `${c} `;
}

/** Liquid that prints `expr` as money with thousands separators and cents only when present. */
export function money(expr: string, prefix: string): string {
  return `{% assign mz_n = ${expr} | times: 100 | round %}{% assign mz_i = mz_n | divided_by: 100 | floor %}{% assign mz_c = mz_n | modulo: 100 %}{% assign mz_k = mz_i | divided_by: 1000 | floor %}{% assign mz_r = mz_i | modulo: 1000 %}${esc(prefix)}{% if mz_k > 0 %}{{ mz_k }},{% if mz_r < 10 %}00{% elsif mz_r < 100 %}0{% endif %}{% endif %}{{ mz_r }}{% if mz_c > 0 %}.{% if mz_c < 10 %}0{% endif %}{{ mz_c }}{% endif %}`;
}

const WA_SVG = `<svg class="ico" viewBox="0 0 32 32" aria-hidden="true"><path fill="#25D366" d="M16 3C9 3 3.3 8.6 3.3 15.6c0 2.4.7 4.7 1.9 6.7L3 29l6.9-2.1c1.9 1 4 1.6 6.1 1.6 7 0 12.7-5.6 12.7-12.6S23 3 16 3Z"/><path fill="#fff" d="M22.6 19.2c-.3-.2-2-1-2.3-1.1-.3-.1-.5-.2-.7.2-.2.3-.8 1.1-1 1.3-.2.2-.4.2-.7.1-.3-.2-1.4-.5-2.7-1.7-1-.9-1.7-2-1.9-2.3-.2-.3 0-.5.1-.7l.5-.6c.2-.2.2-.3.3-.6.1-.2 0-.4 0-.6l-1-2.5c-.3-.7-.6-.6-.8-.6h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9s1.2 3.3 1.4 3.6c.2.2 2.4 3.7 5.8 5.1 2.9 1.1 3.5.9 4.1.8.6-.1 2-.8 2.3-1.6.3-.8.3-1.5.2-1.6-.1-.1-.3-.2-.6-.3Z"/></svg>`;
const MAIL_SVG = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="1"/><path d="M3 7l9 6 9-6"/></svg>`;
const PIN_SVG = `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>`;
const INKRESS_MARK = "https://inkress-app-assets.s3.us-east-1.amazonaws.com/brand/inkress-wordmark.png";

function head(ctx: TemplateContext, title: string, description: string): string {
  const { content } = ctx;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/mini.css?v=${esc(ctx.version)}">
<style>:root{--accent:${content.accent};--r:${content.corners === "rounded" ? "8px" : "4px"}}</style>
</head>`;
}

function fulfilmentLine(c: InkwellContent): string[] {
  const out: string[] = [];
  if (c.fulfilment.includes(Fulfilment.Delivery)) out.push("Delivery, priced at checkout");
  if (c.fulfilment.includes(Fulfilment.Pickup)) out.push(c.pickupAddress ? `Pickup at ${c.pickupAddress}` : "Pickup, free");
  if (c.fulfilment.includes(Fulfilment.InTouch)) out.push("We'll be in touch to arrange it");
  out.push("Card or bank transfer");
  return out;
}

function waLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

function heroSection(ctx: TemplateContext): string {
  const { content: c } = ctx;
  const words = KIND_WORDS[c.kind];
  const eyebrow = c.hero.eyebrow ? `<p class="eyebrow">${esc(c.hero.eyebrow)}</p>` : "";
  const line = c.hero.line ? `<p class="lede">${esc(c.hero.line)}</p>` : "";
  const wa = c.contact.whatsapp
    ? `<a class="btn ghost" href="${esc(waLink(c.contact.whatsapp, `Hi ${ctx.name}`))}" target="_blank" rel="noopener">${WA_SVG}WhatsApp</a>`
    : "";
  return `<section class="hero wrap ${c.hero.layout === "centred" ? "centred" : ""}">
  ${eyebrow}
  <h1>${esc(c.hero.headline)}</h1>
  ${line}
  <div class="actions"><a class="btn solid" href="#list">${esc(words.cta)}</a>${wa}</div>
  <ul class="how" aria-label="How to get it">${fulfilmentLine(c).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
</section>`;
}

function listSection(ctx: TemplateContext): string {
  const { content: c } = ctx;
  const words = KIND_WORDS[c.kind];
  const prefix = currencyPrefix(ctx.currency);
  const photos = c.kind !== "menu";
  return `<section id="list" class="list wrap" aria-labelledby="list-h">
{% collection variants, items, limit: 100 %}
{% assign cats = items | map: 'post' | map: 'category_name' | compact | uniq %}
{% assign bare = 0 %}{% for v in items %}{% unless v.post.cover_image %}{% assign bare = bare | plus: 1 %}{% endunless %}{% endfor %}
  <div class="list-head">
    <h2 id="list-h">${esc(words.heading)}</h2>
    <span class="count">{{ items.size }} {% if items.size == 1 %}${esc(words.noun)}{% else %}${esc(words.noun)}s{% endif %}</span>
  </div>
  {% if cats.size > 1 %}<div class="tabs" role="tablist" aria-label="Filter">
    <button type="button" role="tab" aria-selected="true" data-cat="">All</button>{% for cat in cats %}<button type="button" role="tab" aria-selected="false" data-cat="{{ cat | escape }}">{{ cat | escape }}</button>{% endfor %}
  </div>{% endif %}
  {% if items.size == 0 %}<p class="empty">Items are on their way. Message us on WhatsApp to order in the meantime.</p>{% endif %}
  <ul class="grid{% if bare == 0 and items.size > 0 and ${photos ? "true" : "false"} %} photos{% endif %}">
  {% for v in items %}{% assign p = v.post %}{% assign sold = false %}{% if p.quantity < 1 %}{% assign sold = true %}{% endif %}
    <li class="cell{% if sold %} sold{% endif %}" data-cat="{{ p.category_name | escape }}">
      {% if bare == 0 and ${photos ? "true" : "false"} %}<img class="cell-img" src="{{ p.cover_image }}" alt="" loading="lazy">{% endif %}
      <button type="button" class="cell-open" data-open
        data-id="{{ p.id }}" data-title="{{ p.title | escape }}" data-price="{{ p.price }}" data-stock="{{ p.quantity }}"
        data-img="{{ p.cover_image | escape }}" data-desc="{{ p.teaser | default: p.body | strip_html | truncate: 400 | escape }}"
        data-inputs="{{ p.data.customer_inputs | json | escape }}">
        <span class="cell-name">{{ p.title | escape }}</span>
        <span class="cell-note">{% if sold %}Sold out{% elsif p.label %}{{ p.label | escape }}{% else %}{{ p.teaser | default: p.body | strip_html | truncate: 60 | escape }}{% endif %}</span>
      </button>
      <div class="cell-foot"><span class="price">${money("p.price", prefix)}</span>{% unless sold %}<button type="button" class="add" data-add data-id="{{ p.id }}" data-title="{{ p.title | escape }}" data-price="{{ p.price }}" data-stock="{{ p.quantity }}" data-inputs="{{ p.data.customer_inputs | json | escape }}">${esc(words.add)}</button>{% endunless %}</div>
    </li>
  {% endfor %}
  </ul>
</section>`;
}

function bandSection(ctx: TemplateContext): string {
  const { about, testimonial } = ctx.content;
  if (!about.lead && !about.body && !testimonial.quote) return "";
  const aboutHtml =
    about.lead || about.body
      ? `<div class="about"><h2 class="kicker">About</h2>${about.lead ? `<p class="lead">${esc(about.lead)}</p>` : ""}${about.body ? `<p class="body">${esc(about.body)}</p>` : ""}</div>`
      : "";
  const quote = testimonial.quote
    ? `<figure class="quote"><blockquote>“${esc(testimonial.quote)}”</blockquote>${testimonial.author ? `<figcaption>${esc(testimonial.author)}</figcaption>` : ""}</figure>`
    : "";
  return `<section class="band"><div class="wrap band-in">${aboutHtml}${quote}</div></section>`;
}

function visitSection(ctx: TemplateContext): string {
  const { content: c } = ctx;
  const hours = c.hours.length
    ? `<dl class="hours">${c.hours.map((h) => `<div><dt>${esc(h.label)}</dt><dd>${esc(h.value)}</dd></div>`).join("")}</dl>`
    : "";
  const buttons: string[] = [];
  if (c.contact.whatsapp) buttons.push(`<a class="btn ghost" href="${esc(waLink(c.contact.whatsapp, `Hi ${ctx.name}`))}" target="_blank" rel="noopener">${WA_SVG}WhatsApp</a>`);
  if (c.contact.email) buttons.push(`<a class="btn ghost" href="mailto:${esc(c.contact.email)}">${MAIL_SVG}Email</a>`);
  if (c.contact.address) buttons.push(`<a class="btn ghost" href="https://www.google.com/maps/search/?api=1&amp;query=${esc(encodeURIComponent(c.contact.address))}" target="_blank" rel="noopener">${PIN_SVG}Directions</a>`);
  const links = c.links.length
    ? `<p class="links">${c.links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</p>`
    : "";
  if (!hours && !buttons.length && !links) return "";
  const title = hours ? "Hours &amp; contact" : "Contact";
  return `<section class="visit wrap" id="contact">
  <div class="visit-a"><h2>${title}</h2>${c.contact.address ? `<p class="addr">${esc(c.contact.address)}</p>` : ""}<div class="contact">${buttons.join("")}</div>${links}</div>
  ${hours ? `<div class="visit-b">${hours}</div>` : ""}
</section>`;
}

function bagDialogs(ctx: TemplateContext): string {
  const { content: c } = ctx;
  const words = KIND_WORDS[c.kind];
  return `<div class="bagbar" data-bagbar hidden><div class="wrap bagbar-in"><span class="bagbar-sum"><span data-bag-count>0 items</span><strong data-bag-total></strong></span><button type="button" class="btn light" data-bag-open>View bag</button></div></div>

<dialog class="sheet" data-sheet aria-labelledby="sheet-title">
  <form method="dialog" class="sheet-in">
    <div class="sheet-top"><span class="eyebrow" data-sheet-cat></span><button class="x" value="close" aria-label="Close">×</button></div>
    <h2 id="sheet-title" data-sheet-title></h2>
    <div class="sheet-price"><span class="price" data-sheet-price></span><span class="muted" data-sheet-stock></span></div>
    <img class="sheet-img" data-sheet-img alt="" hidden>
    <p class="sheet-desc" data-sheet-desc></p>
    <div data-sheet-inputs></div>
    <div class="sheet-bar"><div class="qty"><button type="button" data-qty="-1" aria-label="One fewer">−</button><span data-sheet-qty>1</span><button type="button" data-qty="1" aria-label="One more">+</button></div><button type="button" class="btn solid grow" data-sheet-add>${esc(words.add === "Book" ? "Book" : "Add to bag")}</button></div>
  </form>
</dialog>

<dialog class="sheet" data-bag aria-labelledby="bag-title">
  <form class="sheet-in" data-bag-form novalidate>
    <div class="sheet-top"><h2 id="bag-title">Your bag</h2><button type="button" class="x" data-bag-close aria-label="Close">×</button></div>
    <ul class="lines" data-lines></ul>
    <fieldset class="choose" data-fulfil><legend>How to get it</legend><div class="cells" data-fulfil-cells></div></fieldset>
    <div class="fields">
      <div class="two"><label>First name<input name="first" autocomplete="given-name" required></label><label>Last name<input name="last" autocomplete="family-name" required></label></div>
      <label>Email for your receipt<input name="email" type="email" autocomplete="email" required></label>
      <label>Phone<input name="phone" type="tel" autocomplete="tel" required></label>
      <div data-address hidden>
        <label>Street address<input name="street" autocomplete="address-line1"></label>
        <label>Town<input name="town" autocomplete="address-level2"></label>
        <label>Parish<input name="parish" autocomplete="address-level1"></label>
      </div>
      <label>Note for the shop <span class="muted">Optional</span><input name="notes" maxlength="300"></label>
    </div>
    <p class="err" data-err role="alert" hidden></p>
    <div class="sheet-bar col"><div class="total"><span class="muted">Total before delivery and fees</span><strong data-bag-sub></strong></div><button class="btn solid" data-pay>Checkout</button><span class="fine">Payment by Inkress. Card details never reach the shop.</span></div>
  </form>
</dialog>`;
}

function config(ctx: TemplateContext): string {
  const { content: c } = ctx;
  return `<script id="mini-config" type="application/json">${scriptJson({
    key: `inkwell.${ctx.handle}`,
    kind: c.kind,
    fulfilment: c.fulfilment,
    pickupAddress: c.pickupAddress,
    currencyPrefix: currencyPrefix(ctx.currency),
    whatsapp: c.contact.whatsapp,
    name: ctx.name,
  })}</script>`;
}

function footer(ctx: TemplateContext): string {
  return `<footer class="foot wrap"><span>© ${new Date().getFullYear()} ${esc(ctx.name)}</span><a href="https://inkress.com" class="by">Payments by <img src="${INKRESS_MARK}" alt="Inkress" height="15"></a></footer>`;
}

function topBar(ctx: TemplateContext): string {
  const words = KIND_WORDS[ctx.content.kind];
  return `<header class="top"><div class="wrap top-in"><a class="brand" href="/">${esc(ctx.name)}</a><nav class="nav" aria-label="Sections"><a href="#list">${esc(words.heading)}</a><a href="#contact">Contact</a></nav><button type="button" class="bagbtn" data-bag-open>Bag <span data-count>(0)</span></button></div></header>`;
}

export function indexPage(ctx: TemplateContext): string {
  const description = ctx.content.hero.line || ctx.content.hero.headline;
  return `${head(ctx, ctx.name, description)}
<body>
${topBar(ctx)}
<main>
${heroSection(ctx)}
${listSection(ctx)}
${bandSection(ctx)}
${visitSection(ctx)}
</main>
${footer(ctx)}
${bagDialogs(ctx)}
${config(ctx)}
<script src="/assets/mini.js?v=${esc(ctx.version)}" defer></script>
</body>
</html>`;
}

export function thanksPage(ctx: TemplateContext): string {
  const wa = ctx.content.contact.whatsapp
    ? `<a class="btn ghost" href="${esc(waLink(ctx.content.contact.whatsapp, `Hi ${ctx.name}, about my order`))}" target="_blank" rel="noopener">${WA_SVG}Message the shop about this order</a>`
    : "";
  return `${head(ctx, `Thank you · ${ctx.name}`, `Your order with ${ctx.name}`)}
<body>
<header class="top"><div class="wrap top-in"><a class="brand" href="/">${esc(ctx.name)}</a></div></header>
<main class="wrap thanks" data-thanks>
  <div data-ok hidden><p class="eyebrow ok">Paid</p><h1>Thank you. ${esc(ctx.name)} has your order.</h1><p class="lede" data-ref></p><p class="lede">The receipt is in your email.</p></div>
  <div data-wait hidden><p class="eyebrow">Waiting for payment</p><h1>Your order is saved.</h1><p class="lede">It goes through once the payment clears. The receipt follows by email.</p></div>
  <div data-bad hidden><p class="eyebrow">Not paid</p><h1>The payment didn't go through.</h1><p class="lede">Nothing was charged. Your bag is still here, so you can try again.</p></div>
  <div class="actions col">${wa}<a class="btn solid" href="/">Back to the shop</a></div>
</main>
${footer(ctx)}
${config(ctx)}
<script src="/assets/mini.js?v=${esc(ctx.version)}" defer></script>
</body>
</html>`;
}

/** The whole template set for one publish. */
export function buildTemplates(ctx: TemplateContext): SiteTemplate[] {
  const description = ctx.content.hero.line || ctx.content.hero.headline;
  return [
    { permalink: "/index", title: ctx.name, kind: TemplateKind.Page, body: indexPage(ctx), description },
    { permalink: "/thanks", title: `Thank you · ${ctx.name}`, kind: TemplateKind.Page, body: thanksPage(ctx), description: `Your order with ${ctx.name}` },
    { permalink: "/assets/mini.css", title: "Inkwell Mini styles", kind: TemplateKind.Css, body: ASSETS_CSS },
    { permalink: "/assets/mini.js", title: "Inkwell Mini script", kind: TemplateKind.Js, body: ASSETS_JS },
  ];
}
