import { describe, expect, it } from "vitest";
import {
  hitungBagiHasil,
  formatInvoice,
  hitungReparasi,
  jumlahkanServis,
  modalPastaPerJob,
} from "./hitung";

describe("hitungBagiHasil — data asli", () => {
  it("Gaming, tarif September 2026", () => {
    const h = hitungBagiHasil({
      jumlah: 250000, modalPasta: 35167, ongkir: 0,
      shareMarketing: 20000, sharePekerja: 85000, shareManajemen: 75000,
    });
    expect(h).toEqual({ keuntunganBersih: 214833, shareLab: 34833 });
  });

  it("Work, promo 9-11 September", () => {
    const h = hitungBagiHasil({
      jumlah: 135150, modalPasta: 15100, ongkir: 0,
      shareMarketing: 8017, sharePekerja: 60000, shareManajemen: 40000,
    });
    expect(h).toEqual({ keuntunganBersih: 120050, shareLab: 12033 });
  });

  it("Gaming, promo 17-21 Agustus (pakai ongkir)", () => {
    const h = hitungBagiHasil({
      jumlah: 207500, modalPasta: 35167, ongkir: 12000,
      shareMarketing: 15000, sharePekerja: 75000, shareManajemen: 50000,
    });
    expect(h).toEqual({ keuntunganBersih: 172333, shareLab: 20333 });
  });

  it("Gaming Oktober (pasta 35.200) menghasilkan Kas Lab 19.800", () => {
    const h = hitungBagiHasil({
      jumlah: 235000, modalPasta: 35200, ongkir: 0,
      shareMarketing: 20000, sharePekerja: 85000, shareManajemen: 75000,
    });
    expect(h.shareLab).toBe(19800);
  });

  it("Cleaning only Oktober (tanpa pasta) menghasilkan Kas Lab 20.000", () => {
    const h = hitungBagiHasil({
      jumlah: 100000, modalPasta: 0, ongkir: 0,
      shareMarketing: 10000, sharePekerja: 50000, shareManajemen: 20000,
    });
    expect(h).toEqual({ keuntunganBersih: 100000, shareLab: 20000 });
  });

  it("Repaste MacBook Oktober (pasta sebanyak Gaming) menghasilkan Kas Lab 45.800", () => {
    const i = {
      jumlah: 285000, modalPasta: 34200, ongkir: 0,
      shareMarketing: 20000, sharePekerja: 85000, shareManajemen: 100000,
    };
    const h = hitungBagiHasil(i);
    expect(h.keuntunganBersih).toBe(250800);
    expect(h.shareLab).toBe(45800);
    expect(h.shareLab + i.shareMarketing + i.sharePekerja + i.shareManajemen).toBe(h.keuntunganBersih);
  });

  it("empat pos selalu berjumlah persis keuntungan bersih", () => {
    const i = {
      jumlah: 200000, modalPasta: 35167, ongkir: 0,
      shareMarketing: 12298, sharePekerja: 85000, shareManajemen: 46117,
    };
    const h = hitungBagiHasil(i);
    expect(h.shareLab + i.shareMarketing + i.sharePekerja + i.shareManajemen + i.ongkir).toBe(
      h.keuntunganBersih,
    );
  });
});

describe("hitungReparasi", () => {
  it("September: 40% kas lab", () => {
    expect(hitungReparasi({ jumlah: 1150000, modalReparium: 1050000, persenKasLab: 40 })).toEqual({
      keuntungan: 100000, kasLab: 40000, manage: 60000,
    });
  });

  it("manage adalah sisa, tanpa selisih pembulatan", () => {
    const h = hitungReparasi({ jumlah: 35000, modalReparium: 20000, persenKasLab: 30 });
    expect(h.kasLab + h.manage).toBe(h.keuntungan);
  });
});

describe("modalPastaPerJob", () => {
  it("dibulatkan ke atas ke kelipatan 100", () => {
    expect(modalPastaPerJob(105500, 3)).toBe(35200);
    expect(modalPastaPerJob(75500, 5)).toBe(15100); // sudah kelipatan 100
  });
});

describe("jumlahkanServis", () => {
  it("menjumlahkan semua pos", () => {
    const t = jumlahkanServis([
      { jumlah: 250000, modalPasta: 35167, ongkir: 0, shareMarketing: 20000, sharePekerja: 85000, shareManajemen: 75000 },
      { jumlah: 150000, modalPasta: 15100, ongkir: 0, shareMarketing: 10000, sharePekerja: 60000, shareManajemen: 50000 },
    ]);
    expect(t.uangMasuk).toBe(400000);
    expect(t.lab).toBe(34833 + 14900);
    expect(t.keuntunganBersih).toBe(t.lab + t.marketing + t.pekerja + t.manajemen);
  });
});

describe("formatInvoice", () => {
  it("pesanan pertama 1 Januari 2026 = 01010126", () => {
    expect(formatInvoice(1, new Date("2026-01-01T00:00:00Z"))).toBe("01010126");
    expect(formatInvoice(12, new Date("2026-10-04T00:00:00Z"))).toBe("12041026");
    expect(formatInvoice(103, new Date("2026-10-04T00:00:00Z"))).toBe("103041026");
  });
});
