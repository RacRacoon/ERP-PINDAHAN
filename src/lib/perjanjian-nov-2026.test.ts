import { describe, expect, it } from "vitest";
import { hitungReparasi, jumlahkanReparasi, PERSEN_KAS_LAB_REPARASI_BARU } from "./hitung";

// Perjanjian sejak November 2026, hanya untuk reparasi hardware (yang lewat Reparium): Kas Lab 0%, seluruh keuntungan ke Manage.
// Servis pasta tidak berubah, jadi tidak ada tes tarif servis di sini (lihat hitung.test.ts dan campaign.test.ts).
describe("reparasi hardware sejak November 2026", () => {
  it("job baru memakai Kas Lab 0%", () => {
    expect(PERSEN_KAS_LAB_REPARASI_BARU).toBe(0);
  });

  it("seluruh keuntungan jadi bagian Manage", () => {
    const h = hitungReparasi({ jumlah: 925000, modalReparium: 882500, persenKasLab: PERSEN_KAS_LAB_REPARASI_BARU });
    expect(h).toMatchObject({ keuntungan: 42500, kasLab: 0, manage: 42500 });
  });

  it("data lama tidak berubah: Oktober tetap 30% dan 40%", () => {
    expect(hitungReparasi({ jumlah: 500000, modalReparium: 400000, persenKasLab: 30 })).toMatchObject({ kasLab: 30000, manage: 70000 });
    expect(hitungReparasi({ jumlah: 925000, modalReparium: 882500, persenKasLab: 40 })).toMatchObject({ kasLab: 17000, manage: 25500 });
  });

  it("rekap bulan dengan Kas Lab 0: Kas Lab nol, Manage sama dengan keuntungan", () => {
    const t = jumlahkanReparasi([
      { jumlah: 925000, modalReparium: 882500, persenKasLab: 0 },
      { jumlah: 215000, modalReparium: 150000, persenKasLab: 0 },
    ]);
    expect(t.kasLab).toBe(0);
    expect(t.manage).toBe(t.keuntungan);
  });
});
