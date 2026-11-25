import { describe, expect, it } from "vitest";
import { hitungBagiHasil, jumlahkanServis } from "./hitung";
import {
  cekPasangan,
  cekTarifCampaign,
  hitungPerKode,
  kodeReferral,
  menungguPasangan,
  pilihPeriodeAwal,
  ringkasCampaign,
  salinTarif,
  type JobCampaign,
  type PeriodeTarif,
} from "./campaign";

const tgl = (s: string) => new Date(s + "T00:00:00.000Z");

// Tarif "Ajak Teman Nov 2026" dan tarif acuan "Oktober 2026", dari README campaign.
const CAMPAIGN = {
  GAMING: { hargaServis: 210000, modalPasta: 35200, ongkir: 0, shareMarketing: 0, sharePekerja: 85000, shareManajemen: 60000 },
  WORK: { hargaServis: 130000, modalPasta: 15100, ongkir: 0, shareMarketing: 0, sharePekerja: 60000, shareManajemen: 45000 },
  REPASTE_MACBOOK: { hargaServis: 255000, modalPasta: 34200, ongkir: 0, shareMarketing: 0, sharePekerja: 85000, shareManajemen: 90000 },
} as const;

const OKTOBER = {
  GAMING: { hargaServis: 235000, shareMarketing: 20000, sharePekerja: 85000, shareManajemen: 65000 },
  WORK: { hargaServis: 145000, shareMarketing: 10000, sharePekerja: 60000, shareManajemen: 50000 },
  REPASTE_MACBOOK: { hargaServis: 285000, shareMarketing: 20000, sharePekerja: 85000, shareManajemen: 100000 },
} as const;

const periodeCampaign: PeriodeTarif = {
  nama: "Ajak Teman Nov 2026",
  campaign: true,
  mulai: tgl("2026-11-01"),
  selesai: tgl("2026-11-30"),
};

describe("tarif Ajak Teman Nov 2026", () => {
  const KAS_LAB = { GAMING: 29800, WORK: 9900, REPASTE_MACBOOK: 45800 } as const;

  for (const tipe of ["GAMING", "WORK", "REPASTE_MACBOOK"] as const) {
    it(`Kas Lab ${tipe} sama dengan tabel README`, () => {
      const r = CAMPAIGN[tipe];
      expect(hitungBagiHasil({ jumlah: r.hargaServis, ...r }).shareLab).toBe(KAS_LAB[tipe]);
    });

    it(`empat pos ${tipe} berjumlah persis keuntungan bersih`, () => {
      const r = CAMPAIGN[tipe];
      const h = hitungBagiHasil({ jumlah: r.hargaServis, ...r });
      const empatPos = h.shareLab + r.ongkir + r.shareMarketing + r.sharePekerja + r.shareManajemen;
      expect(empatPos).toBe(h.keuntunganBersih);
    });

    it(`Kas Lab campaign ${tipe} sama dengan Kas Lab Oktober`, () => {
      const c = CAMPAIGN[tipe];
      const o = OKTOBER[tipe];
      const labOktober = hitungBagiHasil({ jumlah: o.hargaServis, modalPasta: c.modalPasta, ongkir: 0, ...o }).shareLab;
      expect(hitungBagiHasil({ jumlah: c.hargaServis, ...c }).shareLab).toBe(labOktober);
    });
  }
});

