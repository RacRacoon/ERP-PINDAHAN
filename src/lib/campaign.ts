// Campaign "Ajak Teman". Murni, tanpa akses database, supaya bisa di-test.
// Tarif campaign tidak menggantikan tarif normal: keduanya dipilih per job di bulan yang sama.
import type { Tipe } from "./tipe";

export type PeranReferral = "PENGAJAK" | "TEMAN";

export const NAMA_PERAN: Record<PeranReferral, string> = {
  PENGAJAK: "Pengajak",
  TEMAN: "Teman",
};

/** Tipe yang ikut campaign. Cleaning selalu memakai tarif normal. */
export const TIPE_CAMPAIGN: Tipe[] = ["GAMING", "WORK", "REPASTE_MACBOOK"];

export type PeriodeTarif = {
  nama: string;
  campaign: boolean;
  mulai: Date;
  selesai: Date | null;
};

/** Nama tarif untuk ditampilkan: "Ajak Teman Nov 2026" jadi "Ajak Teman (Nov 2026)". Periode lain apa adanya. */
export const labelTarif = (nama: string) => nama.replace(/^(Ajak Teman) (\w+ \d{4})$/, "$1 ($2)");

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Boleh tidaknya sebuah job memakai periode tarif ini. Mengembalikan pesan error, atau null kalau boleh.
 * Periode normal dan promo lama tidak dibatasi di sini, supaya perilakunya persis seperti sebelumnya.
 */
export function cekTarifCampaign(i: { tipe: Tipe; tanggalMasuk: Date; periode: PeriodeTarif }): string | null {
  const { periode: p } = i;
  if (!p.campaign) return null;
  if (!TIPE_CAMPAIGN.includes(i.tipe)) {
    return `Tarif "${p.nama}" tidak berlaku untuk Cleaning. Pakai tarif normal.`;
  }
  const t = i.tanggalMasuk.getTime();
  if (t < p.mulai.getTime() || (p.selesai && t > p.selesai.getTime())) {
    return `Tarif "${p.nama}" hanya untuk job bertanggal ${iso(p.mulai)} sampai ${p.selesai ? iso(p.selesai) : "seterusnya"}.`;
  }
  return null;
}

type KandidatTarif = { nama?: string; aktif: boolean; campaign: boolean; mulai?: Date | string };

const isoTgl = (d: Date | string) => (typeof d === "string" ? d.slice(0, 10) : iso(d));
const namaNormal = (nama: string) => /^[A-Za-z]+ \d{4}$/.test(nama);

/**
 * Tarif normal yang berlaku pada `hari` ("YYYY-MM-DD"): yang aktif, bukan campaign dan bukan tarif khusus (mis. Anak B4),
 * dengan tanggal mulai terbaru yang sudah lewat. Tarif yang mulainya di depan belum dipakai, jadi pergantian bulan
 * tidak perlu membalik bendera `aktif` dengan tangan.
 */
export function periodeBerlaku<T extends KandidatTarif>(periode: T[], hari: string): T | undefined {
  return periode
    .filter((p) => p.aktif && !p.campaign && p.nama && p.mulai && namaNormal(p.nama) && isoTgl(p.mulai) <= hari)
    .sort((a, b) => (isoTgl(b.mulai!) < isoTgl(a.mulai!) ? -1 : 1))[0];
}

/** Periode yang terpilih saat form dibuka: tarif normal yang berlaku hari ini (kalau `hari` diberikan), bukan campaign. */
export function pilihPeriodeAwal<T extends KandidatTarif>(periode: T[], hari?: string): T {
  const berlaku = hari ? periodeBerlaku(periode, hari) : undefined;
  return berlaku ?? periode.find((p) => p.aktif && !p.campaign) ?? periode.find((p) => !p.campaign) ?? periode[0];
}

// ------------------------------------------------------------------ pasangan referral

export type JobReferral = {
  referralKode: string | null;
  status: string;
};

/** Jumlah job (selain Batal) per kode pasangan. */
export function hitungPerKode(jobs: JobReferral[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const j of jobs) {
    if (!j.referralKode || j.status === "BATAL") continue;
    m.set(j.referralKode, (m.get(j.referralKode) ?? 0) + 1);
  }
  return m;
}

/** Job campaign yang masih sendirian di kodenya: menunggu pasangan. */
export function menungguPasangan(j: JobReferral, perKode: Map<string, number>): boolean {
  if (!j.referralKode || j.status === "BATAL") return false;
  return (perKode.get(j.referralKode) ?? 0) < 2;
}

