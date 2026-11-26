import { describe, expect, it } from "vitest";
import { teksTube } from "./format";

describe("teksTube", () => {
  it("hanya tube utuh, sisa job tidak ditulis", () => {
    expect(teksTube(5, 5)).toBe("1 tube");
    expect(teksTube(7, 5)).toBe("1 tube");
    expect(teksTube(9, 5)).toBe("1 tube");
    expect(teksTube(10, 5)).toBe("2 tube");
  });
  it("kurang dari satu tube", () => {
    expect(teksTube(2, 3)).toBe("kurang dari 1 tube");
    expect(teksTube(1, 5)).toBe("kurang dari 1 tube");
  });
  it("habis atau tanpa acuan", () => {
    expect(teksTube(0, 3)).toBe("habis");
    expect(teksTube(4, 0)).toBe("habis");
  });
});