describe("batas tanggal dan tipe", () => {
  it("menolak job bertanggal 31 Oktober 2026", () => {
    expect(cekTarifCampaign({ tipe: "GAMING", tanggalMasuk: tgl("2026-10-31"), periode: periodeCampaign })).toMatch(/hanya untuk job bertanggal/);
  });

  it("menolak job bertanggal 1 Desember 2026", () => {
    expect(cekTarifCampaign({ tipe: "WORK", tanggalMasuk: tgl("2026-12-01"), periode: periodeCampaign })).toMatch(/hanya untuk job bertanggal/);
  });

  it("menerima 1 November dan 30 November", () => {
    expect(cekTarifCampaign({ tipe: "GAMING", tanggalMasuk: tgl("2026-11-01"), periode: periodeCampaign })).toBeNull();
    expect(cekTarifCampaign({ tipe: "REPASTE_MACBOOK", tanggalMasuk: tgl("2026-11-30"), periode: periodeCampaign })).toBeNull();
  });

  it("menolak Cleaning walau tanggalnya benar", () => {
    expect(cekTarifCampaign({ tipe: "CLEANING", tanggalMasuk: tgl("2026-11-10"), periode: periodeCampaign })).toMatch(/Cleaning/);
  });

  it("tidak membatasi periode normal (perilaku lama tetap)", () => {
    const oktober: PeriodeTarif = { nama: "Oktober 2026", campaign: false, mulai: tgl("2026-10-01"), selesai: null };
    expect(cekTarifCampaign({ tipe: "CLEANING", tanggalMasuk: tgl("2026-11-10"), periode: oktober })).toBeNull();
    expect(cekTarifCampaign({ tipe: "GAMING", tanggalMasuk: tgl("2026-12-20"), periode: oktober })).toBeNull();
  });
});

describe("job normal di November", () => {
  it("form membuka tarif Oktober, bukan campaign, walau campaign terdaftar lebih dulu", () => {
    const periode = [
      { id: "camp", nama: "Ajak Teman Nov 2026", aktif: false, campaign: true },
      { id: "okt", nama: "Oktober 2026", aktif: true, campaign: false },
      { id: "b4", nama: "Anak B4", aktif: false, campaign: false },
    ];
    expect(pilihPeriodeAwal(periode).id).toBe("okt");
  });

  it("kalau campaign ikut ditandai aktif, tarif normal tetap dipilih", () => {
    const periode = [
      { id: "camp", aktif: true, campaign: true },
      { id: "okt", aktif: true, campaign: false },
    ];
    expect(pilihPeriodeAwal(periode).id).toBe("okt");
  });
});

describe("snapshot tarif", () => {
  it("mengubah tarif campaign sesudah job dibuat tidak mengubah job", () => {
    const tarif: { hargaServis: number; modalPasta: number; ongkir: number; shareMarketing: number; sharePekerja: number; shareManajemen: number } = {
      ...CAMPAIGN.GAMING,
    };
    const job = salinTarif(tarif, { jumlah: 210000, shareMarketing: 0, sharePekerja: 85000, shareManajemen: 60000 });
    const labSebelum = hitungBagiHasil(job).shareLab;

    // tarif diubah atau campaign dimatikan
    tarif.hargaServis = 235000;
    tarif.modalPasta = 99999;
    tarif.shareManajemen = 65000;

    expect(job).toEqual({ jumlah: 210000, modalPasta: 35200, ongkir: 0, shareMarketing: 0, sharePekerja: 85000, shareManajemen: 60000 });
    expect(hitungBagiHasil(job).shareLab).toBe(labSebelum);
    expect(labSebelum).toBe(29800);
  });
});

