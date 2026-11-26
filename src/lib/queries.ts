// Query & agregasi. Semua angka laporan dihitung dari job, tidak ada tabel rekap (CLAUDE.md #5).
import { db } from "./db";
import {
  hitungBagiHasil,
  hitungReparasi,
  jumlahkanReparasi,
  jumlahkanServis,
} from "./hitung";
import { NAMA_TIPE, type Tipe } from "./tipe";
import { geserBulan, hariIniJakarta, kunciBulan, namaBulan, namaBulanPendek, rentangBulan, teksTube } from "./format";
import { ARSIP_BULANAN } from "./arsip";
import { hitungPerKode, menungguPasangan, ringkasCampaign, type JobCampaign } from "./campaign";

/** Job dikelompokkan berdasarkan tanggalSelesai; kalau belum selesai, tanggalMasuk (CLAUDE.md #6). */
export function whereBulan(kunci: string) {
  const { awal, akhir } = rentangBulan(kunci);
  return {
    OR: [
      { tanggalSelesai: { gte: awal, lt: akhir } },
      { tanggalSelesai: null, tanggalMasuk: { gte: awal, lt: akhir } },
    ],
  };
}

export const tanggalBulanJob = (j: { tanggalSelesai: Date | null; tanggalMasuk: Date }) =>
  j.tanggalSelesai ?? j.tanggalMasuk;

export async function pilihanBulan(): Promise<{ kunci: string; label: string }[]> {
  const [s, r] = await Promise.all([
    db.serviceJob.findMany({ select: { tanggalMasuk: true, tanggalSelesai: true } }),
    db.repairJob.findMany({ select: { tanggalMasuk: true, tanggalSelesai: true } }),
  ]);
  const set = new Set<string>([kunciBulan(hariIniJakarta())]);
  for (const j of [...s, ...r]) set.add(kunciBulan(tanggalBulanJob(j)));
  return [...set]
    .sort()
    .reverse()
    .map((kunci) => ({ kunci, label: namaBulan(kunci) }));
}

/**
 * Bulan dari query string. Tanpa query: bulan berjalan, atau bulan yang lebih baru kalau sudah ada job di sana,
 * jadi dashboard otomatis pindah begitu bulan berganti (walau belum ada job).
 * `bulanBerjalan: false` = bulan terbaru yang punya data (dipakai Laporan, yang biasanya membahas bulan yang sudah lewat).
 */
export async function tentukanBulan(param: string | undefined, opsi: { bulanBerjalan?: boolean } = {}): Promise<string> {
  if (param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param)) return param;
  const [s, r] = await Promise.all([
    db.serviceJob.findFirst({ orderBy: { tanggalMasuk: "desc" }, select: { tanggalMasuk: true, tanggalSelesai: true } }),
    db.repairJob.findFirst({ orderBy: { tanggalMasuk: "desc" }, select: { tanggalMasuk: true, tanggalSelesai: true } }),
  ]);
  const kandidat = [s, r].filter(Boolean).map((j) => kunciBulan(tanggalBulanJob(j!)));
  const terbaru = kandidat.sort().reverse()[0];
  const sekarang = kunciBulan(hariIniJakarta());
  if (opsi.bulanBerjalan === false) return kandidat.includes(sekarang) ? sekarang : (terbaru ?? sekarang);
  return terbaru && terbaru > sekarang ? terbaru : sekarang;
}

export async function servisBulan(kunci: string) {
  return db.serviceJob.findMany({
    where: whereBulan(kunci),
    include: { pj: true, marketing: true, rate: { include: { ratePeriod: true } }, customer: { include: { instansi: true } } },
    orderBy: [{ tanggalMasuk: "desc" }, { createdAt: "desc" }],
  });
}

export async function reparasiBulan(kunci: string) {
  return db.repairJob.findMany({
    where: whereBulan(kunci),
    include: { customer: { include: { instansi: true } } },
    orderBy: [{ tanggalMasuk: "desc" }, { createdAt: "desc" }],
  });
}

