import { daftarInstansi } from "@/lib/customer";
import { hariIniJakarta, isoTanggal } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { FormReparasi } from "./form";

export default async function ReparasiBaru() {
  const instansiList = await daftarInstansi();
  return (
    <>
      <PageHeader title="Reparasi baru" sub="dikerjakan Reparium, B4 ambil selisih harga" />
      <div className="rise rise-1">
        <FormReparasi hariIni={isoTanggal(hariIniJakarta())} instansiList={instansiList} />
      </div>
    </>
  );
}