/** Validasi memasangkan job baru dengan job yang sudah ada. Mengembalikan pesan error, atau null. */
export function cekPasangan(i: {
  peranBaru: PeranReferral;
  ratePeriodIdBaru: string;
  pasangan: { referralPeran: PeranReferral | null; status: string; ratePeriodId: string; jumlahDiKode: number };
}): string | null {
  const p = i.pasangan;
  if (p.status === "BATAL") return "Job pasangan sudah dibatalkan.";
  if (p.ratePeriodId !== i.ratePeriodIdBaru) return "Pasangan harus memakai tarif campaign yang sama.";
  if (p.jumlahDiKode >= 2) return "Job itu sudah punya pasangan. Satu pasangan hanya berisi dua job.";
  if (p.referralPeran === i.peranBaru) {
    return `Pasangannya juga ${NAMA_PERAN[p.referralPeran].toLowerCase()}. Satu pasangan harus berisi satu pengajak dan satu teman.`;
  }
  return null;
}

/** Kode pasangan baru, mis. AT-7K2M9Q. Kedua job satu pasangan memakai kode yang sama. */
export function kodeReferral(acak: () => number = Math.random): string {
  const abjad = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let k = "";
  for (let i = 0; i < 6; i++) k += abjad[Math.floor(acak() * abjad.length)];
  return `AT-${k}`;
}

// ------------------------------------------------------------------ rekap diskon

export type TarifAcuan = {
  hargaServis: number;
  shareMarketing: number;
  sharePekerja: number;
  shareManajemen: number;
};

export type JobCampaign = {
  tipe: Tipe;
  jumlah: number;
  shareMarketing: number;
  sharePekerja: number;
  shareManajemen: number;
  /** Tarif normal tipe yang sama (periode acuan). Null kalau campaign tidak punya acuan. */
  acuan: TarifAcuan | null;
};

export type DiskonCampaign = {
  /** Harga acuan dikurangi harga job. */
  diskon: number;
  /** Bagian diskon yang datang dari jatah Marketing yang diturunkan. */
  marketing: number;
  /** Bagian diskon yang datang dari jatah Manajemen yang diturunkan. */
  manajemen: number;
  /** Sisanya: jatah Pekerja yang diturunkan, atau Kas Lab. 0 kalau tarif campaign dipakai apa adanya. */
  lain: number;
};

export function diskonJobCampaign(j: JobCampaign): DiskonCampaign {
  if (!j.acuan) return { diskon: 0, marketing: 0, manajemen: 0, lain: 0 };
  const diskon = j.acuan.hargaServis - j.jumlah;
  const marketing = j.acuan.shareMarketing - j.shareMarketing;
  const manajemen = j.acuan.shareManajemen - j.shareManajemen;
  return { diskon, marketing, manajemen, lain: diskon - marketing - manajemen };
}

export type RingkasCampaign = DiskonCampaign & {
  jumlahJob: number;
  perTipe: Record<Tipe, number>;
};

export function ringkasCampaign(jobs: JobCampaign[]): RingkasCampaign {
  const t: RingkasCampaign = {
    jumlahJob: 0,
    diskon: 0,
    marketing: 0,
    manajemen: 0,
    lain: 0,
    perTipe: { GAMING: 0, WORK: 0, CLEANING: 0, REPASTE_MACBOOK: 0 },
  };
  for (const j of jobs) {
    const d = diskonJobCampaign(j);
    t.jumlahJob += 1;
    t.perTipe[j.tipe] += 1;
    t.diskon += d.diskon;
    t.marketing += d.marketing;
    t.manajemen += d.manajemen;
    t.lain += d.lain;
  }
  return t;
}

/** Salinan nilai tarif ke job. Job menyimpan angkanya sendiri, jadi mengubah tarif nanti tidak menyentuh job ini. */
export function salinTarif(
  rate: TarifAcuan & { modalPasta: number; ongkir: number },
  isian: { jumlah: number; shareMarketing: number; sharePekerja: number; shareManajemen: number },
) {
  return {
    jumlah: isian.jumlah,
    modalPasta: rate.modalPasta,
    ongkir: rate.ongkir,
    shareMarketing: isian.shareMarketing,
    sharePekerja: isian.sharePekerja,
    shareManajemen: isian.shareManajemen,
  };
}
