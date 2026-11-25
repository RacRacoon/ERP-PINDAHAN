"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { FormState } from "../servis/actions";

const Skema = z.object({
  nama: z.string().trim().min(2, "Nama wajib diisi").max(120),
  jenis: z.string().trim().max(40).optional(),
  catatan: z.string().trim().max(500).optional(),
});

async function wajibLogin() {
  if (!(await auth())) throw new Error("Belum login");
}

type Data = { nama: string; jenis: string | null; catatan: string | null };
type Siap<T> = { err: NonNullable<FormState>; data?: undefined } | { err?: undefined; data: T };

async function siapkan(fd: FormData, selfId?: string): Promise<Siap<Data>> {
  const parsed = Skema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { err: { error: "Periksa isian yang ditandai.", fieldErrors } };
  }
  const v = parsed.data;
  const kembar = await db.instansi.findUnique({ where: { nama: v.nama } });
  if (kembar && kembar.id !== selfId) {
    return { err: { error: "Nama instansi ini sudah ada.", fieldErrors: { nama: "Sudah ada" } } };
  }
  return { data: { nama: v.nama, jenis: v.jenis || null, catatan: v.catatan || null } };
}

export async function createInstansi(_: FormState, fd: FormData): Promise<FormState> {
  await wajibLogin();
  const r = await siapkan(fd);
  if (r.err) return r.err;
  const i = await db.instansi.create({ data: r.data });
  revalidatePath("/", "layout");
  redirect(`/instansi/${i.id}`);
}

export async function updateInstansi(id: string, _: FormState, fd: FormData): Promise<FormState> {
  await wajibLogin();
  const r = await siapkan(fd, id);
  if (r.err) return r.err;
  await db.instansi.update({ where: { id }, data: r.data });
  revalidatePath("/", "layout");
  redirect(`/instansi/${id}`);
}

/** Hanya instansi yang tidak punya customer. */
export async function hapusInstansi(id: string) {
  await wajibLogin();
  if ((await db.customer.count({ where: { instansiId: id } })) > 0) return;
  await db.instansi.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/instansi");
}
