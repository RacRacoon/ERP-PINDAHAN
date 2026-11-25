"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma, TipeLaptop } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { hariIniJakarta } from "@/lib/format";
import { simpanCustomer } from "@/lib/customer";
import { denganInvoice } from "@/lib/invoice";
import { tipeStok } from "@/lib/tipe";
import { cekPasangan, cekTarifCampaign, kodeReferral, type PeranReferral } from "@/lib/campaign";

const rupiahInt = z.coerce.number().int().min(0).max(100_000_000);

const Skema = z.object({
  tanggalMasuk: z.iso.date(),
  modelLaptop: z.string().trim().min(2, "Model laptop wajib diisi").max(120),
  tipe: z.enum(["GAMING", "WORK", "CLEANING", "REPASTE_MACBOOK"]),
  keluhan: z.string().trim().max(500).optional(),
  catatan: z.string().trim().max(300).optional(),
  customerNama: z.string().trim().max(120).optional(),
  customerKontak: z.string().trim().max(80).optional(),
  customerInstansi: z.string().trim().max(120).optional(),
  pjId: z.string().min(1, "PJ wajib dipilih"),
  marketingId: z.string().optional(),
  pembayaran: z.enum(["QRIS", "DANA", "TUNAI", "TRANSFER"]).optional().or(z.literal("")),
  ratePeriodId: z.string().min(1),
  status: z.enum(["BOOKING", "DIKERJAKAN", "SELESAI"]),
  jumlah: rupiahInt,
  shareMarketing: rupiahInt,
  sharePekerja: rupiahInt,
  shareManajemen: rupiahInt,
  // Campaign "Ajak Teman": hanya dipakai kalau tarif yang dipilih adalah campaign.
  referralPeran: z.enum(["PENGAJAK", "TEMAN"]).optional().or(z.literal("")),
  referralPasanganId: z.string().optional(),
  alasanTeman: z.string().trim().max(200).optional(),
});

export type FormState = { error?: string; fieldErrors?: Record<string, string> } | undefined;

async function wajibLogin() {
  if (!(await auth())) throw new Error("Belum login");
}

