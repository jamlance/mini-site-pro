// Publishes an Inkwell Mini Site for a merchant straight through the FleekSite
// provisioning API (the same call the editor's Publish button makes), for
// end-to-end checks without a dashboard session:
//   FLEEKSITE_API_BASE=… INKWELL_PROVISION_SECRET=… INKRESS_API_BASE=… \
//   npx tsx scripts/publish-direct.ts <merchantId> <username> "<name>" <handle> [content.json]
import { readFileSync } from "node:fs";
import { publishConfig, publishToFleekSite } from "../app/lib/inkwell/publish.server";
import { sanitizeContent } from "../app/lib/inkwell/content";

const [merchantId, username, name, handle, contentFile] = process.argv.slice(2);
const cfg = publishConfig();
if (!cfg || !merchantId || !username || !name || !handle) {
  console.error("usage: publish-direct.ts <merchantId> <username> <name> <handle> [content.json] (and the FleekSite env)");
  process.exit(1);
}
const content = sanitizeContent(contentFile ? JSON.parse(readFileSync(contentFile, "utf8")) : {}, name);
const result = await publishToFleekSite(cfg, {
  merchantId: Number(merchantId),
  merchantUsername: username,
  email: "support@inkress.com",
  published: true,
  ctx: { name, handle, currency: "JMD", content, version: Date.now().toString(36) },
});
console.log(JSON.stringify(result));
process.exit(0);
