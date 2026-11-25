import { hariIniJakarta, isoTanggal } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { FormServis } from "./form";
import { muatDataForm } from "./data";

export default async function ServisBaru() {
  const data = await muatDataForm();

  return (
    <>
      <PageHeader title="Servis baru" />
      <div className="rise rise-1">
        <FormServis {...data} hariIni={isoTanggal(hariIniJakarta())} />
      </div>
    </>
  );
}
