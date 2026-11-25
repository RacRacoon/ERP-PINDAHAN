"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { normalisasiWa } from "@/lib/wa";
import { normalisasiInstagram } from "@/lib/kontak";
import type { FormState } from "../servis/actions";

const Skema = z.object({
  nama: z.string().trim().min(2, "Nama wajib diisi").max(120),
  noWa: z.string().trim().max(30).optional(),
  instagram: z.string().trim().max(80).optional(),
  instansi: z.string().trim().max(120).optional(),
  catatan: z.string().trim().max(500).optional(),
});

async function wajibLogin() {
  if (!(await auth())) throw new Error("Belum login");
}

type Data = { nama: string; noWa: string | null; instagram: string | null; instansiId: string | null; catatan: string | null };

/** Validasi bersama untuk buat dan edit. `selfId` dikecualikan dari cek kontak kembar. */
type Siap<T> = { err: NonNullable<FormState>; data?: undefined } | { err?: undefined; data: T };

async function siapkan(fd: FormData, selfId?: string): Promise<Siap<Data>> {
  const parsed = Skema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { err: { error: "Periksa isian yang ditandai.", fieldErrors } };
  }
  const v = parsed.data;
  if (!v.noWa && !v.instagram) {
    return {
      err: {
        error: "Isi nomor WA atau akun Instagram, salah satunya wajib.",
        fieldErrors: { noWa: "Isi salah satu", instagram: "Isi salah satu" },
      },
    };
  }

  let noWa: string | null = null;
  if (v.noWa) {
    noWa = normalisasiWa(v.noWa);
    if (!noWa) return { err: { error: "Nomor WA tidak valid.", fieldErrors: { noWa: "Format 08xx atau 62xx" } } };
    const kembar = await db.customer.findUnique({ where: { noWa } });
    if (kembar && kembar.id !== selfId) {
      return { err: { error: `Nomor WA ini sudah dipakai ${kembar.nama}.`, fieldErrors: { noWa: "Sudah terdaftar" } } };
    }
  }

  let instagram: string | null = null;
  if (v.instagram) {
    instagram = normalisasiInstagram(v.instagram);
    if (!instagram) {
      return { err: { error: "Username Instagram tidak valid.", fieldErrors: { instagram: "Huruf, angka, titik, garis bawah" } } };
    }
    const kembar = await db.customer.findUnique({ where: { instagram } });
    if (kembar && kembar.id !== selfId) {
      return { err: { error: `Akun Instagram ini sudah dipakai ${kembar.nama}.`, fieldErrors: { instagram: "Sudah terdaftar" } } };
    }
  }

  const instansiId = v.instansi
    ? (await db.instansi.upsert({ where: { nama: v.instansi }, update: {}, create: { nama: v.instansi } })).id
    : null;
  return { data: { nama: v.nama, noWa, instagram, instansiId, catatan: v.catatan || null } };
}

export async function createCustomer(_: FormState, fd: FormData): Promise<FormState> {
  await wajibLogin();
  const r = await siapkan(fd);
  if (r.err) return r.err;
  const c = await db.customer.create({ data: r.data });
  revalidatePath("/", "layout");
  redirect(`/customer/${c.id}`);
}

export async function updateCustomer(id: string, _: FormState, fd: FormData): Promise<FormState> {
  await wajibLogin();
  const r = await siapkan(fd, id);
  if (r.err) return r.err;
  await db.customer.update({ where: { id }, data: r.data });
  revalidatePath("/", "layout");
  redirect(`/customer/${id}`);
}

/** Hanya customer tanpa order. Customer yang punya riwayat tidak dihapus supaya laporan tetap utuh. */
export async function hapusCustomer(id: string) {
  await wajibLogin();
  const [s, r] = await Promise.all([
    db.serviceJob.count({ where: { customerId: id } }),
    db.repairJob.count({ where: { customerId: id } }),
  ]);
  if (s + r > 0) return;
  await db.customer.delete({ where: { id } });
  revalidatePath("/", "layout");
  redirect("/customer");
}
