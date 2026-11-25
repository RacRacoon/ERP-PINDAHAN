import { describe, expect, it } from "vitest";
import seed from "../../seed/rate-periods.json";
import { hitungBagiHasil } from "./hitung";
import { periodeBerlaku, pilihPeriodeAwal } from "./campaign";

const lab = (tipe: string) => {
  const r = seed.find((p) => p.nama === "Oktober 2026")!.rates.find((x) => x.tipe === tipe)!;
  return hitungBagiHasil({ jumlah: r.hargaServis, ...r }).shareLab;
};

describe("tarif Oktober 2026 (berlaku terus)", () => {
  it("Kas Lab per tipe tidak berubah", () => {
    expect(lab("GAMING")).toBe(29800);
    expect(lab("WORK")).toBe(9900);
    expect(lab("CLEANING")).toBe(20000);
    expect(lab("REPASTE_MACBOOK")).toBe(45800);
  });

  it("tidak punya tanggal selesai dan tidak ada tarif Desember di seed", () => {
    expect(seed.find((p) => p.nama === "Oktober 2026")!.selesai).toBeNull();
    expect(seed.some((p) => p.nama === "Desember 2026")).toBe(false);
  });
});

describe("tarif berlaku menurut tanggal", () => {
  const daftar = [
    { id: "camp", nama: "Ajak Teman Nov 2026", aktif: false, campaign: true, mulai: "2026-11-01" },
    { id: "baru", nama: "Januari 2027", aktif: true, campaign: false, mulai: "2027-01-01" },
    { id: "okt", nama: "Oktober 2026", aktif: true, campaign: false, mulai: "2026-10-01" },
    { id: "b4", nama: "Anak B4", aktif: true, campaign: false, mulai: "2026-08-01" },
  ];

  it("tarif yang mulainya di depan belum dipakai", () => {
    expect(periodeBerlaku(daftar, "2026-12-31")?.id).toBe("okt");
    expect(pilihPeriodeAwal(daftar, "2026-11-22").id).toBe("okt");
  });

  it("pada tanggal mulai otomatis ganti ke tarif baru", () => {
    expect(periodeBerlaku(daftar, "2027-01-01")?.id).toBe("baru");
    expect(pilihPeriodeAwal(daftar, "2027-02-15").id).toBe("baru");
  });

  it("tarif yang dimatikan (aktif false) tidak dipakai", () => {
    const mati = daftar.map((p) => (p.id === "baru" ? { ...p, aktif: false } : p));
    expect(periodeBerlaku(mati, "2027-02-05")?.id).toBe("okt");
  });

  it("Anak B4 dan campaign tidak pernah terpilih sebagai tarif normal", () => {
    const hanyaKhusus = daftar.filter((p) => p.id === "b4" || p.id === "camp");
    expect(periodeBerlaku(hanyaKhusus, "2026-12-05")).toBeUndefined();
  });

  it("tanpa tanggal, perilaku lama tetap: periode normal aktif pertama", () => {
    expect(pilihPeriodeAwal([{ id: "okt", aktif: true, campaign: false }]).id).toBe("okt");
  });
});
