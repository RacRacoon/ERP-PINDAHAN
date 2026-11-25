import { PageHeader } from "@/components/ui";
import { FormInstansi } from "../form";

export default function InstansiBaru() {
  return (
    <>
      <PageHeader title="Instansi baru" />
      <div className="rise rise-1 max-w-[560px]">
        <FormInstansi />
      </div>
    </>
  );
}
