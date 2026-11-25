import Link from "next/link";
import { angka, namaBulan, tglPendek } from "@/lib/format";
import { jumlahkanServis } from "@/lib/hitung";
import { pasanganPerKode, pilihanBulan, servisBulan, tagihan, tentukanBulan, terealisasi } from "@/lib/queries";
import { NAMA_PERAN, labelTarif, menungguPasangan } from "@/lib/campaign";
import { FileText, Pencil, X } from "lucide-react";
import { Badge, ButtonLink, Card, Empty, PageHeader, StatusBadge, Th, TipeBadge, aksiIkon, aksiIkonBahaya, aksiTeks } from "@/components/ui";
import { MonthSelect } from "@/components/month-select";
import { ConfirmForm } from "@/components/confirm-form";
import { aktifkanServis, batalkanServis, hapusServis, ubahStatusServis } from "./actions";

const tombol = aksiTeks;
const tombolBahaya = `${aksiTeks} hover:!border-danger hover:!text-danger`;

const FILTER = [
  { id: "semua", label: "Semua" },
  { id: "gaming", label: "Gaming" },
  { id: "work", label: "Work" },
  { id: "cleaning", label: "Cleaning" },
  { id: "macbook", label: "MacBook" },
  { id: "booking", label: "Booking" },
  { id: "belum", label: "Belum lunas" },
  { id: "campaign", label: "Ajak Teman" },
  { id: "menunggu", label: "Menunggu pasangan" },
] as const;

