import { describe, expect, it } from "vitest";
import { formatUnits6, parseAllocationCsv, parseTokenAmount } from "./shadow-config";

describe("ShadowDrop allocation parsing", () => {
  it("parses valid CSV and computes the exact 6-decimal total", () => {
    const parsed = parseAllocationCsv("address,amount\n0x1111111111111111111111111111111111111111,1000\n0x000000000000000000000000000000000000dEaD,0.5");
    expect(parsed.errors).toEqual([]);
    expect(parsed.rows).toHaveLength(2);
    expect(formatUnits6(parsed.totalRaw)).toBe("1000.5");
  });

  it("rejects duplicates, invalid addresses, and zero amounts", () => {
    const parsed = parseAllocationCsv("address,amount\n0x1111111111111111111111111111111111111111,1\n0x1111111111111111111111111111111111111111,2\nnope,3\n0x000000000000000000000000000000000000dEaD,0");
    expect(parsed.errors).toHaveLength(3);
  });

  it("scales amounts to 6 decimals without a 10x multiplier", () => {
    expect(parseTokenAmount("1000")).toBe(1_000_000_000n);
  });
});
