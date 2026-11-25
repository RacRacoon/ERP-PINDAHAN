import { db } from "./db";
import { bacaKontak } from "./kontak";

export type InputCustomer = { nama?: string; kontak?: string; instansi?: string };

export type HasilCustomer =
  | { ok: true; id: string | null }
  | { ok: false; error: string; fieldErrors: Record<string, string> };

/**
 * Simpan customer (dan instansinya) dari isian form. Kosong semua = job tanpa customer.
 * Customer dikenali dari kontaknya, nomor WA atau akun Instagram: kontak yang sama memperbarui nama dan instansi, bukan membuat baris baru.
 */
export async function simpanCustomer(i: InputCustomer): Promise<HasilCustomer> {
  const nama = i.nama?.trim();
  const kontak = i.kontak?.trim();
  const instansi = i.instansi?.trim();
  if (!nama && !kontak && !instansi) return { ok: true, id: null };

  if (!kontak) {
    return { ok: false, error: "WhatsApp atau Instagram customer wajib kalau nama atau instansi diisi.", fieldErrors: { customerKontak: "Wajib" } };
  }
  const k = bacaKontak(kontak);
  if (!k.ok) {
    return { ok: false, error: k.pesan, fieldErrors: { customerKontak: "Format tidak dikenali" } };
  }
  if (!nama) {
    return { ok: false, error: "Nama customer wajib kalau kontak diisi.", fieldErrors: { customerNama: "Wajib" } };
  }

  const instansiId = instansi
    ? (await db.instansi.upsert({ where: { nama: instansi }, update: {}, create: { nama: instansi } })).id
    : null;

  const { noWa, instagram } = k.kontak;
  const ubah = { nama, ...(instansiId ? { instansiId } : {}) };
  const c = noWa
    ? await db.customer.upsert({ where: { noWa }, update: ubah, create: { noWa, nama, instansiId } })
    : await db.customer.upsert({ where: { instagram: instagram! }, update: ubah, create: { instagram, nama, instansiId } });
  return { ok: true, id: c.id };
}

/** Nama instansi yang sudah ada, untuk saran di form. */
export async function daftarInstansi(): Promise<string[]> {
  const rows = await db.instansi.findMany({ select: { nama: true }, orderBy: { nama: "asc" } });
  return rows.map((r) => r.nama);
}
