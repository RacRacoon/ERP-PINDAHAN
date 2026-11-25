import Link from "next/link";
import { daftarKontak } from "@/lib/kontak";
import { Search, X } from "lucide-react";
import { db } from "@/lib/db";
import { daftarCustomer } from "@/lib/customer-queries";
import { angka, rupiah, tglPendek } from "@/lib/format";
import { ButtonLink, Card, Empty, Kpi, PageHeader, Th } from "@/components/ui";
import { CustomerTabs } from "@/components/customer-tabs";

export default async function CustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; instansi?: string }>;
}) {
  const sp = await searchParams;
  const [rows, semua, filterInstansi] = await Promise.all([
    daftarCustomer({ q: sp.q, instansiId: sp.instansi }),
    db.customer.count(),
    sp.instansi ? db.instansi.findUnique({ where: { id: sp.instansi } }) : null,
  ]);

  const berulang = rows.filter((c) => c.order >= 2).length;
  const belanja = rows.reduce((a, c) => a + c.belanja, 0);

  return (
    <>
      <PageHeader title="Customer" sub={`${semua} customer terdaftar`} aside={<ButtonLink href="/customer/baru">Customer baru</ButtonLink>}>
        <CustomerTabs aktif="customer" />
      </PageHeader>

      <div className="rise rise-1 grid gap-4 sm:grid-cols-3">
        <Kpi label={sp.q || sp.instansi ? "Customer (hasil filter)" : "Customer"} value={String(rows.length)} />
        <Kpi label="Pelanggan berulang" value={String(berulang)} />
        <Kpi label="Total belanja" value={rupiah(belanja)} tone="accent" />
      </div>

      <form className="rise rise-2 mt-4 flex flex-wrap items-center gap-3">
        {sp.instansi && <input type="hidden" name="instansi" value={sp.instansi} />}
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <input name="q" defaultValue={sp.q} placeholder="Cari nama, nomor WA, Instagram, atau instansi…" className="field !pl-10" />
        </div>
        {filterInstansi && (
          <Link
            href={sp.q ? `/customer?q=${encodeURIComponent(sp.q)}` : "/customer"}
            className="inline-flex items-center gap-2 rounded-xl border border-accent bg-[#12331f] px-3.5 py-2 text-sm"
          >
            Instansi: {filterInstansi.nama} <X className="size-3.5" />
          </Link>
        )}
        <button className="rounded-xl border border-line bg-panel px-4 py-2.5 text-sm transition hover:border-accent hover:text-accent">Cari</button>
      </form>

      <Card className="rise rise-3 mt-4 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-[0.9rem]">
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Instansi</Th>
                <Th right>Order</Th>
                <Th right>Total belanja</Th>
                <Th right>Terakhir</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-t border-line transition-colors hover:bg-panel2/50">
                  <td className="px-4 py-3.5">
                    <Link href={`/customer/${c.id}`} className="font-medium hover:text-accent">{c.nama}</Link>
                    <div className="font-mono text-[0.78rem] text-muted">{daftarKontak(c).join(" · ")}</div>
                  </td>
                  <td className="px-4 py-3.5">
                    {c.instansi ? (
                      <Link href={`/instansi/${c.instansi.id}`} className="text-muted transition hover:text-ink">{c.instansi.nama}</Link>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="num px-4 py-3.5">{c.order}</td>
                  <td className="num px-4 py-3.5 font-semibold">{angka(c.belanja)}</td>
                  <td className="num px-4 py-3.5 text-muted">{c.terakhir ? `${tglPendek(c.terakhir)} ${c.terakhir.getUTCFullYear()}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <Empty>{sp.q || sp.instansi ? "Tidak ada customer yang cocok." : "Belum ada customer. Tambahkan lewat tombol di atas, atau isi saat membuat servis."}</Empty>
        )}
      </Card>
    </>
  );
}
