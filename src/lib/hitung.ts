// Logika perhitungan B4 Service Center. Murni, tanpa akses database — supaya bisa di-test.
// Uang selalu Int rupiah penuh. Lihat RENCANA.md §3.

export type InputBagiHasil = {
  jumlah: number;
  modalPasta: number;
  ongkir: number;
  shareMarketing: number;
  sharePekerja: number;
  shareManajemen: number;
};

export type HasilBagiHasil = {
  keuntunganBersih: number;
  shareLab: number;
};

/**
 * Servis pasta. shareLab adalah SISA, bukan persentase dan bukan kolom database.
 * Dengan begitu empat pos selalu berjumlah persis keuntunganBersih.
 */
export function hitungBagiHasil(i: InputBagiHasil): HasilBagiHasil {
  const keuntunganBersih = i.jumlah - i.modalPasta;
  const shareLab =
    keuntunganBersih - i.ongkir - i.shareMarketing - i.sharePekerja - i.shareManajemen;
  return { keuntunganBersih, shareLab };
}

/**
 * Kas Lab di reparasi hardware yang baru dibuat. Sejak perjanjian November 2026 Kas Lab tidak ikut:
 * seluruh keuntungan jadi bagian Manage. Tetap bisa diubah per job (data lama memakai 30 dan 40).
 */
export const PERSEN_KAS_LAB_REPARASI_BARU = 0;

export type InputReparasi = {
  jumlah: number;
  modalReparium: number;
  persenKasLab: number;
};

export type HasilReparasi = {
  keuntungan: number;
  kasLab: number;
  manage: number;
};

/** Reparasi hardware. manage dihitung sebagai sisa supaya kasLab + manage == keuntungan. */
export function hitungReparasi(i: InputReparasi): HasilReparasi {
  const keuntungan = i.jumlah - i.modalReparium;
  const kasLab = Math.round((keuntungan * i.persenKasLab) / 100);
  const manage = keuntungan - kasLab;
  return { keuntungan, kasLab, manage };
}

/**
 * Modal pasta per job: harga tube / job per tube, dibulatkan ke atas ke kelipatan 100 (berlaku sejak Oktober 2026).
 * 105500/3 = 35166,67 -> 35200. Tarif Agustus–September tetap 35167 (snapshot lama, tidak diubah).
 */
export function modalPastaPerJob(hargaTube: number, jobPerTube: number): number {
  return Math.ceil(hargaTube / jobPerTube / 100) * 100;
}

export type RingkasanServis = InputBagiHasil & { tanggalSelesai?: Date | null };

export type TotalServis = {
  jumlahJob: number;
  uangMasuk: number;
  modalPasta: number;
  keuntunganBersih: number;
  lab: number;
  marketing: number;
  pekerja: number;
  manajemen: number;
  ongkir: number;
};

export const totalKosong = (): TotalServis => ({
  jumlahJob: 0,
  uangMasuk: 0,
  modalPasta: 0,
  keuntunganBersih: 0,
  lab: 0,
  marketing: 0,
  pekerja: 0,
  manajemen: 0,
  ongkir: 0,
});

/** Agregasi servis. Rekap tidak pernah diketik — selalu hasil jumlah dari job. */
export function jumlahkanServis(jobs: InputBagiHasil[]): TotalServis {
  const t = totalKosong();
  for (const j of jobs) {
    const h = hitungBagiHasil(j);
    t.jumlahJob += 1;
    t.uangMasuk += j.jumlah;
    t.modalPasta += j.modalPasta;
    t.keuntunganBersih += h.keuntunganBersih;
    t.lab += h.shareLab;
    t.marketing += j.shareMarketing;
    t.pekerja += j.sharePekerja;
    t.manajemen += j.shareManajemen;
    t.ongkir += j.ongkir;
  }
  return t;
}

export type TotalReparasi = {
  jumlahJob: number;
  omzet: number;
  modal: number;
  keuntungan: number;
  kasLab: number;
  manage: number;
};

export function jumlahkanReparasi(jobs: InputReparasi[]): TotalReparasi {
  const t: TotalReparasi = { jumlahJob: 0, omzet: 0, modal: 0, keuntungan: 0, kasLab: 0, manage: 0 };
  for (const j of jobs) {
    const h = hitungReparasi(j);
    t.jumlahJob += 1;
    t.omzet += j.jumlah;
    t.modal += j.modalReparium;
    t.keuntungan += h.keuntungan;
    t.kasLab += h.kasLab;
    t.manage += h.manage;
  }
  return t;
}

// ------------------------------------------------------------------ invoice

/** DDMMYY dari tanggal @db.Date (UTC). */
export function akhiranTanggal(d: Date): string {
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yy = String(d.getUTCFullYear() % 100).padStart(2, "0");
  return dd + mm + yy;
}

/** Urutan pesanan hari itu (servis + reparasi berbagi satu urutan) + DDMMYY. 1 Jan 2026 pesanan pertama → 01010126. */
export function formatInvoice(urutan: number, tanggal: Date): string {
  return String(urutan).padStart(2, "0") + akhiranTanggal(tanggal);
}
