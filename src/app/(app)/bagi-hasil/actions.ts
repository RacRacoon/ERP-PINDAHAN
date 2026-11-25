"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const Skema = z.object({
  periode: z.string().regex(/^\d{4}-\d{2}$/),
  personId: z.string().min(1),
  kategori: z.enum(["PEKERJA", "MARKETING", "MANAJEMEN"]),
  jumlah: z.coerce.number().int().min(0),
});

/** Tandai (atau batalkan) pembayaran. Jumlah dibekukan saat dibayar. */
export async function tandaiLunas(fd: FormData) {
  if (!(await auth())) throw new Error("Belum login");
  const v = Skema.parse(Object.fromEntries(fd));
  const batal = fd.get("batal") === "1";
  await db.payout.upsert({
    where: { periode_personId_kategori: { periode: v.periode, personId: v.personId, kategori: v.kategori } },
    update: { jumlah: v.jumlah, dibayarAt: batal ? null : new Date() },
    create: { ...v, dibayarAt: batal ? null : new Date() },
  });
  revalidatePath("/bagi-hasil");
}
