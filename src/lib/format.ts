// Format Indonesia: 1.355.300, bukan 1,355,300. Tanggal @db.Date disimpan UTC, tampilkan UTC.

const nf = new Intl.NumberFormat("id-ID");

export const angka = (n: number) => nf.format(n);
export const rupiah = (n: number) => `Rp ${nf.format(n)}`;

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const BULAN_PENDEK = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/** "08 Okt" */
export function tglPendek(d: Date | null | undefined): string {
  if (!d) return "—";
  return `${String(d.getUTCDate()).padStart(2, "0")} ${BULAN_PENDEK[d.getUTCMonth()]}`;
}

/** "2026-09" */
export const kunciBulan = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

/** "September 2026" dari "2026-09" */
export function namaBulan(kunci: string): string {
  const [y, m] = kunci.split("-").map(Number);
  return `${BULAN[m - 1]} ${y}`;
}

export function namaBulanPendek(kunci: string): string {
  const [, m] = kunci.split("-").map(Number);
  return BULAN_PENDEK[m - 1];
}

/** Rentang [awal, akhir) UTC untuk kunci bulan. */
export function rentangBulan(kunci: string): { awal: Date; akhir: Date } {
  const [y, m] = kunci.split("-").map(Number);
  return { awal: new Date(Date.UTC(y, m - 1, 1)), akhir: new Date(Date.UTC(y, m, 1)) };
}

export function geserBulan(kunci: string, delta: number): string {
  const [y, m] = kunci.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return kunciBulan(d);
}

/** Hari ini di Jakarta, sebagai tanggal UTC midnight. */
export function hariIniJakarta(): Date {
  const s = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(new Date());
  return new Date(s + "T00:00:00.000Z");
}

export const isoTanggal = (d: Date) => d.toISOString().slice(0, 10);

export const persen = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

export function inisial(nama: string): string {
  return nama.slice(0, 2).toUpperCase();
}

/** Teks stok pasta: hanya tube utuh, sisa job tidak ikut ditulis. Kurang dari satu tube ditulis begitu, bukan "0 tube". */
export function teksTube(sisaJob: number, jobPerTube: number): string {
  if (!jobPerTube || sisaJob <= 0) return "habis";
  const utuh = Math.floor(sisaJob / jobPerTube);
  return utuh >= 1 ? `${utuh} tube` : "kurang dari 1 tube";
}
