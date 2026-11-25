// Kontak customer: nomor WA atau akun Instagram (atau dua-duanya). Murni, tanpa akses database.
import { normalisasiWa } from "./wa";

export type Kontak = { noWa: string | null; instagram: string | null };
export type JenisKontak = "wa" | "ig";
export type HasilKontak = { ok: true; kontak: Kontak } | { ok: false; pesan: string };

/** Isi yang hanya terdiri dari angka dan tanda nomor telepon dianggap nomor WA. Selain itu dianggap Instagram. */
export function jenisKontak(input: string): JenisKontak | null {
  const s = input.trim();
  if (!s) return null;
  return /^\+?[\d\s\-().]+$/.test(s) ? "wa" : "ig";
}

/**
 * Username Instagram: huruf, angka, titik, garis bawah, maksimal 30. Disimpan huruf kecil tanpa "@".
 * Link profil ("instagram.com/nama?igsh=…") juga diterima.
 */
export function normalisasiInstagram(input: string): string | null {
  let s = input.trim().replace(/^https?:\/\/(www\.)?/i, "").replace(/^instagram\.com\//i, "");
  s = s.split(/[/?#]/)[0].replace(/^@/, "").toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(s) ? s : null;
}

/** Satu isian form, "0812…" atau "@username", menjadi kontak yang siap disimpan. */
export function bacaKontak(input: string): HasilKontak {
  const jenis = jenisKontak(input);
  if (!jenis) return { ok: false, pesan: "Kosong" };
  if (jenis === "wa") {
    const noWa = normalisasiWa(input);
    return noWa
      ? { ok: true, kontak: { noWa, instagram: null } }
      : { ok: false, pesan: "Nomor WA tidak valid. Kalau ini akun Instagram, awali dengan @." };
  }
  const instagram = normalisasiInstagram(input);
  return instagram
    ? { ok: true, kontak: { noWa: null, instagram } }
    : { ok: false, pesan: "Username Instagram tidak valid. Pakai huruf, angka, titik, atau garis bawah." };
}

/** 62812… menjadi 0812… */
export const tampilWa = (noWa: string) => (noWa.startsWith("62") ? "0" + noWa.slice(2) : noWa);
export const tampilIg = (instagram: string) => `@${instagram}`;

/** Semua kontak yang ada, WA lebih dulu. */
export function daftarKontak(k: Kontak): string[] {
  return [k.noWa && tampilWa(k.noWa), k.instagram && tampilIg(k.instagram)].filter((x): x is string => !!x);
}

/** Satu kontak untuk diisikan kembali ke form (WA kalau ada, kalau tidak Instagram). */
export const kontakUtama = (k: Kontak) => daftarKontak(k)[0] ?? "";
