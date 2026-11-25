"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hariIniJakarta } from "@/lib/format";
import { simpanCustomer } from "@/lib/customer";
import { denganInvoice } from "@/lib/invoice";
import type { FormState } from "../servis/actions";

const rupiahInt = z.coerce.number().int().min(0).max(1_000_000_000);

const Skema = z.object({
  tanggalMasuk: z.iso.date(),
  modelLaptop: z.string().trim().min(2, "Model wajib diisi").max(120),
  tipe: z.enum(["GAMING", "WORK"]).optional().or(z.literal("")),
  masalah: z.string().trim().min(2, "Masalah wajib diisi").max(300),
  penyelesaian: z.string().trim().max(300).optional(),
  customerNama: z.string().trim().max(120).optional(),
  customerKontak: z.string().trim().max(80).optional(),
  customerInstansi: z.string().trim().max(120).optional(),
  pembayaran: z.enum(["QRIS", "DANA", "TUNAI", "TRANSFER"]).optional().or(z.literal("")),
  status: z.enum(["BOOKING", "DIKERJAKAN", "SELESAI"]),
  jumlah: rupiahInt,
  modalReparium: rupiahInt,
  persenKasLab: z.coerce.number().int().min(0).max(100),
});

async function wajibLogin() {
  if (!(await auth())) throw new Error("Belum login");
}

export async function createRepairJob(_: FormState, fd: FormData): Promise<FormState> {
  await wajibLogin();
  const parsed = Skema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Periksa isian yang ditandai.", fieldErrors };
  }
  const v = parsed.data;
  if (v.modalReparium > v.jumlah) {
    return { error: "Harga ke Reparium lebih besar dari harga customer (rugi).", fieldErrors: { modalReparium: "Melebihi jumlah" } };
  }

  const cust = await simpanCustomer({ nama: v.customerNama, kontak: v.customerKontak, instansi: v.customerInstansi });
  if (!cust.ok) return { error: cust.error, fieldErrors: cust.fieldErrors };
  const customerId = cust.id;

  const masuk = new Date(v.tanggalMasuk + "T00:00:00.000Z");
  await denganInvoice(masuk, (invoice) => db.repairJob.create({
    data: {
      invoice,
      tanggalMasuk: masuk,
      tanggalSelesai: v.status === "SELESAI" ? (masuk > hariIniJakarta() ? masuk : hariIniJakarta()) : null,
      modelLaptop: v.modelLaptop,
      tipe: v.tipe || null,
      masalah: v.masalah,
      penyelesaian: v.penyelesaian || null,
      customerId,
      status: v.status,
      pembayaran: v.pembayaran || null,
      jumlah: v.jumlah,
      modalReparium: v.modalReparium,
      persenKasLab: v.persenKasLab,
    },
  }));
  revalidatePath("/", "layout");
  redirect("/reparasi");
}

const SkemaEdit = Skema.extend({
  tanggalSelesai: z.iso.date().optional().or(z.literal("")),
  lunas: z.string().optional(),
  transfer: z.string().optional(),
});

export async function updateRepairJob(id: string, _: FormState, fd: FormData): Promise<FormState> {
  await wajibLogin();
  const parsed = SkemaEdit.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Periksa isian yang ditandai.", fieldErrors };
  }
  const v = parsed.data;
  if (v.modalReparium > v.jumlah) {
    return { error: "Harga ke Reparium lebih besar dari harga customer (rugi).", fieldErrors: { modalReparium: "Melebihi jumlah" } };
  }

  const job = await db.repairJob.findUnique({ where: { id } });
  if (!job) return { error: "Pesanan tidak ditemukan." };
  if (job.status === "BATAL") return { error: "Pesanan yang dibatalkan tidak bisa diedit. Aktifkan dulu." };

  const cust = await simpanCustomer({ nama: v.customerNama, kontak: v.customerKontak, instansi: v.customerInstansi });
  if (!cust.ok) return { error: cust.error, fieldErrors: cust.fieldErrors };

  const masuk = new Date(v.tanggalMasuk + "T00:00:00.000Z");
  let selesai: Date | null = null;
  if (v.status === "SELESAI") {
    selesai = v.tanggalSelesai ? new Date(v.tanggalSelesai + "T00:00:00.000Z") : masuk > hariIniJakarta() ? masuk : hariIniJakarta();
    if (selesai < masuk) {
      return { error: "Tanggal selesai tidak boleh sebelum tanggal masuk.", fieldErrors: { tanggalSelesai: "Sebelum tanggal masuk" } };
    }
  }

  await db.repairJob.update({
    where: { id },
    data: {
      tanggalMasuk: masuk,
      tanggalSelesai: selesai,
      modelLaptop: v.modelLaptop,
      tipe: v.tipe || null,
      masalah: v.masalah,
      penyelesaian: v.penyelesaian || null,
      customerId: cust.id,
      status: v.status,
      lunas: v.lunas === "on",
      transfer: v.transfer === "on",
      pembayaran: v.pembayaran || null,
      jumlah: v.jumlah,
      modalReparium: v.modalReparium,
      persenKasLab: v.persenKasLab,
    },
  });
  revalidatePath("/", "layout");
  redirect("/reparasi");
}

export async function ubahStatusReparasi(id: string, aksi: "selesai" | "lunas" | "transfer") {
  await wajibLogin();
  const data =
    aksi === "selesai"
      ? { status: "SELESAI" as const, tanggalSelesai: hariIniJakarta() }
      : aksi === "lunas"
        ? { lunas: true }
        : { transfer: true };
  await db.repairJob.update({ where: { id }, data });
  revalidatePath("/", "layout");
}

/** Batalkan: tetap tercatat tapi tidak masuk total dan bagi hasil. */
export async function batalkanReparasi(id: string) {
  await wajibLogin();
  await db.repairJob.updateMany({ where: { id, status: { not: "BATAL" } }, data: { status: "BATAL" } });
  revalidatePath("/", "layout");
}

export async function aktifkanReparasi(id: string) {
  await wajibLogin();
  await db.repairJob.updateMany({
    where: { id, status: "BATAL" },
    data: { status: "DIKERJAKAN", tanggalSelesai: null },
  });
  revalidatePath("/", "layout");
}

/** Hapus permanen, hanya untuk job yang sudah dibatalkan. */
export async function hapusReparasi(id: string) {
  await wajibLogin();
  await db.repairJob.deleteMany({ where: { id, status: "BATAL" } });
  revalidatePath("/", "layout");
}
