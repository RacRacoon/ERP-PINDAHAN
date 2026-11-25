"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";

const Nama = z.string().trim().min(2, "Nama minimal 2 huruf").max(60, "Nama terlalu panjang");

export type HasilTambahOrang =
  | { ok: true; orang: { id: string; nama: string; peran: string }; info?: string }
  | { ok: false; error: string };

/**
 * Menambah orang yang bisa dipilih sebagai marketing.
 * Nama itu unik. Kalau namanya sudah ada, orangnya dipakai ulang: teknisi jadi KEDUANYA, yang nonaktif diaktifkan lagi.
 */
export async function tambahMarketing(namaMentah: string): Promise<HasilTambahOrang> {
  if (!(await auth())) throw new Error("Belum login");

  const parsed = Nama.safeParse(namaMentah);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const nama = parsed.data;

  const ada = await db.person.findFirst({ where: { nama: { equals: nama, mode: "insensitive" } } });

  let orang;
  let info: string | undefined;
  if (!ada) {
    orang = await db.person.create({ data: { nama, peran: "MARKETING" } });
  } else {
    const peran = ada.peran === "TEKNISI" ? "KEDUANYA" : ada.peran;
    if (peran !== ada.peran) info = `${ada.nama} sudah terdaftar sebagai teknisi, sekarang juga bisa jadi marketing.`;
    else if (!ada.aktif) info = `${ada.nama} diaktifkan kembali.`;
    else info = `${ada.nama} sudah terdaftar.`;
    orang = await db.person.update({ where: { id: ada.id }, data: { peran, aktif: true } });
  }

  revalidatePath("/", "layout");
  return { ok: true, orang: { id: orang.id, nama: orang.nama, peran: orang.peran }, info };
}
