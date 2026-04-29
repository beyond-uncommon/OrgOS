import { describe, it, expect } from "vitest";
import { recurrenceProbability, historicalFrequency } from "../models/recurrenceModel.js";

const ref = new Date("2026-04-27");

function daysAgo(n: number): Date {
  const d = new Date(ref);
  d.setDate(d.getDate() - n);
  return d;
}

describe("recurrenceProbability", () => {
  it("returns 0 for no occurrences", () => {
    expect(recurrenceProbability([], ref, 7)).toBe(0);
  });

  it("returns > 0 for recent occurrences", () => {
    const dates = [daysAgo(2), daysAgo(5), daysAgo(8)];
    const p = recurrenceProbability(dates, ref, 7);
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("30-day probability >= 7-day probability for same series", () => {
    const dates = [daysAgo(3), daysAgo(7), daysAgo(14)];
    const p7  = recurrenceProbability(dates, ref, 7);
    const p30 = recurrenceProbability(dates, ref, 30);
    expect(p30).toBeGreaterThanOrEqual(p7);
  });

  it("high-frequency series approaches 1 on 30D horizon", () => {
    const dates = Array.from({ length: 10 }, (_, i) => daysAgo(i * 2 + 1));
    const p = recurrenceProbability(dates, ref, 30);
    expect(p).toBeGreaterThan(0.9);
  });
});

describe("historicalFrequency", () => {
  it("counts only occurrences within the last 30 days", () => {
    const dates = [daysAgo(5), daysAgo(15), daysAgo(35)]; // 35 days ago is outside window
    expect(historicalFrequency(dates, ref)).toBe(2);
  });

  it("returns 0 for all-old occurrences", () => {
    expect(historicalFrequency([daysAgo(60), daysAgo(90)], ref)).toBe(0);
  });
});
