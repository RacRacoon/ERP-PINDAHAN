// Agregasi customer dan instansi. Seperti rekap: dihitung dari job, tidak pernah diketik.
import { db } from "./db";
import { normalisasiWa } from "./wa";
import { terealisasi } from "./queries";

type JobRingkas = { status: string; lunas: boolean; jumlah: number; tanggalMasuk: Date };

/** order = semua job yang tidak batal; belanja = hanya yang selesai dan lunas. */
function ringkas(jobs: JobRingkas[]) {
  const aktif = jobs.filter((j) => j.status !== "BATAL");
  const terakhir = aktif.reduce<Date | null>((a, j) => (!a || j.tanggalMasuk > a ? j.tanggalMasuk : a), null);
  return {
    order: aktif.length,
    belanja: jobs.filter(terealisasi).reduce((a, j) => a + j.jumlah, 0),
    terakhir,
  };
}

export async function daftarCustomer(opts: { q?: string; instansiId?: string }) {
  const q = opts.q?.trim();
  const wa = q ? normalisasiWa(q) : null;
  const digit = q?.replace(/\D/g, "");
  const ig = q ? q.replace(/^@/, "").toLowerCase() : "";

  const rows = await db.customer.findMany({
    where: {
      ...(opts.instansiId ? { instansiId: opts.instansiId } : {}),
      ...(q
        ? {
            OR: [
              { nama: { contains: q, mode: "insensitive" as const } },
              { instansi: { nama: { contains: q, mode: "insensitive" as const } } },
              ...(wa ? [{ noWa: wa }] : []),
              ...(digit && digit.length >= 4 ? [{ noWa: { contains: digit.replace(/^0/, "62") } }] : []),
              ...(ig.length >= 2 ? [{ instagram: { contains: ig } }] : []),
            ],
          }
        : {}),
    },
    include: {
      instansi: true,
      serviceJobs: { select: { status: true, lunas: true, jumlah: true, tanggalMasuk: true } },
      repairJobs: { select: { status: true, lunas: true, jumlah: true, tanggalMasuk: true } },
    },
  });

  return rows
    .map((c) => ({
      id: c.id,
      nama: c.nama,
      noWa: c.noWa,
      instagram: c.instagram,
      instansi: c.instansi,
      ...ringkas([...c.serviceJobs, ...c.repairJobs]),
    }))
    .sort((a, b) => (b.terakhir?.getTime() ?? 0) - (a.terakhir?.getTime() ?? 0) || a.nama.localeCompare(b.nama));
}

export async function daftarInstansiRingkas() {
  const rows = await db.instansi.findMany({
    include: {
      customers: {
        include: {
          serviceJobs: { select: { status: true, lunas: true, jumlah: true, tanggalMasuk: true } },
          repairJobs: { select: { status: true, lunas: true, jumlah: true, tanggalMasuk: true } },
        },
      },
    },
    orderBy: { nama: "asc" },
  });
  return rows.map((i) => {
    const jobs = i.customers.flatMap((c) => [...c.serviceJobs, ...c.repairJobs]);
    return { id: i.id, nama: i.nama, jenis: i.jenis, catatan: i.catatan, customer: i.customers.length, ...ringkas(jobs) };
  });
}

export async function detailCustomer(id: string) {
  const c = await db.customer.findUnique({
    where: { id },
    include: {
      instansi: true,
      serviceJobs: { orderBy: { tanggalMasuk: "desc" } },
      repairJobs: { orderBy: { tanggalMasuk: "desc" } },
    },
  });
  if (!c) return null;
  const riwayat = [
    ...c.serviceJobs.map((j) => ({
      id: j.id, jenis: "servis" as const, tanggal: j.tanggalMasuk, model: j.modelLaptop,
      status: j.status, lunas: j.lunas, jumlah: j.jumlah,
    })),
    ...c.repairJobs.map((j) => ({
      id: j.id, jenis: "reparasi" as const, tanggal: j.tanggalMasuk, model: j.modelLaptop,
      status: j.status, lunas: j.lunas, jumlah: j.jumlah,
    })),
  ].sort((a, b) => b.tanggal.getTime() - a.tanggal.getTime());
  return { c, riwayat, ...ringkas([...c.serviceJobs, ...c.repairJobs]) };
}

export async function detailInstansi(id: string) {
  const i = await db.instansi.findUnique({ where: { id } });
  if (!i) return null;
  const customers = await daftarCustomer({ instansiId: id });
  return { i, customers };
}
