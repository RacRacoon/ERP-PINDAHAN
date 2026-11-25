import { angka, namaBulan, persen, rupiah, tglPendek } from "@/lib/format";
import { hitungReparasi, jumlahkanReparasi } from "@/lib/hitung";
import { pilihanBulan, reparasiBulan, tagihan, tentukanBulan, terealisasi } from "@/lib/queries";
import { MonthSelect } from "@/components/month-select";
import { Badge, ButtonLink, Card, Empty, Kpi, PageHeader, Th, aksiIkon, aksiIkonBahaya, aksiTeks } from "@/components/ui";
import Link from "next/link";
import { FileText, Pencil, X } from "lucide-react";
import { ConfirmForm } from "@/components/confirm-form";
import { aktifkanReparasi, batalkanReparasi, hapusReparasi, ubahStatusReparasi } from "./actions";

const tombol = aksiTeks;
const tombolBahaya = `${aksiTeks} hover:!border-danger hover:!text-danger`;

export default async function ReparasiPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const kunci = await tentukanBulan((await searchParams).bulan);
  const [opsi, rows] = await Promise.all([pilihanBulan(), reparasiBulan(kunci)]);

  // Semua angka di halaman ini hanya untuk bulan yang dipilih. Job dikelompokkan berdasarkan tanggal selesai.
  const aktif = rows.filter(terealisasi);
  const tagList = rows.filter(tagihan);
  const tagJumlah = tagList.reduce((a, r) => a + r.jumlah, 0);
  const total = jumlahkanReparasi(aktif);
  const belumTf = aktif.filter((r) => !r.transfer);
  const manageTertahan = belumTf.reduce((a, r) => a + hitungReparasi(r).manage, 0);
  const pcts = [...new Set(rows.map((r) => r.persenKasLab))].sort((a, b) => a - b);
  const beda = pcts.length > 1;

  return (
    <>
      <PageHeader
        title="Reparasi hardware"
        sub="dikerjakan Reparium, B4 ambil selisih harga"
        aside={<ButtonLink href="/reparasi/baru">Reparasi baru</ButtonLink>}
      >
        <MonthSelect value={kunci} options={opsi} />
      </PageHeader>

      <div className="rise rise-1 mb-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label={`Omzet ${namaBulan(kunci).split(" ")[0]}`} value={rupiah(total.omzet)} sub={`${total.jumlahJob} unit · selesai & lunas`} />
        <Kpi label="Dibayar ke Reparium" value={rupiah(total.modal)} sub={`${persen(total.modal, total.omzet)}% dari omzet`} />
        <Kpi
          label="Keuntungan"
          value={rupiah(total.keuntungan)}
          sub={
            <span className={total.omzet > 0 && persen(total.keuntungan, total.omzet) < 15 ? "text-amber" : ""}>
              margin {total.omzet > 0 && persen(total.keuntungan, total.omzet) < 15 ? "tipis " : ""}
              {persen(total.keuntungan, total.omzet)}%
            </span>
          }
        />
        <Kpi label="Manage belum ditransfer" value={rupiah(manageTertahan)} tone={manageTertahan ? "amber" : "default"} sub={`${belumTf.length} job`} />
      </div>

      <Card className="rise rise-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-0 text-[0.9rem] md:min-w-[920px]">
            <thead>
              <tr>
                <Th>Masuk</Th>
                <Th>Laptop &amp; perbaikan</Th>
                <Th right className="hidden md:table-cell">Jumlah</Th>
                <Th right className="hidden md:table-cell">Reparium</Th>
                <Th right className="hidden md:table-cell">Untung</Th>
                <Th right className="hidden md:table-cell">Kas Lab</Th>
                <Th right className="hidden md:table-cell">Manage</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 && (
                <tr className="border-t border-line bg-bg/40">
                  <td colSpan={5} className="label-caps hidden px-4 py-3 !text-[0.72rem] !text-ink md:table-cell">{namaBulan(kunci)}</td>
                  <td colSpan={3} className="px-3 py-3 md:hidden">
                    <div className="label-caps !text-[0.72rem] !text-ink">{namaBulan(kunci)}</div>
                    <div className={`mt-0.5 font-mono text-xs ${beda ? "text-amber" : "text-muted"}`}>
                      bagi hasil {pcts.join("/")} / {pcts.map((x) => 100 - x).join("/")}
                      {beda && " — beda dalam satu bulan"}
                    </div>
                  </td>
                  <td colSpan={3} className={`hidden px-4 py-3 text-right font-mono text-xs md:table-cell ${beda ? "text-amber" : "text-muted"}`}>
                    bagi hasil {pcts.join("/")} / {pcts.map((x) => 100 - x).join("/")}
                    {beda && " — beda dalam satu bulan"}
                  </td>
                </tr>
              )}
                    {rows.map((r) => {
                      const h = hitungReparasi(r);
                      const tuntas = r.status === "SELESAI";
                      return (
                        <tr key={r.id} className={`border-t border-line transition-colors hover:bg-panel2/50 ${r.status === "BATAL" ? "opacity-50" : r.status === "DIKERJAKAN" ? "bg-[#1c1a12]" : ""}`}>
                          <td className="px-4 py-3.5 font-mono text-[0.82rem] text-muted">{tglPendek(r.tanggalMasuk)}{r.invoice && <div className="text-[0.72rem] text-accent/80">#{r.invoice}</div>}</td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium">{r.modelLaptop}</div>
                            <div className="mt-0.5 font-mono text-[0.85rem] md:hidden">
                              {angka(r.jumlah)} <span className="font-sans text-[0.75rem] text-muted">· manage</span> {angka(h.manage)}
                            </div>
                            <div className="text-[0.8rem] text-muted">{r.masalah}{r.penyelesaian && r.penyelesaian !== r.masalah ? `, ${r.penyelesaian.toLowerCase()}` : ""}</div>
                            {r.customer && (
                              <div className="text-[0.8rem] text-sky">
                                {r.customer.nama}{r.customer.instansi ? ` · ${r.customer.instansi.nama}` : ""}
                              </div>
                            )}
                          </td>
                          <td className="num hidden px-4 py-3.5 md:table-cell">{angka(r.jumlah)}</td>
                          <td className="num hidden px-4 py-3.5 text-danger md:table-cell">{angka(r.modalReparium)}</td>
                          <td className="num hidden px-4 py-3.5 font-semibold md:table-cell">{angka(h.keuntungan)}</td>
                          <td className="num hidden px-4 py-3.5 text-accent md:table-cell">{angka(h.kasLab)}</td>
                          <td className="num hidden px-4 py-3.5 md:table-cell">
                            {angka(h.manage)}
                          </td>
                          <td className="px-3 py-3.5 md:px-4">
                            <div className="flex flex-col items-end gap-1.5">
                            {r.status === "BATAL" ? <Badge tone="batal">Batal</Badge> : r.transfer ? <Badge tone="lunas">Ditransfer</Badge> : r.lunas ? <Badge tone="green">Lunas</Badge> : <Badge tone="amber">{r.status === "BOOKING" ? "Booking" : "Belum lunas"}</Badge>}
                            <div className="flex flex-wrap items-center justify-end gap-1.5 md:flex-nowrap">
                              {r.status === "SELESAI" && r.invoice && (
                                <Link href={`/invoice/${r.invoice}`} className={`${aksiIkon} !text-accent`} aria-label="Buka invoice" title="Invoice">
                                  <FileText className="size-3.5" />
                                </Link>
                              )}
                              {r.status !== "BATAL" && (
                                <Link href={`/reparasi/${r.id}/edit`} className={aksiIkon} aria-label="Edit reparasi" title="Edit">
                                  <Pencil className="size-3.5" />
                                </Link>
                              )}
                              {r.status !== "BATAL" && !tuntas && (
                                <form action={ubahStatusReparasi.bind(null, r.id, "selesai")}>
                                  <button className={tombol}>Selesai</button>
                                </form>
                              )}
                              {r.status !== "BATAL" && !r.lunas && (
                                <form action={ubahStatusReparasi.bind(null, r.id, "lunas")}>
                                  <button className={tombol}>Lunas</button>
                                </form>
                              )}
                              {r.status !== "BATAL" && r.lunas && !r.transfer && (
                                <form action={ubahStatusReparasi.bind(null, r.id, "transfer")}>
                                  <button className={tombol}>Transfer</button>
                                </form>
                              )}
                              {r.status !== "BATAL" ? (
                                <ConfirmForm
                                  action={batalkanReparasi.bind(null, r.id)}
                                  message={`Batalkan reparasi ${r.modelLaptop}? Tidak akan masuk total dan bagi hasil.`}
                                >
                                  <button className={aksiIkonBahaya} aria-label="Batalkan reparasi" title="Batalkan">
                                    <X className="size-3.5" />
                                  </button>
                                </ConfirmForm>
                              ) : (
                                <>
                                  <form action={aktifkanReparasi.bind(null, r.id)}>
                                    <button className={tombol}>Aktifkan</button>
                                  </form>
                                  <ConfirmForm
                                    action={hapusReparasi.bind(null, r.id)}
                                    message={`Hapus permanen reparasi ${r.modelLaptop}? Tidak bisa dikembalikan.`}
                                  >
                                    <button className={tombolBahaya}>Hapus</button>
                                  </ConfirmForm>
                                </>
                              )}
                            </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
            </tbody>
            {(aktif.length > 0 || tagList.length > 0) && (
              <tfoot>
                <tr className="border-t border-line">
                  <td colSpan={2} className="px-4 py-4">
                    <span className="font-semibold">Total {namaBulan(kunci)} · {aktif.length} reparasi</span>
                    <span className="ml-2 text-[0.8rem] text-muted">selesai &amp; lunas</span>
                    <div className="mt-0.5 font-mono text-[0.85rem] font-bold md:hidden">
                      {angka(total.omzet)} <span className="font-sans text-[0.75rem] font-normal text-muted">· manage</span> {angka(total.manage)}
                    </div>
                  </td>
                  <td className="num hidden px-4 py-4 font-bold md:table-cell">{angka(total.omzet)}</td>
                  <td className="num hidden px-4 py-4 font-bold md:table-cell">{angka(total.modal)}</td>
                  <td className="num hidden px-4 py-4 font-bold md:table-cell">{angka(total.keuntungan)}</td>
                  <td className="num hidden px-4 py-4 font-bold text-accent md:table-cell">{angka(total.kasLab)}</td>
                  <td className="num hidden px-4 py-4 font-bold md:table-cell">{angka(total.manage)}</td>
                  <td />
                </tr>
                <tr className="border-t border-line bg-[#1c1a12]">
                  <td colSpan={2} className="px-4 py-4">
                    <span className="font-semibold text-amber">Tagihan</span>
                    <span className="ml-2 text-[0.8rem] text-muted">sedang dikerjakan atau belum lunas</span>
                    <div className="mt-0.5 font-mono text-[0.85rem] font-bold text-amber md:hidden">
                      {angka(tagJumlah)} <span className="font-sans text-[0.75rem] font-normal text-muted">· {tagList.length} job</span>
                    </div>
                  </td>
                  <td className="num hidden px-4 py-4 font-bold text-amber md:table-cell">{angka(tagJumlah)}</td>
                  <td colSpan={4} className="hidden px-4 py-4 text-right font-mono text-xs text-muted md:table-cell">{tagList.length} job</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {rows.length === 0 && <Empty>Belum ada reparasi di {namaBulan(kunci)}.</Empty>}
      </Card>
    </>
  );
}
