// Perbandingan dengan bulan lalu untuk kartu dashboard. Murni, tanpa akses database.

export type Banding = { arah: "naik" | "turun" | "sama"; teks: string };

/**
 * Perubahan persen dari `sebelumnya` ke `sekarang`, satu desimal, koma Indonesia ("18,2%").
 * Null kalau bulan pembanding kosong (0 atau negatif): persentasenya tidak bermakna.
 */
export function banding(sekarang: number, sebelumnya: number): Banding | null {
  if (!(sebelumnya > 0)) return null;
  const persen = Math.round((Math.abs(sekarang - sebelumnya) / sebelumnya) * 1000) / 10;
  const teks = `${persen.toFixed(1).replace(".", ",")}%`;
  if (persen === 0) return { arah: "sama", teks };
  return { arah: sekarang > sebelumnya ? "naik" : "turun", teks };
}
