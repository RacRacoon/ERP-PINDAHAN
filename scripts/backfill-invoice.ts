// Beri invoice untuk job lama yang belum punya (sekali jalan; aman diulang).
import { PrismaClient } from "@prisma/client";
import { formatInvoice } from "../src/lib/hitung";

const db = new PrismaClient();

async function main() {
  const [s, r] = await Promise.all([
    db.serviceJob.findMany({ where: { invoice: null }, select: { id: true, tanggalMasuk: true, createdAt: true } }),
    db.repairJob.findMany({ where: { invoice: null }, select: { id: true, tanggalMasuk: true, createdAt: true } }),
  ]);
  const semua = [
    ...s.map((x) => ({ ...x, jenis: "s" as const })),
    ...r.map((x) => ({ ...x, jenis: "r" as const })),
  ].sort((a, b) => +a.tanggalMasuk - +b.tanggalMasuk || +a.createdAt - +b.createdAt);

  for (const j of semua) {
    const akhiran = formatInvoice(0, j.tanggalMasuk).slice(-6);
    const [a, b] = await Promise.all([
      db.serviceJob.findMany({ where: { invoice: { endsWith: akhiran } }, select: { invoice: true } }),
      db.repairJob.findMany({ where: { invoice: { endsWith: akhiran } }, select: { invoice: true } }),
    ]);
    const maks = Math.max(0, ...[...a, ...b].map((x) => Number(x.invoice!.slice(0, -6))));
    const invoice = formatInvoice(maks + 1, j.tanggalMasuk);
    if (j.jenis === "s") await db.serviceJob.update({ where: { id: j.id }, data: { invoice } });
    else await db.repairJob.update({ where: { id: j.id }, data: { invoice } });
    console.log(j.jenis, invoice);
  }
}
main().finally(() => db.$disconnect());
