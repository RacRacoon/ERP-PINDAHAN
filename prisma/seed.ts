// Seed awal untuk ERP yang mulai dari Oktober 2026: orang, tarif, stok pasta, user admin.
// Aman dijalankan ulang dan aman di database produksi: hanya menambah / memperbarui, tidak pernah menghapus.
// Gagal kalau shareLab hasil hitung != nilai di rate-periods.json.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient, type PeranPerson, type TipeLaptop } from "@prisma/client";
import { hitungBagiHasil } from "../src/lib/hitung";

try {
  process.loadEnvFile();
} catch {
  /* .env opsional (mis. env sudah di-set oleh platform) */
}

const prisma = new PrismaClient();
const baca = <T>(f: string): T => JSON.parse(readFileSync(join(__dirname, "..", "seed", f), "utf8"));
const tgl = (s: string) => new Date(s + "T00:00:00.000Z");

type RateSeed = {
  tipe: TipeLaptop; hargaServis: number; modalPasta: number; ongkir: number;
  shareMarketing: number; sharePekerja: number; shareManajemen: number; _shareLabHarusnya: number;
};
type PeriodSeed = {
  nama: string; mulai: string; selesai: string | null; aktif: boolean; catatan: string; rates: RateSeed[];
  campaign?: boolean; acuan?: string; // campaign: tarif pilihan per job; acuan = nama periode normal pembanding diskon
};

async function main() {
  // --- user admin (login sebenarnya dari env, baris ini untuk jejak)
  const email = process.env.ADMIN_EMAIL;
  // .env memakai \$ (konvensi Next); loadEnvFile tidak melepas escape itu.
  const hash = process.env.ADMIN_PASSWORD_HASH?.replaceAll("\$", "$");
  if (email && hash) {
    await prisma.user.upsert({
      where: { email },
      update: { passwordHash: hash },
      create: { email, passwordHash: hash, nama: process.env.ADMIN_NAMA ?? "Admin" },
    });
  }

  // --- orang
  const people = baca<{ nama: string; peran: PeranPerson; aktif: boolean }[]>("people.json");
  for (const p of people) {
    await prisma.person.upsert({ where: { nama: p.nama }, update: {}, create: p });
  }

  // --- tarif: periode dibuat kalau belum ada; tarif yang sudah ada TIDAK ditimpa
  // (job lama menyimpan snapshot, tapi tarif yang sudah diubah di app tidak boleh kembali ke seed).
  const periods = baca<PeriodSeed[]>("rate-periods.json");
  for (const p of periods) {
    for (const r of p.rates) {
      const { shareLab } = hitungBagiHasil({ jumlah: r.hargaServis, ...r });
      if (shareLab !== r._shareLabHarusnya) {
        throw new Error(`Seed gagal: ${p.nama}/${r.tipe} shareLab ${shareLab} != ${r._shareLabHarusnya}`);
      }
    }
    const ada = await prisma.ratePeriod.findUnique({ where: { nama: p.nama }, include: { rates: true } });
    if (ada) {
      // Periode sudah ada: hanya tambahkan tipe tarif yang belum ada (mis. Cleaning). Tarif yang ada tidak ditimpa.
      for (const r of p.rates.filter((x) => !ada.rates.some((y) => y.tipe === x.tipe))) {
        await prisma.rate.create({
          data: {
            ratePeriodId: ada.id, tipe: r.tipe, hargaServis: r.hargaServis, modalPasta: r.modalPasta, ongkir: r.ongkir,
            shareMarketing: r.shareMarketing, sharePekerja: r.sharePekerja, shareManajemen: r.shareManajemen,
          },
        });
        console.log(`Tarif ${r.tipe} ditambahkan ke ${p.nama}`);
      }
      continue;
    }
    let acuanId: string | null = null;
    if (p.acuan) {
      const a = await prisma.ratePeriod.findUnique({ where: { nama: p.acuan } });
      if (!a) throw new Error(`Seed gagal: periode acuan "${p.acuan}" untuk ${p.nama} tidak ada`);
      acuanId = a.id;
    }
    await prisma.ratePeriod.create({
      data: {
        nama: p.nama, mulai: tgl(p.mulai), selesai: p.selesai ? tgl(p.selesai) : null,
        aktif: p.aktif, catatan: p.catatan, campaign: p.campaign ?? false, acuanId,
        rates: {
          create: p.rates.map((r) => ({
            tipe: r.tipe, hargaServis: r.hargaServis, modalPasta: r.modalPasta, ongkir: r.ongkir,
            shareMarketing: r.shareMarketing, sharePekerja: r.sharePekerja, shareManajemen: r.shareManajemen,
          })),
        },
      },
    });
  }

  // --- stok pasta: hanya kalau tabel masih kosong (sisaJob berubah tiap job)
  if ((await prisma.pastaLot.count()) === 0) {
    const lots = baca<{ tanggal: string; tipe: TipeLaptop; hargaTube: number; jobPerTube: number; sisaJob: number; catatan: string }[]>("pasta-lots.json");
    await prisma.pastaLot.createMany({ data: lots.map((l) => ({ ...l, tanggal: tgl(l.tanggal) })) });
  }

  console.log(`Seed selesai: ${people.length} orang, ${periods.length} periode tarif.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
