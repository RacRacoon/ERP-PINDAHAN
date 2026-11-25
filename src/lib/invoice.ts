import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { akhiranTanggal, formatInvoice } from "@/lib/hitung";

type Klien = Prisma.TransactionClient | typeof db;

/** Nomor berikutnya = urutan tertinggi yang sudah dipakai di tanggal itu + 1 (aman walau ada job dihapus). */
export async function invoiceBerikutnya(c: Klien, tanggalMasuk: Date): Promise<string> {
  const akhiran = akhiranTanggal(tanggalMasuk);
  const [a, b] = await Promise.all([
    c.serviceJob.findMany({ where: { invoice: { endsWith: akhiran } }, select: { invoice: true } }),
    c.repairJob.findMany({ where: { invoice: { endsWith: akhiran } }, select: { invoice: true } }),
  ]);
  let maks = 0;
  for (const { invoice } of [...a, ...b]) {
    const n = Number(invoice!.slice(0, -6));
    if (n > maks) maks = n;
  }
  return formatInvoice(maks + 1, tanggalMasuk);
}

/** Jalankan pembuatan job dengan invoice baru; ulang bila dua pesanan bentrok di nomor yang sama. */
export async function denganInvoice<T>(tanggalMasuk: Date, buat: (invoice: string) => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await buat(await invoiceBerikutnya(db, tanggalMasuk));
    } catch (e) {
      const bentrok = (e as { code?: string }).code === "P2002";
      if (!bentrok || i >= 4) throw e;
    }
  }
}
