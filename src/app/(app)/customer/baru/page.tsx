import { daftarInstansi } from "@/lib/customer";
import { PageHeader } from "@/components/ui";
import { FormCustomer } from "../form";

export default async function CustomerBaru() {
  const instansiList = await daftarInstansi();
  return (
    <>
      <PageHeader title="Customer baru" />
      <div className="rise rise-1 max-w-[560px]">
        <FormCustomer instansiList={instansiList} />
      </div>
    </>
  );
}