export type ServisRow = Awaited<ReturnType<typeof servisBulan>>[number];
export type ReparasiRow = Awaited<ReturnType<typeof reparasiBulan>>[number];

// ------------------------------------------------------------------ rekap mingguan

const HARI = 86_400_000;

/** Senin sebagai awal minggu (sheet lama: minggu 31 Agu – 6 Sep). */
export function awalMinggu(d: Date): Date {
  const mundur = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - mundur * HARI);
}

export type BarisMinggu = {
  nomor: number;
  awal: Date;
  akhir: Date;
  gaming: number;
  work: number;
  cleaning: number;
  macbook: number;
  total: ReturnType<typeof jumlahkanServis>;
};

export function rekapMingguan(kunci: string, jobs: ServisRow[]): BarisMinggu[] {
  const { awal, akhir } = rentangBulan(kunci);
  const hariTerakhir = new Date(akhir.getTime() - HARI);
  const minggu: BarisMinggu[] = [];
  for (let m = awalMinggu(awal); m <= hariTerakhir; m = new Date(m.getTime() + 7 * HARI)) {
    const selesai = new Date(m.getTime() + 6 * HARI);
    const isi = jobs.filter((j) => {
      const t = tanggalBulanJob(j).getTime();
      return t >= m.getTime() && t <= selesai.getTime();
    });
    minggu.push({
      nomor: minggu.length + 1,
      awal: m,
      akhir: selesai,
      gaming: isi.filter((j) => j.tipe === "GAMING").length,
      work: isi.filter((j) => j.tipe === "WORK").length,
      cleaning: isi.filter((j) => j.tipe === "CLEANING").length,
      macbook: isi.filter((j) => j.tipe === "REPASTE_MACBOOK").length,
      total: jumlahkanServis(isi),
    });
  }
  return minggu;
}

// ------------------------------------------------------------------ bagi hasil per orang

export type BarisBagiHasil = {
  kunci: string;
  personId: string | null;
  nama: string;
  kategori: "PEKERJA" | "MARKETING" | "MANAJEMEN";
  jumlahJob: number;
  jumlah: number;
  dibayarAt: Date | null;
};

/** Manajemen belum punya penerima di schema; dipegang oleh pemilik (nama = ADMIN_NAMA). */
export async function bagiHasilBulan(kunci: string, jobs: ServisRow[]) {
  const pemilikNama = process.env.ADMIN_NAMA ?? "";
  const pemilik = pemilikNama ? await db.person.findUnique({ where: { nama: pemilikNama } }) : null;
  const payouts = await db.payout.findMany({ where: { periode: kunci } });
  const dibayar = new Map(payouts.map((p) => [`${p.personId}|${p.kategori}`, p]));

  const peta = new Map<string, BarisBagiHasil>();
  const tambah = (
    personId: string | null,
    nama: string,
    kategori: BarisBagiHasil["kategori"],
    jumlah: number,
  ) => {
    const k = `${personId ?? "?"}|${kategori}`;
    const row =
      peta.get(k) ??
      ({
        kunci: k,
        personId,
        nama,
        kategori,
        jumlahJob: 0,
        jumlah: 0,
        dibayarAt: personId ? (dibayar.get(k)?.dibayarAt ?? null) : null,
      } satisfies BarisBagiHasil);
    row.jumlahJob += 1;
    row.jumlah += jumlah;
    peta.set(k, row);
  };

  for (const j of jobs) {
    if (j.status === "BATAL") continue;
    tambah(j.pjId, j.pj.nama, "PEKERJA", j.sharePekerja);
    if (j.marketingId && j.marketing) tambah(j.marketingId, j.marketing.nama, "MARKETING", j.shareMarketing);
    else if (j.shareMarketing > 0) tambah(null, "Tidak terlacak", "MARKETING", j.shareMarketing);
    tambah(pemilik?.id ?? null, pemilik?.nama ?? "Manajemen", "MANAJEMEN", j.shareManajemen);
  }

  const urut = { PEKERJA: 0, MARKETING: 1, MANAJEMEN: 2 } as const;
  return [...peta.values()].sort(
    (a, b) => urut[a.kategori] - urut[b.kategori] || b.jumlah - a.jumlah,
  );
}


