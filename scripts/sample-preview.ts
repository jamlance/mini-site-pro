// Writes the Inkwell Mini page for a made-up merchant to a file, for design checks:
//   npx vite-node scripts/sample-preview.ts <out.html> [products|services|menu]
import { writeFileSync } from "node:fs";
import { renderPreview, toPreviewItem } from "../app/lib/inkwell/publish.server";
import { sanitizeContent } from "../app/lib/inkwell/content";

const [out = "sample.html", kind = "products"] = process.argv.slice(2);
const content = sanitizeContent(
  {
    kind,
    fulfilment: ["delivery", "pickup"],
    pickupAddress: "Hope Road, Liguanea",
    hero: { eyebrow: "Skincare · Kingston · Since 2019", headline: "Made from what grows in the yard.", line: "Body butters, soaps and oils made by hand with sorrel, cerasee and coconut." },
    about: { lead: "Started with grandma's cerasee. Now a small kitchen in Liguanea.", body: "We grow the sorrel, buy pimento from a farmer in St Elizabeth and press our own coconut oil." },
    testimonial: { quote: "My skin calmed down in a week. I order the body butter every month now.", author: "Shanice R., Portmore" },
    hours: [{ label: "Monday to Friday", value: "10:00 – 6:00" }, { label: "Saturday", value: "9:00 – 2:00" }, { label: "Sunday", value: "Closed" }],
    contact: { whatsapp: "8765550142", email: "hello@bluemahoe.example", address: "Hope Road, Kingston 6" },
    links: [{ label: "Instagram", url: "instagram.com/bluemahoe" }],
  },
  "Blue Mahoe",
);
const rows: Array<[string, number, string, string]> = [
  ["Sorrel & Shea Body Butter", 2400, "200 g jar · dry, itchy skin", "Body"],
  ["Cerasee Face Soap", 900, "120 g bar · unscented", "Face"],
  ["Pimento Leaf Beard Oil", 1800, "30 ml · warm, spicy", "Body"],
  ["Coconut Lip Balm", 600, "15 g tin", "Face"],
  ["The Yard Box", 5200, "Butter, soap and balm in a keepsake box", "Gifts"],
  ["Sorrel Bath Salts", 1500, "Sold out this week", "Body"],
];
const items = rows.map(([title, price, teaser, cat], i) => toPreviewItem({ id: i + 1, title, price, teaser, unlimited: i !== 5, units_remaining: 0, category: { name: cat } }));
const html = await renderPreview({ name: "Blue Mahoe", handle: "bluemahoe", currency: "JMD", version: "sample", content }, items);
writeFileSync(out, html);
console.log(`wrote ${out}`);
process.exit(0);
