import { describe, it, expect } from "vitest";
import {
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  DELIVERY_ZONES,
} from "@/lib/orders/constants";

describe("orders/constants", () => {
  it("covers every status in the transition map", () => {
    expect(Object.keys(STATUS_TRANSITIONS).sort()).toEqual(
      [...ORDER_STATUSES].sort(),
    );
  });

  it("only transitions to known statuses", () => {
    for (const targets of Object.values(STATUS_TRANSITIONS)) {
      for (const t of targets) {
        expect(ORDER_STATUSES).toContain(t);
      }
    }
  });

  it("follows the COD lifecycle", () => {
    expect(STATUS_TRANSITIONS.pending).toEqual(["confirmed", "cancelled"]);
    expect(STATUS_TRANSITIONS.confirmed).toEqual(["shipped", "cancelled"]);
    expect(STATUS_TRANSITIONS.shipped).toEqual(["delivered"]);
  });

  it("treats delivered and cancelled as terminal", () => {
    expect(STATUS_TRANSITIONS.delivered).toEqual([]);
    expect(STATUS_TRANSITIONS.cancelled).toEqual([]);
  });

  it("never allows a status to transition to itself", () => {
    for (const [from, targets] of Object.entries(STATUS_TRANSITIONS)) {
      expect(targets).not.toContain(from);
    }
  });

  it("keeps the four delivery zones", () => {
    expect(DELIVERY_ZONES).toEqual([
      "thamel",
      "jhamsikhel",
      "gongabu",
      "shipping",
    ]);
  });
});