// ------------------------------------------------------------------ konsistensi tarif

export const periodeNormal = (nama: string) => /^[A-Za-z]+ \d{4}$/.test(nama);

/** Tarif yang pembagiannya melebihi keuntungan, atau harga turun tapi jatah belum ikut turun. */
export async function peringatanTarif(): Promise<{ periodeId: string; teks: string }[]> {
  const hasil: { periodeId: string; teks: string }[] = [];
  const periode = await db.ratePeriod.findMany({ include: { rates: true }, orderBy: { mulai: "desc" } });
  const nm = (t: string) => NAMA_TIPE[t as Tipe] ?? t;
  for (const p of periode) {
    for (const r of p.rates) {
      const { shareLab } = hitungBagiHasil({ jumlah: r.hargaServis, ...r });
      if (shareLab < 0) hasil.push({ periodeId: p.id, teks: `Tarif "${p.nama}" ${nm(r.tipe)}: pembagian melebihi keuntungan (Kas Lab ${shareLab})` });
    }
  }
  const normal = periode.filter((p) => periodeNormal(p.nama));
  const aktif = normal.find((p) => p.aktif);
  const sebelum = aktif ? normal.find((p) => p.mulai < aktif.mulai) : undefined;
  if (aktif && sebelum) {
    for (const r of aktif.rates) {
      const lama = sebelum.rates.find((x) => x.tipe === r.tipe);
      if (!lama) continue;
      const samaShare =
        r.shareMarketing === lama.shareMarketing &&
        r.sharePekerja === lama.sharePekerja &&
        r.shareManajemen === lama.shareManajemen;
      if (r.hargaServis < lama.hargaServis && samaShare) {
        const labBaru = hitungBagiHasil({ jumlah: r.hargaServis, ...r }).shareLab;
        const labLama = hitungBagiHasil({ jumlah: lama.hargaServis, ...lama }).shareLab;
        hasil.push({
          periodeId: aktif.id,
          teks: `Harga ${aktif.nama} ${nm(r.tipe)} turun Rp ${(lama.hargaServis - r.hargaServis).toLocaleString("id-ID")} dari ${sebelum.nama}, tapi jatah marketing, pekerja, dan manajemen belum ikut turun. Kas Lab turun ${labLama.toLocaleString("id-ID")} → ${labBaru.toLocaleString("id-ID")}.`,
        });
      }
    }
  }
  return hasil;
}

// ------------------------------------------------------------------ anomali ("Perlu dicek")

export async function cekAnomali(kunci: string, servis: ServisRow[], reparasi: ReparasiRow[]) {
  const temuan: string[] = [];

  for (const j of servis) {
    const { shareLab } = hitungBagiHasil(j);
    if (shareLab < 0) {
      temuan.push(`${j.modelLaptop} (${j.tanggalMasuk.toISOString().slice(0, 10)}): Kas Lab negatif ${shareLab}, pembagian melebihi keuntungan`);
    }
  }

  const persen = new Set(reparasi.map((r) => r.persenKasLab));
  if (persen.size > 1) {
    temuan.push(`Reparasi ${namaBulan(kunci)} memakai Kas Lab ${[...persen].sort().join("% dan ")}% dalam satu bulan`);
  }

  const tarif = await peringatanTarif();
  temuan.push(...tarif.map((t) => t.teks));
  return temuan;
}

// ------------------------------------------------------------------ ringkasan bulan

/** Uang masuk: baru dihitung setelah job Selesai DAN lunas. Dipakai untuk total, bagi hasil, dan rekap. */
export const terealisasi = (j: { status: string; lunas: boolean }) => j.status === "SELESAI" && j.lunas;

