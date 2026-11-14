import { describe, expect, it } from "vitest";
import { OrderEventKind, storefrontOrderEvent } from "./order-event.mjs";

const body = { event: { action: "orders.paid", data: { order: { id: 901 } } } };

describe("storefrontOrderEvent", () => {
  it("a live paid order is marked paid", () => {
    expect(storefrontOrderEvent({ topic: "orders.paid", payload: body })).toEqual({ kind: OrderEventKind.Paid, inkressOrderId: "901" });
  });
  it("a test paid order is not", () => {
    expect(storefrontOrderEvent({ topic: "orders.paid", payload: { ...body, test: true } })).toEqual({ kind: OrderEventKind.Test, inkressOrderId: "901" });
  });
  it("test given as a number is live", () => {
    expect(storefrontOrderEvent({ topic: "orders.paid", payload: { ...body, test: 1 } }).kind).toBe(OrderEventKind.Paid);
  });
  it("a pending order is ignored", () => {
    expect(storefrontOrderEvent({ topic: "orders.pending", payload: body })).toEqual({ kind: OrderEventKind.Ignore });
  });
});
