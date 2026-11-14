// @ts-check
// The pure decision behind the Inkress orders webhook: does this delivery mark a storefront order paid,
// is it an Inkress test payment (which charged no one and marks nothing), or is it ignored. Plain JS
// because server.mjs loads app-kit.server.mjs, which imports this, without a build step.

/** The three things an order delivery can mean for a storefront order. */
export const OrderEventKind = Object.freeze({ Paid: "paid", Test: "test", Ignore: "ignore" });

/**
 * @typedef {{ kind: "paid"; inkressOrderId: string } | { kind: "test"; inkressOrderId: string | null } | { kind: "ignore" }} StorefrontOrderEvent
 */

/**
 * Narrow an unknown value to a string index map, or null when it is not an object.
 * @param {unknown} value
 * @returns {Record<string, unknown> | null}
 */
function asRecord(value) {
  return typeof value === "object" && value !== null ? /** @type {Record<string, unknown>} */ (value) : null;
}

/**
 * True only when the webhook body's own `test` is the boolean true; absent, false, "true" or 1 are live.
 * @param {unknown} payload the parsed webhook body
 * @returns {boolean}
 */
export function isTestEvent(payload) {
  return asRecord(payload)?.test === true;
}

/**
 * Decide what an Inkress order delivery means for a storefront order. A test is decided first, so a
 * test payment never marks an order paid.
 * @param {{ topic: string; payload: unknown }} evt the app-kit webhook event
 * @returns {StorefrontOrderEvent}
 */
export function storefrontOrderEvent(evt) {
  const data = asRecord(asRecord(asRecord(evt.payload)?.event)?.data);
  const order = asRecord(data?.order) || data || {};
  const inkressOrderId = order.id != null ? String(order.id) : null;
  if (isTestEvent(evt.payload)) return { kind: OrderEventKind.Test, inkressOrderId };
  if (!/paid|confirmed/i.test(evt.topic) || !inkressOrderId) return { kind: OrderEventKind.Ignore };
  return { kind: OrderEventKind.Paid, inkressOrderId };
}
