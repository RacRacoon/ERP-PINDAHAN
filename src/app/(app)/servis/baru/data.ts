import { db } from "@/lib/db";
import { daftarInstansi } from "@/lib/customer";
import { menungguPasangan } from "@/lib/campaign";
import { pasanganPerKode, peringatanTarif } from "@/lib/queries";

/** Data pilihan untuk form servis (dipakai halaman baru dan edit). */
export async function muatDataForm() {
  const [periode, orang, peringatan, instansiList, bercode, perKode] = await Promise.all([
    db.ratePeriod.findMany({ include: { rates: true }, orderBy: [{ aktif: "desc" }, { mulai: "desc" }] }),
    db.person.findMany({ where: { aktif: true }, orderBy: { nama: "asc" } }),
    peringatanTarif(),
    daftarInstansi(),
    db.serviceJob.findMany({
      where: { referralKode: { not: null }, status: { not: "BATAL" } },
      include: { rate: true, customer: true },
      orderBy: { tanggalMasuk: "desc" },
    }),
    pasanganPerKode(),
  ]);

  return {
    instansiList,
    periode: periode.map((p) => ({
      id: p.id,
      nama: p.nama,
      aktif: p.aktif,
      campaign: p.campaign,
      mulai: p.mulai.toISOString().slice(0, 10),
      selesai: p.selesai ? p.selesai.toISOString().slice(0, 10) : null,
      rates: p.rates.map((r) => ({
        tipe: r.tipe,
        hargaServis: r.hargaServis,
        modalPasta: r.modalPasta,
        ongkir: r.ongkir,
        shareMarketing: r.shareMarketing,
        sharePekerja: r.sharePekerja,
        shareManajemen: r.shareManajemen,
      })),
      peringatan: peringatan.filter((x) => x.periodeId === p.id).map((x) => x.teks),
    })),
    // Job campaign yang masih sendirian: calon pasangan untuk job campaign berikutnya.
    menunggu: bercode
      .filter((j) => menungguPasangan(j, perKode))
      .map((j) => ({
        id: j.id,
        ratePeriodId: j.rate.ratePeriodId,
        peran: j.referralPeran,
        label: `${j.modelLaptop} · ${j.customer?.nama ?? "tanpa nama"}`,
      })),
    orang: orang.map((o) => ({ id: o.id, nama: o.nama, peran: o.peran })),
  };
}
