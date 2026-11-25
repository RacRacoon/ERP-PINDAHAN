import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { kontakUtama } from "@/lib/kontak";
import { daftarInstansi } from "@/lib/customer";
import { hariIniJakarta, isoTanggal } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { FormReparasi, type DataEditReparasi } from "../../baru/form";

export default async function EditReparasi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [job, instansiList] = await Promise.all([
    db.repairJob.findUnique({ where: { id }, include: { customer: { include: { instansi: true } } } }),
    daftarInstansi(),
  ]);
  if (!job) notFound();
  if (job.status === "BATAL") redirect("/reparasi");

  const edit: DataEditReparasi = {
    id: job.id,
    tanggalMasuk: isoTanggal(job.tanggalMasuk),
    tanggalSelesai: job.tanggalSelesai ? isoTanggal(job.tanggalSelesai) : "",
    modelLaptop: job.modelLaptop,
    tipe: job.tipe ?? "",
    masalah: job.masalah,
    penyelesaian: job.penyelesaian ?? "",
    customerNama: job.customer?.nama ?? "",
    customerKontak: job.customer ? kontakUtama(job.customer) : "",
    customerInstansi: job.customer?.instansi?.nama ?? "",
    pembayaran: job.pembayaran ?? "",
    status: job.status, // BATAL sudah di-redirect di atas
    lunas: job.lunas,
    transfer: job.transfer,
    jumlah: job.jumlah,
    modalReparium: job.modalReparium,
    persenKasLab: job.persenKasLab,
  };

  return (
    <>
      <PageHeader title="Edit reparasi" sub={job.modelLaptop} />
      <div className="rise rise-1">
        <FormReparasi key={job.id} hariIni={isoTanggal(hariIniJakarta())} instansiList={instansiList} edit={edit} />
      </div>
    </>
  );
}
