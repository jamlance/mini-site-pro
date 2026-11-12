// Server-renders the editor screen with sample data and the sample preview, for design checks:
//   npx tsx scripts/editor-snapshot.tsx <out.html> <preview.html>
import { readFileSync, writeFileSync } from "node:fs";
import type { ReactElement } from "react";
import { renderToString } from "react-dom/server";
import Editor from "../app/routes/_app._index";
import { sanitizeContent } from "../app/lib/inkwell/content";

const [out = "editor.html", preview = "sample.html"] = process.argv.slice(2);
const loaderData = {
  name: "Blue Mahoe",
  handle: "bluemahoe",
  content: sanitizeContent({ hero: { eyebrow: "Skincare · Kingston", headline: "Made from what grows in the yard.", line: "Body butters, soaps and oils." }, fulfilment: ["delivery", "pickup"], pickupAddress: "Hope Road" }, "Blue Mahoe"),
  published: true,
  liveHost: "bluemahoe.dev.myinkress.com",
  baseDomain: "dev.myinkress.com",
  canPublish: true,
  gated: false,
  planName: "Inkwell Plan",
};
const Comp = Editor as unknown as (p: { loaderData: typeof loaderData }) => ReactElement;
let html = renderToString(<Comp loaderData={loaderData} />);
const previewHtml = readFileSync(preview, "utf8").replace(/&/g, "&amp;").replace(/"/g, "&quot;");
html = html.replace(/<div class="ik-skeleton"[^>]*><\/div>/, `<iframe title="Preview" srcdoc="${previewHtml}"></iframe>`);
const css = readFileSync("app/inkwell-editor.css", "utf8");
writeFileSync(out, `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600&family=Hanken+Grotesk:wght@400;500;600&display=swap" rel="stylesheet"><style>body{margin:0}${css}</style></head><body>${html}</body></html>`);
console.log(`wrote ${out}`);
process.exit(0);
