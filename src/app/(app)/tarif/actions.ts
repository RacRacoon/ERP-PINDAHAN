"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hariIniJakarta } from "@/lib/format";
import { NAMA_TIPE } from "@/lib/tipe";

const Skema = z.object({
  tipe: z.enum(["GAMING", "WORK"]),
  tube: z.coerce.number().int().min(1, "Minimal 1 tube").max(50),
  hargaTube: z.coerce.number().int().min(0).max(10_000_000),
  biayaTambahan: z.coerce.number().int().min(0).max(10_000_000).default(0),
});

export type RefillState = { error?: string; ok?: string } | undefined;

/** Refill = lot baru. Pemakaian tetap mengambil lot tertua yang masih punya sisa. */
export async function refillPasta(_: RefillState, fd: FormData): Promise<RefillState> {
  const sesi = await auth();
  if (!sesi) throw new Error("Belum login");
  const p = Skema.safeParse(Object.fromEntries(fd));
  if (!p.success) return { error: p.error.issues[0]?.message ?? "Isian tidak valid" };
  const { tipe, tube, hargaTube, biayaTambahan } = p.data;

  const terakhir = await db.pastaLot.findFirst({ where: { tipe }, orderBy: [{ tanggal: "desc" }, { createdAt: "desc" }] });
  if (!terakhir) return { error: `Belum ada data tube ${NAMA_TIPE[tipe]} sebagai acuan job per tube.` };

  const sisaJob = tube * terakhir.jobPerTube;
  await db.pastaLot.create({
    data: {
      tanggal: hariIniJakarta(),
      tipe,
      hargaTube: hargaTube || terakhir.hargaTube,
      biayaTambahan,
      jobPerTube: terakhir.jobPerTube,
      sisaJob,
      catatan: `Refill ${tube} tube`,
    },
  });
  revalidatePath("/", "layout");
  return { ok: `Stok pasta ${NAMA_TIPE[tipe]} +${tube} tube (+${sisaJob} job).` };
}
