// Tipe servis pasta. CLEANING = bersih-bersih saja, tanpa ganti pasta (modalPasta 0).
export type Tipe = "GAMING" | "WORK" | "CLEANING" | "REPASTE_MACBOOK";

export const URUTAN_TIPE: Tipe[] = ["GAMING", "WORK", "CLEANING", "REPASTE_MACBOOK"];

export const NAMA_TIPE: Record<Tipe, string> = {
  GAMING: "Gaming",
  WORK: "Work",
  CLEANING: "Cleaning",
  REPASTE_MACBOOK: "Repaste MacBook",
};

/** Tipe yang memakai pasta (punya stok tube). */
export const PAKAI_PASTA: Tipe[] = ["GAMING", "WORK"];

/** Stok pasta yang dipakai tipe ini. Repaste MacBook memakai satu porsi pasta Gaming. Cleaning tidak memakai pasta. */
export function tipeStok(t: Tipe): "GAMING" | "WORK" | "CLEANING" {
  return t === "REPASTE_MACBOOK" ? "GAMING" : t;
}