/** Tagihan: sedang dikerjakan, atau selesai tapi belum lunas. Booking dan Batal tidak termasuk. */
export const tagihan = (j: { status: string; lunas: boolean }) =>
  j.status === "DIKERJAKAN" || (j.status === "SELESAI" && !j.lunas);

export async function ringkasanBulan(kunci: string) {
  const [servis, reparasi] = await Promise.all([servisBulan(kunci), reparasiBulan(kunci)]);
  // aktifServis/aktifRep = yang sudah jadi uang masuk (selesai & lunas). Sisanya yang berjalan masuk tagihan.
  const aktifServis = servis.filter(terealisasi);
  const aktifRep = reparasi.filter(terealisasi);
  const tagServis = servis.filter(tagihan);
  const tagRep = reparasi.filter(tagihan);
  const s = jumlahkanServis(aktifServis);
  const r = jumlahkanReparasi(aktifRep);
  const tag = {
    jumlah: tagServis.reduce((a, j) => a + j.jumlah, 0) + tagRep.reduce((a, j) => a + j.jumlah, 0),
    job: tagServis.length + tagRep.length,
  };
  return { servis, reparasi, aktifServis, aktifRep, tagServis, tagRep, tag, s, r };
}

export type PembandingBulan = {
  kunciLalu: string;
  pemasukan: number;
  laba: number;
  /** Arsip PDF tidak mencatat Kas Lab, jadi null kalau pembandingnya dari arsip. */
  kasLab: number | null;
  sumber: "db" | "arsip";
};

/**
 * Angka bulan sebelumnya untuk kartu dashboard. Dari job kalau bulan itu punya uang masuk,
 * kalau tidak dari arsip laporan PDF (Agustus dan September 2026). Null kalau dua-duanya kosong.
 */
export async function pembandingBulanLalu(kunci: string): Promise<PembandingBulan | null> {
  const kunciLalu = geserBulan(kunci, -1);
  const { s, r } = await ringkasanBulan(kunciLalu);
  const pemasukan = s.uangMasuk + r.omzet;
  if (pemasukan > 0) {
    return { kunciLalu, pemasukan, laba: s.keuntunganBersih + r.keuntungan, kasLab: s.lab + r.kasLab, sumber: "db" };
  }
  const a = ARSIP_BULANAN.find((x) => x.kunci === kunciLalu);
  return a ? { kunciLalu, pemasukan: a.pemasukan, laba: a.laba, kasLab: null, sumber: "arsip" } : null;
}

/** Sisa jatah pasta per jenis (Gaming, Work). Jatah dipakai dari lot tertua; `jobPerTube` diambil dari lot terbaru. */
export async function stokPasta() {
  const lots = await db.pastaLot.findMany();
  return (["GAMING", "WORK"] as const).map((tipe) => {
    const l = lots.filter((x) => x.tipe === tipe);
    const ref = [...l].sort((a, b) => +b.tanggal - +a.tanggal)[0];
    const sisa = l.reduce((a, x) => a + x.sisaJob, 0);
    const perTube = ref?.jobPerTube ?? 0;
    return { tipe, nama: NAMA_TIPE[tipe], sisa, perTube, tubeTeks: teksTube(sisa, perTube), tipis: sisa <= (perTube || 3) };
  });
}

// ------------------------------------------------------------------ campaign Ajak Teman

/** Jumlah job (selain Batal) per kode pasangan, lintas bulan. Dua job satu pasangan bisa selesai di bulan berbeda. */
export async function pasanganPerKode() {
  const rows = await db.serviceJob.findMany({
    where: { referralKode: { not: null } },
    select: { referralKode: true, status: true },
  });
  return hitungPerKode(rows);
}

/**
 * Bagian campaign untuk rekap dan dashboard. Null kalau bulan itu tidak punya job campaign.
 * Jumlah job dan diskon: semua job campaign selain Batal. Kas Lab: hanya yang selesai & lunas, sama seperti angka Kas Lab lain.
 */