export async function createServiceJob(_: FormState, fd: FormData): Promise<FormState> {
  await wajibLogin();

  const parsed = Skema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Periksa isian yang ditandai.", fieldErrors };
  }
  const v = parsed.data;

  const rate = await db.rate.findUnique({
    where: { ratePeriodId_tipe: { ratePeriodId: v.ratePeriodId, tipe: v.tipe } },
    include: { ratePeriod: true },
  });
  if (!rate) return { error: `Periode tarif tidak punya tarif ${v.tipe}.` };

  const masuk = new Date(v.tanggalMasuk + "T00:00:00.000Z");

  // Campaign: tanggal dan tipe dicek di server, apa pun yang dikirim form.
  const campaign = rate.ratePeriod.campaign;
  const peran = (v.referralPeran || null) as PeranReferral | null;
  let referralKode: string | null = null;
  if (campaign) {
    const salah = cekTarifCampaign({ tipe: v.tipe, tanggalMasuk: masuk, periode: rate.ratePeriod });
    if (salah) return { error: salah, fieldErrors: { tanggalMasuk: "Di luar masa campaign" } };
    if (!peran) return { error: "Pilih peran di campaign: Pengajak atau Teman.", fieldErrors: { referralPeran: "Wajib" } };

    if (v.referralPasanganId) {
      const pas = await db.serviceJob.findUnique({ where: { id: v.referralPasanganId }, include: { rate: true } });
      if (!pas?.referralKode) return { error: "Job pasangan tidak ditemukan.", fieldErrors: { referralPasanganId: "Tidak ditemukan" } };
      const jumlahDiKode = await db.serviceJob.count({ where: { referralKode: pas.referralKode, status: { not: "BATAL" } } });
      const salahPasangan = cekPasangan({
        peranBaru: peran,
        ratePeriodIdBaru: v.ratePeriodId,
        pasangan: { referralPeran: pas.referralPeran, status: pas.status, ratePeriodId: pas.rate.ratePeriodId, jumlahDiKode },
      });
      if (salahPasangan) return { error: salahPasangan, fieldErrors: { referralPasanganId: "Tidak cocok" } };
      referralKode = pas.referralKode;
    } else {
      referralKode = kodeReferral();
    }
  }

  const cust = await simpanCustomer({ nama: v.customerNama, kontak: v.customerKontak, instansi: v.customerInstansi });
  if (!cust.ok) return { error: cust.error, fieldErrors: cust.fieldErrors };
  const customerId = cust.id;

  // Teman harus customer baru. Kalau sudah pernah selesai servis sebelum job ini, pemilik boleh lanjut dengan alasan.
  let catatan = v.catatan || null;
  if (campaign && peran === "TEMAN") {
    if (!customerId) {
      return {
        error: "Teman wajib diisi nama dan kontak (WhatsApp atau Instagram), supaya bisa dicek apakah dia customer baru.",
        fieldErrors: { customerNama: "Wajib", customerKontak: "Wajib" },
      };
    }
    const sudah = { customerId, status: "SELESAI" as const, tanggalSelesai: { lt: masuk } };
    const [s, r] = await Promise.all([
      db.serviceJob.findFirst({ where: sudah, select: { modelLaptop: true } }),
      db.repairJob.findFirst({ where: sudah, select: { modelLaptop: true } }),
    ]);
    const lama = s ?? r;
    if (lama) {
      if (!v.alasanTeman) {
        return {
          error: `Customer ini sudah pernah selesai servis di B4 (${lama.modelLaptop}). Teman di campaign harus customer baru. Isi alasan kalau tetap mau menyimpan.`,
          fieldErrors: { alasanTeman: "Wajib diisi" },
        };
      }
      catatan = [catatan, `Bukan customer baru: ${v.alasanTeman}`].filter(Boolean).join(" · ");
    }
  }

  // Kas Lab = sisa. Tidak boleh negatif walau harga/jatah diubah per job.
  const lab = v.jumlah - rate.modalPasta - rate.ongkir - v.shareMarketing - v.sharePekerja - v.shareManajemen;
  if (lab < 0) return { error: `Pembagian melebihi keuntungan (Kas Lab ${lab}). Kurangi jatah atau diskon.` };

  // Snapshot tarif: modalPasta & ongkir dari Rate, tiga share boleh di-override dari form.
  await denganInvoice(masuk, (invoice) => db.$transaction(async (tx) => {
    await tx.serviceJob.create({
      data: {
        invoice,
        tanggalMasuk: masuk,
        tanggalSelesai: v.status === "SELESAI" ? (masuk > hariIniJakarta() ? masuk : hariIniJakarta()) : null,
        modelLaptop: v.modelLaptop,
        tipe: v.tipe,
        keluhan: v.keluhan || null,
        catatan,
        customerId,
        pjId: v.pjId,
        marketingId: v.marketingId || null,
        status: v.status,
        lunas: false,
        pembayaran: v.pembayaran || null,
        rateId: rate.id,
        jumlah: v.jumlah,
        diskonPersen:
          v.jumlah < rate.hargaServis
            ? Math.round(((rate.hargaServis - v.jumlah) / rate.hargaServis) * 10000) / 100
            : null,
        modalPasta: rate.modalPasta,
        ongkir: rate.ongkir,
        shareMarketing: v.shareMarketing,
        sharePekerja: v.sharePekerja,
        shareManajemen: v.shareManajemen,
        referralKode,
        referralPeran: campaign ? peran : null,
      },
    });
    // Stok pasta: kurangi satu jatah dari lot tertua yang masih ada isinya.
    const lot = await tx.pastaLot.findFirst({
      where: { tipe: tipeStok(v.tipe), sisaJob: { gt: 0 } },
      orderBy: { tanggal: "asc" },
    });
    if (lot) await tx.pastaLot.update({ where: { id: lot.id }, data: { sisaJob: { decrement: 1 } } });
  }));

  revalidatePath("/", "layout");
  redirect("/servis");
}

const SkemaEdit = Skema.omit({ tipe: true, ratePeriodId: true }).extend({
  tanggalSelesai: z.iso.date().optional().or(z.literal("")),
  lunas: z.string().optional(), // checkbox: "on" kalau dicentang
});

/**
 * Edit job. Tipe dan tarif (rateId, modalPasta, ongkir) dikunci: itu snapshot saat job dibuat.
 * Harga akhir dan tiga jatah boleh diubah, Kas Lab tetap sisa.
 */