describe("rekap diskon campaign", () => {
  const jobCampaign = (tipe: "GAMING" | "WORK" | "REPASTE_MACBOOK"): JobCampaign => {
    const c = CAMPAIGN[tipe];
    return {
      tipe,
      jumlah: c.hargaServis,
      shareMarketing: c.shareMarketing,
      sharePekerja: c.sharePekerja,
      shareManajemen: c.shareManajemen,
      acuan: OKTOBER[tipe],
    };
  };

  it("4 Gaming + 4 Work + 1 MacBook: diskon 190.000 (Marketing 140.000, Manajemen 50.000)", () => {
    const jobs: JobCampaign[] = [
      ...Array.from({ length: 4 }, () => jobCampaign("GAMING")),
      ...Array.from({ length: 4 }, () => jobCampaign("WORK")),
      jobCampaign("REPASTE_MACBOOK"),
    ];
    const r = ringkasCampaign(jobs);
    expect(r.jumlahJob).toBe(9);
    expect(r.perTipe).toEqual({ GAMING: 4, WORK: 4, CLEANING: 0, REPASTE_MACBOOK: 1 });
    expect(r.diskon).toBe(190000);
    expect(r.marketing).toBe(140000);
    expect(r.manajemen).toBe(50000);
    expect(r.lain).toBe(0);
    expect(r.marketing + r.manajemen + r.lain).toBe(r.diskon);
  });

  it("per tipe sesuai tabel README", () => {
    expect(ringkasCampaign([jobCampaign("GAMING")])).toMatchObject({ diskon: 25000, marketing: 20000, manajemen: 5000 });
    expect(ringkasCampaign([jobCampaign("WORK")])).toMatchObject({ diskon: 15000, marketing: 10000, manajemen: 5000 });
    expect(ringkasCampaign([jobCampaign("REPASTE_MACBOOK")])).toMatchObject({ diskon: 30000, marketing: 20000, manajemen: 10000 });
  });

  it("jatah Pekerja yang diturunkan per job muncul di 'lain', jumlahnya tetap pas", () => {
    const j = { ...jobCampaign("GAMING"), jumlah: 200000, sharePekerja: 75000 }; // diskon 35.000: 20.000 + 5.000 + 10.000
    const r = ringkasCampaign([j]);
    expect(r).toMatchObject({ diskon: 35000, marketing: 20000, manajemen: 5000, lain: 10000 });
  });

  it("tanpa tarif acuan, diskon dihitung nol", () => {
    expect(ringkasCampaign([{ ...jobCampaign("GAMING"), acuan: null }]).diskon).toBe(0);
  });

  it("job campaign tetap masuk total bulanan biasa", () => {
    const jobs = (["GAMING", "WORK", "REPASTE_MACBOOK"] as const).map((t) => ({ jumlah: CAMPAIGN[t].hargaServis, ...CAMPAIGN[t] }));
    const t = jumlahkanServis(jobs);
    expect(t.uangMasuk).toBe(595000);
    expect(t.lab).toBe(29800 + 9900 + 45800);
  });
});

describe("pasangan referral", () => {
  it("job sendirian menunggu pasangan, berdua lengkap", () => {
    const jobs = [
      { referralKode: "AT-AAAAAA", status: "SELESAI" },
      { referralKode: "AT-AAAAAA", status: "DIKERJAKAN" },
      { referralKode: "AT-BBBBBB", status: "DIKERJAKAN" },
    ];
    const perKode = hitungPerKode(jobs);
    expect(menungguPasangan(jobs[0], perKode)).toBe(false);
    expect(menungguPasangan(jobs[2], perKode)).toBe(true);
  });

  it("pasangan yang dibatalkan tidak dihitung, jadi job satunya kembali menunggu", () => {
    const jobs = [
      { referralKode: "AT-AAAAAA", status: "SELESAI" },
      { referralKode: "AT-AAAAAA", status: "BATAL" },
    ];
    expect(menungguPasangan(jobs[0], hitungPerKode(jobs))).toBe(true);
    expect(menungguPasangan(jobs[1], hitungPerKode(jobs))).toBe(false);
  });

  const pasangan = { referralPeran: "PENGAJAK" as const, status: "DIKERJAKAN", ratePeriodId: "camp", jumlahDiKode: 1 };

  it("menerima teman untuk pengajak yang masih sendiri", () => {
    expect(cekPasangan({ peranBaru: "TEMAN", ratePeriodIdBaru: "camp", pasangan })).toBeNull();
  });

  it("menolak peran yang sama", () => {
    expect(cekPasangan({ peranBaru: "PENGAJAK", ratePeriodIdBaru: "camp", pasangan })).toMatch(/satu pengajak dan satu teman/);
  });

  it("menolak pasangan yang sudah lengkap, dibatalkan, atau beda tarif", () => {
    expect(cekPasangan({ peranBaru: "TEMAN", ratePeriodIdBaru: "camp", pasangan: { ...pasangan, jumlahDiKode: 2 } })).toMatch(/sudah punya pasangan/);
    expect(cekPasangan({ peranBaru: "TEMAN", ratePeriodIdBaru: "camp", pasangan: { ...pasangan, status: "BATAL" } })).toMatch(/dibatalkan/);
    expect(cekPasangan({ peranBaru: "TEMAN", ratePeriodIdBaru: "lain", pasangan })).toMatch(/tarif campaign yang sama/);
  });

  it("kode referral berformat AT-xxxxxx", () => {
    expect(kodeReferral()).toMatch(/^AT-[A-Z2-9]{6}$/);
  });
});
