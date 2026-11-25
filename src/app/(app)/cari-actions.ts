"use server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { rupiah, tglPendek } from "@/lib/format";
import { daftarKontak } from "@/lib/kontak";

export type HasilCari = {
  jenis: "servis" | "reparasi" | "customer" | "instansi";
  id: string;
  judul: string;
  sub: string;
  href: string;
};

const BATAS = 5;

/** "0812-34" atau "+62 812" menjadi potongan nomor 62xxx untuk dicocokkan ke Customer.noWa. */
function potongWa(q: string): string | null {
  if (!/^[\d\s+\-()]+$/.test(q)) return null;
  let n = q.replace(/\D/g, "");
  if (n.length < 3) return null;
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return n;
}

/** Cari lintas servis, reparasi, customer, dan instansi. Hanya baca. */
export async function cari(kata: string): Promise<HasilCari[]> {
  if (!(await auth())) throw new Error("Belum login");

  const q = kata.trim().slice(0, 60);
  if (q.length < 2) return [];

  const wa = potongWa(q);
  const has = (field: string) => ({ [field]: { contains: q, mode: "insensitive" as const } });
  const ig = q.replace(/^@/, "").toLowerCase();
  const customerCocok = [
    has("nama"),
    ...(wa ? [{ noWa: { contains: wa } }] : []),
    ...(/^[a-z0-9._]{2,30}$/.test(ig) ? [{ instagram: { contains: ig } }] : []),
  ];

  const [servis, reparasi, customer, instansi] = await Promise.all([
    db.serviceJob.findMany({
      where: { OR: [has("modelLaptop"), has("invoice"), has("referralKode"), { customer: { OR: customerCocok } }] },
      include: { customer: true },
      orderBy: { tanggalMasuk: "desc" },
      take: BATAS,
    }),
    db.repairJob.findMany({
      where: { OR: [has("modelLaptop"), has("invoice"), has("masalah"), { customer: { OR: customerCocok } }] },
      include: { customer: true },
      orderBy: { tanggalMasuk: "desc" },
      take: BATAS,
    }),
    db.customer.findMany({
      where: { OR: [...customerCocok, { instansi: has("nama") }] },
      include: { instansi: true },
      orderBy: { nama: "asc" },
      take: BATAS,
    }),
    db.instansi.findMany({ where: has("nama"), orderBy: { nama: "asc" }, take: BATAS }),
  ]);

  const hasil: HasilCari[] = [];
  for (const j of servis) {
    hasil.push({
      jenis: "servis",
      id: j.id,
      judul: j.modelLaptop,
      sub: [j.customer?.nama, tglPendek(j.tanggalMasuk), rupiah(j.jumlah), j.invoice && `#${j.invoice}`].filter(Boolean).join(" · "),
      href: `/servis/${j.id}/edit`,
    });
  }
  for (const j of reparasi) {
    hasil.push({
      jenis: "reparasi",
      id: j.id,
      judul: j.modelLaptop,
      sub: [j.customer?.nama, tglPendek(j.tanggalMasuk), rupiah(j.jumlah), j.invoice && `#${j.invoice}`].filter(Boolean).join(" · "),
      href: `/reparasi/${j.id}/edit`,
    });
  }
  for (const c of customer) {
    hasil.push({
      jenis: "customer",
      id: c.id,
      judul: c.nama,
      sub: [...daftarKontak(c), c.instansi?.nama].filter(Boolean).join(" · "),
      href: `/customer/${c.id}`,
    });
  }
  for (const i of instansi) {
    hasil.push({ jenis: "instansi", id: i.id, judul: i.nama, sub: i.jenis ?? "instansi", href: `/instansi/${i.id}` });
  }
  return hasil;
}
