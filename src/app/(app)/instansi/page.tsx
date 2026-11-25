import Link from "next/link";
import { daftarInstansiRingkas } from "@/lib/customer-queries";
import { angka, tglPendek } from "@/lib/format";
import { ButtonLink, Card, Empty, PageHeader, Th } from "@/components/ui";
import { CustomerTabs } from "@/components/customer-tabs";

export default async function InstansiPage() {
  const rows = await daftarInstansiRingkas();
  rows.sort((a, b) => b.belanja - a.belanja || a.nama.localeCompare(b.nama));

  return (
    <>
      <PageHeader title="Customer" sub={`${rows.length} instansi`} aside={<ButtonLink href="/instansi/baru">Instansi baru</ButtonLink>}>
        <CustomerTabs aktif="instansi" />
      </PageHeader>

      <Card className="rise rise-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-[0.9rem]">
            <thead>
              <tr>
                <Th>Instansi</Th>
                <Th>Jenis</Th>
                <Th right>Customer</Th>
                <Th right>Order</Th>
                <Th right>Total belanja</Th>
                <Th right>Terakhir</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => (
                <tr key={i.id} className="border-t border-line transition-colors hover:bg-panel2/50">
                  <td className="px-4 py-3.5">
                    <Link href={`/instansi/${i.id}`} className="font-medium hover:text-accent">{i.nama}</Link>
                    {i.catatan && <div className="max-w-[320px] truncate text-[0.8rem] text-muted">{i.catatan}</div>}
                  </td>
                  <td className="px-4 py-3.5 capitalize text-muted">{i.jenis ?? "—"}</td>
                  <td className="num px-4 py-3.5">
                    <Link href={`/customer?instansi=${i.id}`} className="hover:text-accent">{i.customer}</Link>
                  </td>
                  <td className="num px-4 py-3.5">{i.order}</td>
                  <td className="num px-4 py-3.5 font-semibold">{angka(i.belanja)}</td>
                  <td className="num px-4 py-3.5 text-muted">{i.terakhir ? `${tglPendek(i.terakhir)} ${i.terakhir.getUTCFullYear()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <Empty>Belum ada instansi. Isi kolom Instansi saat membuat servis, atau tambahkan lewat tombol di atas.</Empty>}
      </Card>
    </>
  );
}
