// Angka bulan sebelum ERP berjalan (efektif Oktober 2026). Job-nya tidak ada di database,
// jadi hanya total yang diambil dari laporan keuangan PDF yang sudah terbit. Hanya untuk grafik riwayat.
export type TitikArsip = { kunci: string; pemasukan: number; laba: number };

export const ARSIP_BULANAN: TitikArsip[] = [
  { kunci: "2026-08", pemasukan: 4_897_500, laba: 2_924_896 }, // LKP/BSC/VIII/2026
  { kunci: "2026-09", pemasukan: 2_755_300, laba: 1_504_232 }, // LKP/BSC/IX/2026 (31 Agu – 27 Sep)
];