export async function ringkasanCampaign(servis: ServisRow[], aktifServis: ServisRow[]) {
  const jobs = servis.filter((j) => j.rate.ratePeriod.campaign && j.status !== "BATAL");
  if (jobs.length === 0) return null;

  const [perKode, periode] = await Promise.all([
    pasanganPerKode(),
    db.ratePeriod.findMany({ where: { campaign: true }, include: { acuan: { include: { rates: true } } } }),
  ]);
  const acuan = new Map(periode.map((p) => [p.id, p.acuan?.rates ?? []]));
  const untukRekap = (j: ServisRow): JobCampaign => ({
    tipe: j.tipe,
    jumlah: j.jumlah,
    shareMarketing: j.shareMarketing,
    sharePekerja: j.sharePekerja,
    shareManajemen: j.shareManajemen,
    acuan: acuan.get(j.rate.ratePeriodId)?.find((r) => r.tipe === j.tipe) ?? null,
  });

  const kode = new Set(jobs.map((j) => j.referralKode).filter((k): k is string => !!k));
  const selesaiCampaign = aktifServis.filter((j) => j.rate.ratePeriod.campaign);
  const selesaiNormal = aktifServis.filter((j) => !j.rate.ratePeriod.campaign);
  return {
    ...ringkasCampaign(jobs.map(untukRekap)),
    pasanganLengkap: [...kode].filter((k) => (perKode.get(k) ?? 0) >= 2).length,
    menunggu: jobs.filter((j) => menungguPasangan(j, perKode)).length,
    kasLabCampaign: jumlahkanServis(selesaiCampaign).lab,
    kasLabNormal: jumlahkanServis(selesaiNormal).lab,
    selesaiCampaign: selesaiCampaign.length,
    selesaiNormal: selesaiNormal.length,
  };
}

/** Semua tagihan yang masih berjalan (lintas bulan): dikerjakan, atau selesai tapi belum lunas. */
export async function tagihanSemua() {
  const where = { OR: [{ status: "DIKERJAKAN" as const }, { status: "SELESAI" as const, lunas: false }] };
  const [s, r] = await Promise.all([
    db.serviceJob.findMany({ where, orderBy: { tanggalMasuk: "asc" } }),
    db.repairJob.findMany({ where, orderBy: { tanggalMasuk: "asc" } }),
  ]);
  return {
    total: s.reduce((a, j) => a + j.jumlah, 0) + r.reduce((a, j) => a + j.jumlah, 0),
    daftar: [...s.map((j) => j.modelLaptop), ...r.map((j) => j.modelLaptop)],
  };
}

/**
 * Pemasukan & keuntungan per bulan, dari bulan pertama yang punya data sampai bulan ini.
 * Bulan sebelum ERP (Agu–Sep 2026) diisi dari arsip laporan, bulan lain dijumlahkan dari job.
 */
export async function riwayatBulanan() {
  const kunciDb = (await pilihanBulan()).map((o) => o.kunci);
  const arsip = new Map(ARSIP_BULANAN.map((a) => [a.kunci, a]));
  const semua = [...kunciDb, ...arsip.keys()].sort();
  const dariDb = new Map(
    await Promise.all(
      kunciDb.map(async (k) => {
        const { s, r } = await ringkasanBulan(k);
        return [k, { pemasukan: s.uangMasuk + r.omzet, laba: s.keuntunganBersih + r.keuntungan }] as const;
      }),
    ),
  );
  const hasil: { kunci: string; label: string; pemasukan: number; laba: number; arsip: boolean }[] = [];
  for (let k = semua[0]; k <= semua[semua.length - 1]; k = geserBulan(k, 1)) {
    const db_ = dariDb.get(k);
    const a = arsip.get(k);
    const isi = db_ ?? a ?? { pemasukan: 0, laba: 0 };
    hasil.push({ kunci: k, label: namaBulanPendek(k), pemasukan: isi.pemasukan, laba: isi.laba, arsip: !db_ && !!a });
  }
  return hasil;
}

export { geserBulan, hitungReparasi };