export async function updateServiceJob(id: string, _: FormState, fd: FormData): Promise<FormState> {
  await wajibLogin();

  const parsed = SkemaEdit.safeParse(Object.fromEntries(fd));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] = i.message;
    return { error: "Periksa isian yang ditandai.", fieldErrors };
  }
  const v = parsed.data;

  const job = await db.serviceJob.findUnique({ where: { id }, include: { rate: { include: { ratePeriod: true } } } });
  if (!job) return { error: "Pesanan tidak ditemukan." };
  if (job.status === "BATAL") return { error: "Pesanan yang dibatalkan tidak bisa diedit. Aktifkan dulu." };

  const cust = await simpanCustomer({ nama: v.customerNama, kontak: v.customerKontak, instansi: v.customerInstansi });
  if (!cust.ok) return { error: cust.error, fieldErrors: cust.fieldErrors };

  const lab = v.jumlah - job.modalPasta - job.ongkir - v.shareMarketing - v.sharePekerja - v.shareManajemen;
  if (lab < 0) return { error: `Pembagian melebihi keuntungan (Kas Lab ${lab}). Kurangi jatah atau diskon.` };

  const masuk = new Date(v.tanggalMasuk + "T00:00:00.000Z");
  const salahCampaign = cekTarifCampaign({ tipe: job.tipe, tanggalMasuk: masuk, periode: job.rate.ratePeriod });
  if (salahCampaign) return { error: salahCampaign, fieldErrors: { tanggalMasuk: "Di luar masa campaign" } };
  let selesai: Date | null = null;
  if (v.status === "SELESAI") {
    selesai = v.tanggalSelesai ? new Date(v.tanggalSelesai + "T00:00:00.000Z") : masuk > hariIniJakarta() ? masuk : hariIniJakarta();
    if (selesai < masuk) {
      return { error: "Tanggal selesai tidak boleh sebelum tanggal masuk.", fieldErrors: { tanggalSelesai: "Sebelum tanggal masuk" } };
    }
  }

  await db.serviceJob.update({
    where: { id },
    data: {
      tanggalMasuk: masuk,
      tanggalSelesai: selesai,
      modelLaptop: v.modelLaptop,
      keluhan: v.keluhan || null,
      catatan: v.catatan || null,
      customerId: cust.id,
      pjId: v.pjId,
      marketingId: v.marketingId || null,
      status: v.status,
      lunas: v.lunas === "on",
      pembayaran: v.pembayaran || null,
      jumlah: v.jumlah,
      diskonPersen:
        v.jumlah < job.rate.hargaServis
          ? Math.round(((job.rate.hargaServis - v.jumlah) / job.rate.hargaServis) * 10000) / 100
          : null,
      shareMarketing: v.shareMarketing,
      sharePekerja: v.sharePekerja,
      shareManajemen: v.shareManajemen,
    },
  });

  revalidatePath("/", "layout");
  redirect("/servis");
}

export async function ubahStatusServis(id: string, aksi: "selesai" | "lunas") {
  await wajibLogin();
  if (aksi === "selesai") {
    await db.serviceJob.update({
      where: { id },
      data: { status: "SELESAI", tanggalSelesai: hariIniJakarta() },
    });
  } else {
    await db.serviceJob.update({ where: { id }, data: { lunas: true } });
  }
  revalidatePath("/", "layout");
}

// ---- batal / aktifkan / hapus. Stok pasta mengikuti: batal mengembalikan satu jatah, aktifkan lagi memakainya.

async function kembalikanStok(tx: Prisma.TransactionClient, tipe: TipeLaptop) {
  const lot = await tx.pastaLot.findFirst({ where: { tipe: tipeStok(tipe) }, orderBy: { tanggal: "asc" } });
  if (lot) await tx.pastaLot.update({ where: { id: lot.id }, data: { sisaJob: { increment: 1 } } });
}

async function pakaiStok(tx: Prisma.TransactionClient, tipe: TipeLaptop) {
  const lot = await tx.pastaLot.findFirst({ where: { tipe: tipeStok(tipe), sisaJob: { gt: 0 } }, orderBy: { tanggal: "asc" } });
  if (lot) await tx.pastaLot.update({ where: { id: lot.id }, data: { sisaJob: { decrement: 1 } } });
}

/** Batalkan: job tetap tercatat tapi tidak masuk total, bagi hasil, dan rekap. */
export async function batalkanServis(id: string) {
  await wajibLogin();
  await db.$transaction(async (tx) => {
    const j = await tx.serviceJob.findUnique({ where: { id } });
    if (!j || j.status === "BATAL") return;
    await tx.serviceJob.update({ where: { id }, data: { status: "BATAL" } });
    await kembalikanStok(tx, j.tipe);
  });
  revalidatePath("/", "layout");
}

export async function aktifkanServis(id: string) {
  await wajibLogin();
  await db.$transaction(async (tx) => {
    const j = await tx.serviceJob.findUnique({ where: { id } });
    if (!j || j.status !== "BATAL") return;
    await tx.serviceJob.update({ where: { id }, data: { status: "DIKERJAKAN", tanggalSelesai: null } });
    await pakaiStok(tx, j.tipe);
  });
  revalidatePath("/", "layout");
}

/** Hapus permanen. Hanya untuk job yang sudah dibatalkan (dua langkah, supaya tidak salah klik). */
export async function hapusServis(id: string) {
  await wajibLogin();
  await db.serviceJob.deleteMany({ where: { id, status: "BATAL" } });
  revalidatePath("/", "layout");
}
