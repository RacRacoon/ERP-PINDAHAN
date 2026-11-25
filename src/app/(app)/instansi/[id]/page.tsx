import Link from "next/link";
import { daftarKontak } from "@/lib/kontak";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { detailInstansi } from "@/lib/customer-queries";
import { angka, rupiah, tglPendek } from "@/lib/format";
import { Card, Kpi, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { FormInstansi } from "../form";
import { hapusInstansi } from "../actions";

export default async function DetailInstansi({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await detailInstansi(id);
  if (!d) notFound();
  const { i, customers } = d;
  const order = customers.reduce((a, c) => a + c.order, 0);
  const belanja = customers.reduce((a, c) => a + c.belanja, 0);

  return (
    <>
      <div className="rise mb-6">
        <Link href="/instansi" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" /> Semua instansi
        </Link>
        <h1 className="text-[1.9rem] font-semibold leading-tight tracking-tight">{i.nama}</h1>
        {i.jenis && <p className="mt-1 text-[0.95rem] capitalize text-muted">{i.jenis}</p>}
      </div>

      <div className="rise rise-1 grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi label="Customer" value={String(customers.length)} />
            <Kpi label="Order" value={String(order)} />
            <Kpi label="Total belanja" value={rupiah(belanja)} tone="accent" />
          </div>

          <Card className="overflow-hidden">
            <div className="px-6 py-5">
              <h2 className="font-semibold">Customer di instansi ini</h2>
            </div>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[520px] text-[0.9rem]">
                <thead>
                  <tr>
                    <Th>Nama</Th>
                    <Th right>Order</Th>
                    <Th right>Total belanja</Th>
                    <Th right>Terakhir</Th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} className="border-t border-line transition-colors hover:bg-panel2/50">
                      <td className="px-4 py-3.5">
                        <Link href={`/customer/${c.id}`} className="font-medium hover:text-accent">{c.nama}</Link>
                        <div className="font-mono text-[0.78rem] text-muted">{daftarKontak(c).join(" · ")}</div>
                      </td>
                      <td className="num px-4 py-3.5">{c.order}</td>
                      <td className="num px-4 py-3.5 font-semibold">{angka(c.belanja)}</td>
                      <td className="num px-4 py-3.5 text-muted">{c.terakhir ? tglPendek(c.terakhir) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {customers.length === 0 && <div className="px-6 py-10 text-center text-muted">Belum ada customer di instansi ini.</div>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FormInstansi key={i.id + i.nama} edit={{ id: i.id, nama: i.nama, jenis: i.jenis ?? "", catatan: i.catatan ?? "" }} />
          {customers.length === 0 && (
            <ConfirmForm action={hapusInstansi.bind(null, i.id)} message={`Hapus instansi ${i.nama}?`}>
              <button className="w-full rounded-xl border border-line py-2.5 text-sm text-muted transition hover:border-danger hover:text-danger">
                Hapus instansi
              </button>
            </ConfirmForm>
          )}
        </div>
      </div>
    </>
  );
}
