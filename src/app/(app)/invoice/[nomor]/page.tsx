import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { angka, tglPendek } from "@/lib/format";
import { NAMA_TIPE } from "@/lib/tipe";
import { daftarKontak } from "@/lib/kontak";
import { PrintButton } from "@/components/print-button";

const BULAN = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const tgl = (d: Date) => `${d.getUTCDate()} ${BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const METODE = { QRIS: "QRIS", DANA: "DANA", TUNAI: "Tunai", TRANSFER: "Transfer" } as const;

export default async function InvoicePage({ params }: { params: Promise<{ nomor: string }> }) {
  const { nomor } = await params;
  const include = { customer: { include: { instansi: true } } };
  const [s, r] = await Promise.all([
    db.serviceJob.findUnique({ where: { invoice: nomor }, include: { ...include, rate: true } }),
    db.repairJob.findUnique({ where: { invoice: nomor }, include }),
  ]);
  if (!s && !r) notFound();

  const j = (s ?? r)!;
  const baris: { nama: string; ket?: string; harga: number }[] = [];
  let diskon = 0;
  if (s) {
    const normal = Math.max(s.rate.hargaServis, s.jumlah);
    diskon = normal - s.jumlah;
    baris.push({
      nama: s.tipe === "REPASTE_MACBOOK" ? "Repaste MacBook (ganti thermal paste)" : `Servis ${NAMA_TIPE[s.tipe]}${s.tipe === "CLEANING" ? "" : " (ganti thermal paste + pembersihan)"}`,
      ket: s.modelLaptop,
      harga: normal,
    });
  } else if (r) {
    const rincian = [r.masalah, r.penyelesaian && r.penyelesaian !== r.masalah ? r.penyelesaian : null].filter(Boolean).join(", ");
    baris.push({ nama: "Reparasi hardware", ket: `${r.modelLaptop} — ${rincian}`, harga: r.jumlah });
  }
  const total = j.jumlah;
  const selesai = j.tanggalSelesai ?? j.tanggalMasuk;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link href={s ? "/servis" : "/reparasi"} className="inline-flex items-center gap-2 text-sm text-muted hover:text-ink">
          <ArrowLeft className="size-4" /> Kembali
        </Link>
        <PrintButton />
      </div>

      <article className="kertas mx-auto max-w-[780px] rounded-2xl border border-line bg-white p-8 text-[0.88rem] leading-snug text-[#1a1f23] md:p-12">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-4 border-[#1a1f23] pb-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-md bg-[#1a1f23] font-mono text-sm font-bold text-[#38d47f]">B4</span>
            <div>
              <div className="text-[1.3rem] font-bold tracking-tight">B4 Service Center</div>
              <div className="text-[0.76rem] text-[#5b6770]">Servis &amp; reparasi laptop</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[#5b6770]">Invoice</div>
            <div className="font-mono text-[1.6rem] font-bold leading-tight">#{j.invoice}</div>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <div className="text-[0.68rem] font-semibold uppercase tracking-wider text-[#5b6770]">Ditagihkan kepada</div>
            <div className="mt-1 text-[1rem] font-semibold">{j.customer?.nama ?? "Pelanggan umum"}</div>
            {j.customer?.instansi && <div>{j.customer.instansi.nama}</div>}
            {j.customer && daftarKontak(j.customer).length > 0 && <div className="font-mono text-[0.8rem] text-[#5b6770]">{daftarKontak(j.customer).join(" · ")}</div>}
          </div>
          <dl className="grid grid-cols-[auto_1fr] content-start gap-x-4 gap-y-1 text-right">
            <dt className="text-left text-[#5b6770]">Tanggal masuk</dt>
            <dd className="font-mono">{tgl(j.tanggalMasuk)}</dd>
            <dt className="text-left text-[#5b6770]">Tanggal selesai</dt>
            <dd className="font-mono">{tgl(selesai)}</dd>
            <dt className="text-left text-[#5b6770]">Pembayaran</dt>
            <dd>{j.pembayaran ? METODE[j.pembayaran] : "—"}</dd>
          </dl>
        </div>

        <table className="mt-8 w-full">
          <thead>
            <tr className="border-y border-[#1a1f23]">
              <th className="px-2 py-2 text-left text-[0.68rem] font-semibold uppercase tracking-wider text-[#5b6770]">Deskripsi</th>
              <th className="px-2 py-2 text-right text-[0.68rem] font-semibold uppercase tracking-wider text-[#5b6770]">Jumlah (Rp)</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b.nama} className="border-b border-[#e8ecef]">
                <td className="px-2 py-3">
                  <div className="font-medium">{b.nama}</div>
                  {b.ket && <div className="text-[0.8rem] text-[#5b6770]">{b.ket}</div>}
                </td>
                <td className="px-2 py-3 text-right font-mono tabular-nums">{angka(b.harga)}</td>
              </tr>
            ))}
            {diskon > 0 && (
              <tr className="border-b border-[#e8ecef]">
                <td className="px-2 py-2.5 text-[#5b6770]">Diskon</td>
                <td className="px-2 py-2.5 text-right font-mono tabular-nums">({angka(diskon)})</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#1a1f23]">
              <td className="px-2 py-3 text-[1rem] font-bold">Total</td>
              <td className="px-2 py-3 text-right font-mono text-[1.2rem] font-bold tabular-nums">Rp {angka(total)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="mt-6 flex items-center justify-between">
          <span
            className={`inline-block -rotate-3 rounded-md border-[3px] px-4 py-1.5 text-[1.2rem] font-extrabold tracking-[0.2em] ${
              j.lunas ? "border-[#1f7a4d] text-[#1f7a4d]" : "border-[#b3261e] text-[#b3261e]"
            }`}
          >
            {j.lunas ? "LUNAS" : "BELUM LUNAS"}
          </span>
          <div className="text-right text-[0.8rem] text-[#5b6770]">
            Diterbitkan {tglPendek(selesai)} {selesai.getUTCFullYear()}
          </div>
        </div>

        <p className="mt-10 border-t border-[#dfe4e8] pt-3 text-center text-[0.78rem] text-[#5b6770]">
          Terima kasih telah mempercayakan laptop Anda kepada B4 Service Center.
        </p>
      </article>
    </>
  );
}