export default async function ServisPage({
  searchParams,
}: {
  searchParams: Promise<{ bulan?: string; f?: string }>;
}) {
  const sp = await searchParams;
  const kunci = await tentukanBulan(sp.bulan);
  const filter = FILTER.some((x) => x.id === sp.f) ? sp.f! : "semua";
  const [opsi, semua, perKode] = await Promise.all([pilihanBulan(), servisBulan(kunci), pasanganPerKode()]);

  const cocok: Record<string, (j: (typeof semua)[number]) => boolean> = {
    semua: () => true,
    gaming: (j) => j.tipe === "GAMING",
    work: (j) => j.tipe === "WORK",
    cleaning: (j) => j.tipe === "CLEANING",
    macbook: (j) => j.tipe === "REPASTE_MACBOOK",
    booking: (j) => j.status === "BOOKING",
    belum: (j) => !j.lunas && j.status !== "BATAL",
    campaign: (j) => j.rate.ratePeriod.campaign,
    menunggu: (j) => j.rate.ratePeriod.campaign && menungguPasangan(j, perKode),
  };
  const baris = semua.filter(cocok[filter]);
  const total = jumlahkanServis(baris.filter(terealisasi));
  const tag = baris.filter(tagihan);
  const tagJumlah = tag.reduce((a, j) => a + j.jumlah, 0);

  return (
    <>
      <PageHeader title="Servis pasta" aside={<ButtonLink href="/servis/baru">Servis baru</ButtonLink>}>
        <MonthSelect value={kunci} options={opsi} />
      </PageHeader>

      <div className="rise rise-1 -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
        {FILTER.map((f) => {
          const n = semua.filter(cocok[f.id]).length;
          const aktif = f.id === filter;
          return (
            <Link
              key={f.id}
              href={`/servis?bulan=${kunci}&f=${f.id}`}
              className={`shrink-0 whitespace-nowrap rounded-xl border px-4 py-2 text-sm transition ${
                aktif
                  ? "border-accent bg-[#12331f] font-semibold text-ink"
                  : "border-line bg-panel text-muted hover:border-[#3a464e] hover:text-ink"
              }`}
            >
              {f.label} <span className="font-mono">{n}</span>
            </Link>
          );
        })}
      </div>

      <Card className="rise rise-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-0 text-[0.9rem] md:min-w-[1040px]">
            <thead>
              <tr>
                <Th className="hidden md:table-cell">Masuk</Th>
                <Th className="hidden md:table-cell">Selesai</Th>
                <Th>Model laptop</Th>
                <Th className="hidden md:table-cell">Customer</Th>
                <Th className="hidden md:table-cell">Tipe</Th>
                <Th className="hidden md:table-cell">PJ / Marketing</Th>
                <Th right className="hidden md:table-cell">Jumlah</Th>
                <Th right>Status</Th>
              </tr>
            </thead>
            <tbody>
              {baris.map((j) => {
                const promo = !/^[A-Za-z]+ \d{4}$/.test(j.rate.ratePeriod.nama);
                const khusus = j.jumlah !== j.rate.hargaServis; // harga custom / diskon per job
                const sub = [j.keluhan, j.catatan].filter(Boolean).join(" · ") || (promo ? labelTarif(j.rate.ratePeriod.nama) : null);
                return (
                  <tr
                    key={j.id}
                    className={`border-t border-line transition-colors hover:bg-panel2/50 ${
                      j.status === "BATAL" ? "opacity-50" : j.status === "BOOKING" ? "bg-[#1c1a12]" : promo ? "bg-[#141c24]" : ""
                    }`}
                  >
                    <td className="hidden px-4 py-3.5 font-mono text-[0.82rem] text-muted md:table-cell">{tglPendek(j.tanggalMasuk)}{j.invoice && <div className="text-[0.72rem] text-accent/80">#{j.invoice}</div>}</td>
                    <td className="hidden px-4 py-3.5 font-mono text-[0.82rem] text-muted md:table-cell">{tglPendek(j.tanggalSelesai)}</td>
                    <td className="max-w-[280px] px-3 py-3.5 md:px-4">
                      <div className="mb-0.5 font-mono text-[0.75rem] text-muted md:hidden">
                        {tglPendek(j.tanggalMasuk)}{j.invoice && <span className="ml-2 text-accent/80">#{j.invoice}</span>}
                      </div>
                      <div className="font-medium">{j.modelLaptop}</div>
                      <div className="mt-0.5 font-mono text-[0.9rem] font-medium md:hidden">{angka(j.jumlah)}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[0.8rem] text-muted md:hidden">
                        <TipeBadge tipe={j.tipe} />
                        {j.customer && <span className="min-w-0 break-words">{j.customer.nama}</span>}
                      </div>
                      <div className={`text-[0.8rem] md:truncate ${j.keluhan || j.catatan ? "text-muted" : promo ? "text-sky" : "text-muted"}`}>
                        {sub ?? "—"}
                      </div>
                      {j.rate.ratePeriod.campaign && (
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <Badge tone="sky">Ajak Teman{j.referralPeran ? ` · ${NAMA_PERAN[j.referralPeran]}` : ""}</Badge>
                          {menungguPasangan(j, perKode) && <Badge tone="amber">Menunggu pasangan</Badge>}
                        </div>
                      )}
                    </td>
                    <td className="hidden max-w-[170px] px-4 py-3.5 md:table-cell">
                      {j.customer ? (
                        <>
                          <Link href={`/customer/${j.customer.id}`} className="block truncate hover:text-accent">{j.customer.nama}</Link>
                          <div className="truncate text-[0.8rem] text-muted">{j.customer.instansi?.nama ?? "—"}</div>
                        </>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3.5 md:table-cell"><TipeBadge tipe={j.tipe} /></td>
                    <td className="hidden px-4 py-3.5 md:table-cell">
                      <div>{j.pj.nama}</div>
                      <div className="text-[0.8rem] text-muted">{j.marketing?.nama ?? "—"}</div>
                    </td>
                    <td className="num hidden px-4 py-3.5 font-medium md:table-cell">
                      {angka(j.jumlah)}
                      {j.pembayaran && <div className="font-sans text-[0.72rem] font-normal text-muted">{j.pembayaran}</div>}
                      {j.diskonPersen && !khusus && (
                        <div className="text-[0.72rem] font-normal text-sky">
                          −{String(j.diskonPersen).replace(".", ",")}%
                        </div>
                      )}
                      {khusus && (
                        <div className="text-[0.72rem] font-normal text-amber">
                          harga khusus{j.diskonPersen ? ` · −${String(j.diskonPersen).replace(".", ",")}%` : ""}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3.5 md:px-4">
                      <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge status={j.status} lunas={j.lunas} />
                      <div className="flex flex-wrap items-center justify-end gap-1.5 md:flex-nowrap">
                        {j.status === "SELESAI" && j.invoice && (
                          <Link href={`/invoice/${j.invoice}`} className={`${aksiIkon} !text-accent`} aria-label="Buka invoice" title="Invoice">
                            <FileText className="size-3.5" />
                          </Link>
                        )}
                        {j.status !== "BATAL" && (
                          <Link href={`/servis/${j.id}/edit`} className={aksiIkon} aria-label="Edit servis" title="Edit">
                            <Pencil className="size-3.5" />
                          </Link>
                        )}
                        {j.status !== "BATAL" && j.status !== "SELESAI" && (
                          <form action={ubahStatusServis.bind(null, j.id, "selesai")}>
                            <button className={tombol}>Selesai</button>
                          </form>
                        )}
                        {j.status !== "BATAL" && !j.lunas && (
                          <form action={ubahStatusServis.bind(null, j.id, "lunas")}>
                            <button className={tombol}>Lunas</button>
                          </form>
                        )}
                        {j.status !== "BATAL" ? (
                          <ConfirmForm
                            action={batalkanServis.bind(null, j.id)}
                            message={`Batalkan servis ${j.modelLaptop}? Tidak akan masuk total dan bagi hasil.`}
                          >
                            <button className={aksiIkonBahaya} aria-label="Batalkan servis" title="Batalkan">
                              <X className="size-3.5" />
                            </button>
                          </ConfirmForm>
                        ) : (
                          <>
                            <form action={aktifkanServis.bind(null, j.id)}>
                              <button className={tombol}>Aktifkan</button>
                            </form>
                            <ConfirmForm
                              action={hapusServis.bind(null, j.id)}
                              message={`Hapus permanen servis ${j.modelLaptop}? Tidak bisa dikembalikan.`}
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
            {baris.length > 0 && (
              <tfoot>
                <tr className="border-t border-line">
                  <td className="px-3 py-4 md:hidden">
                    <span className="font-semibold">Total {namaBulan(kunci)}</span>
                    <div className="text-[0.8rem] text-muted">uang masuk · selesai &amp; lunas</div>
                    <div className="mt-0.5 font-mono font-bold">{angka(total.uangMasuk)}</div>
                  </td>
                  <td colSpan={6} className="hidden px-4 py-4 md:table-cell">
                    <span className="font-semibold">Total {namaBulan(kunci)}</span>
                    <span className="ml-2 text-[0.8rem] text-muted">uang masuk · selesai &amp; lunas</span>
                  </td>
                  <td className="num hidden px-4 py-4 font-bold md:table-cell">{angka(total.uangMasuk)}</td>
                  <td className="px-4 py-4 text-right font-mono text-xs text-muted">{total.jumlahJob} job</td>
                </tr>
                <tr className="border-t border-line bg-[#1c1a12]">
                  <td className="px-3 py-4 md:hidden">
                    <span className="font-semibold text-amber">Tagihan</span>
                    <div className="text-[0.8rem] text-muted">dikerjakan atau belum lunas</div>
                    <div className="mt-0.5 font-mono font-bold text-amber">{angka(tagJumlah)}</div>
                  </td>
                  <td colSpan={6} className="hidden px-4 py-4 md:table-cell">
                    <span className="font-semibold text-amber">Tagihan</span>
                    <span className="ml-2 text-[0.8rem] text-muted">sedang dikerjakan atau belum lunas</span>
                  </td>
                  <td className="num hidden px-4 py-4 font-bold text-amber md:table-cell">{angka(tagJumlah)}</td>
                  <td className="px-4 py-4 text-right font-mono text-xs text-muted">{tag.length} job</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {baris.length === 0 && <Empty>Tidak ada servis untuk filter ini.</Empty>}
      </Card>
    </>
  );
}
