import { describe, expect, it } from "vitest";
import { banding } from "./banding";

describe("banding bulan lalu", () => {
  it("naik: Oktober 3.220.000 dari September 2.755.300", () => {
    expect(banding(3_220_000, 2_755_300)).toEqual({ arah: "naik", teks: "16,9%" });
  });

  it("turun: bulan berjalan yang masih kosong terhadap bulan penuh", () => {
    expect(banding(0, 3_220_000)).toEqual({ arah: "turun", teks: "100,0%" });
  });

  it("sama kalau selisihnya di bawah 0,05%", () => {
    expect(banding(1_000_000, 1_000_000)).toEqual({ arah: "sama", teks: "0,0%" });
    expect(banding(1_000_100, 1_000_000)).toEqual({ arah: "sama", teks: "0,0%" });
  });

  it("tanpa pembanding kalau bulan lalu nol atau negatif", () => {
    expect(banding(500_000, 0)).toBeNull();
    expect(banding(500_000, -10)).toBeNull();
  });
});
