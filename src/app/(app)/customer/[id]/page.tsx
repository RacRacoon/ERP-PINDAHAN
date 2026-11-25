import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AtSign, MessageCircle } from "lucide-react";
import { daftarInstansi } from "@/lib/customer";
import { detailCustomer } from "@/lib/customer-queries";
import { angka, rupiah, tglPendek } from "@/lib/format";
import { tampilIg, tampilWa } from "@/lib/kontak";
import { Badge, Card, Kpi, StatusBadge, Th } from "@/components/ui";
import { ConfirmForm } from "@/components/confirm-form";
import { FormCustomer } from "../form";
import { hapusCustomer } from "../actions";

export default async function DetailCustomer({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [d, instansiList] = await Promise.all([detailCustomer(id), daftarInstansi()]);
  if (!d) notFound();
  const { c, riwayat, order, belanja, terakhir } = d;

  return (
    <>
      <div className="rise mb-6">
        <Link href="/customer" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-ink">
          <ArrowLeft className="size-4" /> Semua customer
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[1.9rem] font-semibold leading-tight tracking-tight">{c.nama}</h1>
          {c.instansi && (
            <Link href={`/instansi/${c.instansi.id}`}><Badge tone="sky">{c.instansi.nama}</Badge></Link>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1">
          {c.noWa && (
            <a
              href={`https://wa.me/${c.noWa}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-mono text-sm text-muted transition hover:text-accent"
            >
              <MessageCircle className="size-4" /> {tampilWa(c.noWa)}
            </a>
          )}
          {c.instagram && (
            <a
              href={`https://instagram.com/${c.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 font-mono text-sm text-muted transition hover:text-accent"
            >
              <AtSign className="size-4" /> {tampilIg(c.instagram).slice(1)}
            </a>
          )}
        </div>
      </div>

      <div className="rise rise-1 grid items-start gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Kpi label="Order" value={String(order)} />
            <Kpi label="Total belanja" value={rupiah(belanja)} tone="accent" />
            <Kpi label="Terakhir" value={terakhir ? `${tglPendek(terakhir)} ${terakhir.getUTCFullYear()}` : "—"} />
          </div>

          <Card className="overflow-hidden">
            <div className="px-6 py-5">
              <h2 className="font-semibold">Riwayat order</h2>
            </div>
            <div className="overflow-x-auto border-t border-line">
              <table className="w-full min-w-[560px] text-[0.9rem]">
                <thead>
                  <tr>
                    <Th>Tanggal</Th>
                    <Th>Order</Th>
                    <Th>Status</Th>
                    <Th right>Jumlah</Th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.map((r) => (
                    <tr key={r.jenis + r.id} className={`border-t border-line transition-colors hover:bg-panel2/50 ${r.status === "BATAL" ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3.5 font-mono text-[0.82rem] text-muted">{tglPendek(r.tanggal)}</td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={r.status === "BATAL" ? `/${r.jenis}` : `/${r.jenis}/${r.id}/edit`}
                          className="font-medium hover:text-accent"
                        >
                          {r.model}
                        </Link>
                        <div className="text-[0.8rem] text-muted">{r.jenis === "servis" ? "Servis pasta" : "Reparasi hardware"}</div>
                      </td>
                      <td className="px-4 py-3.5"><StatusBadge status={r.status} lunas={r.lunas} /></td>
                      <td className="num px-4 py-3.5 font-medium">{angka(r.jumlah)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {riwayat.length === 0 && <div className="px-6 py-10 text-center text-muted">Belum ada order.</div>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <FormCustomer
            key={c.id + (c.noWa ?? "") + (c.instagram ?? "")}
            instansiList={instansiList}
            edit={{ id: c.id, nama: c.nama, noWa: c.noWa ? tampilWa(c.noWa) : "", instagram: c.instagram ? tampilIg(c.instagram) : "", instansi: c.instansi?.nama ?? "", catatan: c.catatan ?? "" }}
          />
          {riwayat.length === 0 && (
            <ConfirmForm action={hapusCustomer.bind(null, c.id)} message={`Hapus customer ${c.nama}?`}>
              <button className="w-full rounded-xl border border-line py-2.5 text-sm text-muted transition hover:border-danger hover:text-danger">
                Hapus customer
              </button>
            </ConfirmForm>
          )}
        </div>
      </div>
    </>
  );
}
