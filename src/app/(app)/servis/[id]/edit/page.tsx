import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { kontakUtama } from "@/lib/kontak";
import { hariIniJakarta, isoTanggal } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { FormServis, type DataEdit } from "../../baru/form";
import { muatDataForm } from "../../baru/data";

export default async function EditServis({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, data] = await Promise.all([
    db.serviceJob.findUnique({ where: { id }, include: { rate: true, customer: { include: { instansi: true } } } }),
    muatDataForm(),
  ]);
  if (!job) notFound();
  if (job.status === "BATAL") redirect("/servis");

  const edit: DataEdit = {
    id: job.id,
    ratePeriodId: job.rate.ratePeriodId,
    tipe: job.tipe,
    tanggalMasuk: isoTanggal(job.tanggalMasuk),
    tanggalSelesai: job.tanggalSelesai ? isoTanggal(job.tanggalSelesai) : "",
    modelLaptop: job.modelLaptop,
    keluhan: job.keluhan ?? "",
    catatan: job.catatan ?? "",
    customerNama: job.customer?.nama ?? "",
    customerKontak: job.customer ? kontakUtama(job.customer) : "",
    customerInstansi: job.customer?.instansi?.nama ?? "",
    pjId: job.pjId,
    marketingId: job.marketingId ?? "",
    pembayaran: job.pembayaran ?? "",
    status: job.status, // BATAL sudah di-redirect di atas
    lunas: job.lunas,
    jumlah: job.jumlah,
    modalPasta: job.modalPasta,
    ongkir: job.ongkir,
    shareMarketing: job.shareMarketing,
    sharePekerja: job.sharePekerja,
    shareManajemen: job.shareManajemen,
    referralKode: job.referralKode,
    referralPeran: job.referralPeran,
  };

  return (
    <>
      <PageHeader title="Edit servis" sub={job.modelLaptop} />
      <div className="rise rise-1">
        {/* key: form dibangun ulang kalau berpindah ke pesanan lain */}
        <FormServis key={job.id} {...data} hariIni={isoTanggal(hariIniJakarta())} edit={edit} />
      </div>
    </>
  );
}
