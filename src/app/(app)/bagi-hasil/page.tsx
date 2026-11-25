import { angka, inisial, namaBulan, rupiah } from "@/lib/format";
import { bagiHasilBulan, pilihanBulan, ringkasanBulan, tentukanBulan } from "@/lib/queries";
import { Badge, Card, Kpi, PageHeader, Th } from "@/components/ui";
import { MonthSelect } from "@/components/month-select";
import { tandaiLunas } from "./actions";

const KAT = {
  PEKERJA: { label: "Pekerja", tone: "gaming" },
  MARKETING: { label: "Marketing", tone: "violet" },
  MANAJEMEN: { label: "Manajemen", tone: "sky" },
} as const;

export default async function BagiHasilPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const kunci = await tentukanBulan((await searchParams).bulan);
  const [opsi, d] = await Promise.all([pilihanBulan(), ringkasanBulan(kunci)]);
  const baris = await bagiHasilBulan(kunci, d.aktifServis);
  const { s, r } = d;

  const orangDi = (k: keyof typeof KAT) => new Set(baris.filter((b) => b.kategori === k && b.personId).map((b) => b.nama));
  const totalOrang = baris.reduce((a, b) => a + b.jumlah, 0);
  const sudah = baris.filter((b) => b.dibayarAt).reduce((a, b) => a + b.jumlah, 0);
  const manageRep = d.aktifRep.map((x) => ({ x, manage: x.jumlah - x.modalReparium - Math.round(((x.jumlah - x.modalReparium) * x.persenKasLab) / 100) }));
  const totalManage = manageRep.reduce((a, b) => a + b.manage, 0);

  return (
    <>
      <PageHeader title="Bagi hasil">
        <MonthSelect value={kunci} options={opsi} />
      </PageHeader>

      <div className="rise rise-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Pekerja" value={rupiah(s.pekerja)} sub={`${orangDi("PEKERJA").size} orang · ${s.jumlahJob} job`} />
        <Kpi label="Manajemen" value={rupiah(s.manajemen)} sub={[...orangDi("MANAJEMEN")].join(", ") || "—"} />
        <Kpi label="Marketing" value={rupiah(s.marketing)} sub={[...orangDi("MARKETING")].join(", ") || "—"} />
        <Kpi label="Kas Lab" value={rupiah(s.lab + r.kasLab)} tone="accent" sub="servis + reparasi" />
      </div>

      <Card className="rise rise-2 mt-4 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-5">
          <h2 className="font-semibold">Yang harus dibayar</h2>
          <span className="text-sm text-muted">dari job selesai &amp; lunas{d.tag.job ? ` · tagihan ${rupiah(d.tag.jumlah)} belum dihitung` : ""}</span>
        </div>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[720px] text-[0.9rem]">
            <thead>
              <tr>
                <Th>Nama</Th>
                <Th>Peran</Th>
                <Th right>Job</Th>
                <Th right>Jumlah</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => {
                const k = KAT[b.kategori];
                const bisa = !!b.personId;
                return (
                  <tr key={b.kunci} className={`border-t border-line ${bisa ? "hover:bg-panel2/50" : "bg-[#211c10]"}`}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`grid size-9 place-items-center rounded-lg text-xs font-bold ${bisa ? "bg-panel2 text-muted" : "border border-dashed border-amber text-amber"}`}>
                          {bisa ? inisial(b.nama) : "?"}
                        </span>
                        <span className={`font-medium ${bisa ? "" : "text-amber"}`}>{b.nama}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5"><Badge tone={k.tone}>{k.label}</Badge></td>
                    <td className="num px-4 py-3.5 text-muted">{b.jumlahJob}</td>
                    <td className="num px-4 py-3.5 font-semibold">{angka(b.jumlah)}</td>
                    <td className="px-4 py-3.5">
                      {!bisa ? <span className="text-sm text-amber">tidak ada penerima</span> : b.dibayarAt ? <Badge tone="lunas">Dibayar</Badge> : <Badge tone="amber">Belum dibayar</Badge>}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {bisa && (
                        <form action={tandaiLunas}>
                          <input type="hidden" name="periode" value={kunci} />
                          <input type="hidden" name="personId" value={b.personId!} />
                          <input type="hidden" name="kategori" value={b.kategori} />
                          <input type="hidden" name="jumlah" value={b.jumlah} />
                          {b.dibayarAt && <input type="hidden" name="batal" value="1" />}
                          <button className="rounded-lg border border-line bg-panel2 px-3.5 py-1.5 text-sm transition hover:border-accent hover:text-accent">
                            {b.dibayarAt ? "Batalkan" : "Tandai lunas"}
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
              {baris.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-muted">Belum ada job di bulan ini.</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t border-line">
                <td colSpan={3} className="px-4 py-4 font-semibold">Total dibayar ke orang</td>
                <td className="num px-4 py-4 font-bold">{angka(totalOrang)}</td>
                <td colSpan={2} className="px-4 py-4 text-right font-mono text-xs text-muted">
                  dibayar {angka(sudah)} · sisanya Rp {angka(s.lab)} masuk Kas Lab
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <div className="rise rise-3 mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Kas Lab bulan ini</h2>
          <div className="space-y-2 text-[0.92rem]">
            <div className="flex justify-between"><span className="text-muted">Dari servis pasta</span><span className="num">{angka(s.lab)}</span></div>
            <div className="flex justify-between"><span className="text-muted">Dari reparasi{d.aktifRep[0] ? ` · ${d.aktifRep[0].persenKasLab}%` : ""}</span><span className="num">{angka(r.kasLab)}</span></div>
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">Masuk {namaBulan(kunci).split(" ")[0]}</span>
            <span className="num text-[1.7rem] font-bold text-accent">{angka(s.lab + r.kasLab)}</span>
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Bagian Manage (reparasi)</h2>
          <div className="space-y-2 text-[0.92rem]">
            {manageRep.map(({ x, manage }) => (
              <div key={x.id} className="flex justify-between">
                <span className="text-muted">{x.modelLaptop} · {x.transfer ? "sudah transfer" : "belum"}</span>
                <span className={`num ${x.transfer ? "" : "text-amber"}`}>{angka(manage)}</span>
              </div>
            ))}
            {manageRep.length === 0 && <p className="text-muted">Tidak ada reparasi.</p>}
          </div>
          <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
            <span className="font-semibold">Total</span>
            <span className="num text-[1.7rem] font-bold">{angka(totalManage)}</span>
          </div>
        </Card>
      </div>
    </>
  );
}
