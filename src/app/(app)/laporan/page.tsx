import { db } from "@/lib/db";
import { angka, geserBulan, hariIniJakarta, kunciBulan, namaBulan, tglPendek } from "@/lib/format";
import { hitungBagiHasil, hitungReparasi, jumlahkanServis } from "@/lib/hitung";
import {
  bagiHasilBulan,
  pilihanBulan,
  rekapMingguan,
  ringkasanBulan,
  tentukanBulan,
} from "@/lib/queries";
import { NAMA_TIPE, PAKAI_PASTA, URUTAN_TIPE } from "@/lib/tipe";
import { PageHeader } from "@/components/ui";
import { MonthSelect } from "@/components/month-select";
import { PrintButton } from "@/components/print-button";

// ---------------------------------------------------------------- helper tampilan

/** Akuntansi: pengurang ditulis (1.000), nol ditulis "–". */
const nilai = (n: number) => (n === 0 ? "–" : angka(n));
const kurung = (n: number) => (n === 0 ? "–" : `(${angka(n)})`);
const pct = (a: number, b: number) => (b === 0 ? "–" : `${((a / b) * 100).toFixed(1).replace(".", ",")}%`);
const delta = (now: number, prev: number) => {
  if (prev === 0) return now === 0 ? "–" : "baru";
  const d = ((now - prev) / Math.abs(prev)) * 100;
  return `${d >= 0 ? "+" : "−"}${Math.abs(d).toFixed(1).replace(".", ",")}%`;
};
const tglPenuh = (d: Date) => `${d.getUTCDate()} ${namaBulan(kunciBulan(d)).replace(/ \d+$/, "")} ${d.getUTCFullYear()}`;

const TH = "px-3 py-2 text-[0.68rem] font-semibold uppercase tracking-wider text-[#5b6770]";
const TD = "px-3 py-1.5";
const NUM = "font-mono tabular-nums text-right";

function Bagian({ no, judul, children }: { no: string; judul: string; children: React.ReactNode }) {
  return (
    <section className="tahan mt-8">
      <h2 className="mb-3 border-b border-[#1a1f23] pb-1.5 text-[1rem] font-bold">
        {no}. {judul}
      </h2>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-[#dfe4e8] bg-[#f6f8f9] px-4 py-3">
      <div className="text-[0.66rem] font-semibold uppercase tracking-wider text-[#5b6770]">{label}</div>
      <div className="mt-1 font-mono text-[1.25rem] font-bold leading-tight">{value}</div>
      {sub && <div className="mt-0.5 text-[0.74rem] text-[#5b6770]">{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- halaman

export default async function LaporanPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const kunci = await tentukanBulan((await searchParams).bulan, { bulanBerjalan: false });
  const kunciLalu = geserBulan(kunci, -1);
  const hariIni = hariIniJakarta();
  const final = kunci < kunciBulan(hariIni);

  const [opsi, d, lalu, lots] = await Promise.all([
    pilihanBulan(),
    ringkasanBulan(kunci),
    ringkasanBulan(kunciLalu),
    db.pastaLot.findMany(),
  ]);
  const { servis, reparasi, aktifServis, aktifRep, tagServis, tagRep, s, r } = d;
  const bagi = await bagiHasilBulan(kunci, aktifServis);
  const minggu = rekapMingguan(kunci, aktifServis);

  const pendapatan = s.uangMasuk + r.omzet;
  const pendapatanLalu = lalu.s.uangMasuk + lalu.r.omzet;
  const laba = s.keuntunganBersih + r.keuntungan;
  const labaLalu = lalu.s.keuntunganBersih + lalu.r.keuntungan;
  const kasLab = s.lab + r.kasLab;
  const kasLabLalu = lalu.s.lab + lalu.r.kasLab;
  const totalJob = aktifServis.length + aktifRep.length;
  const dialokasi = s.marketing + s.pekerja + s.manajemen + s.ongkir + r.manage + kasLab;
  const selisih = laba - dialokasi; // harus 0

  const tagJumlah = [...tagServis, ...tagRep].reduce((a, j) => a + j.jumlah, 0);
  const booking = servis.filter((j) => j.status === "BOOKING").length + reparasi.filter((j) => j.status === "BOOKING").length;
  const batal = servis.filter((j) => j.status === "BATAL").length + reparasi.filter((j) => j.status === "BATAL").length;

  const segmen = [
    ...URUTAN_TIPE.map((t) => {
      const x = jumlahkanServis(aktifServis.filter((j) => j.tipe === t));
      return { nama: `Servis ${NAMA_TIPE[t]}`, job: x.jumlahJob, omzet: x.uangMasuk, laba: x.keuntunganBersih, lab: x.lab };
    }),
    { nama: "Reparasi hardware", job: r.jumlahJob, omzet: r.omzet, laba: r.keuntungan, lab: r.kasLab },
  ];

  const manageTf = aktifRep.filter((x) => x.transfer).reduce((a, x) => a + hitungReparasi(x).manage, 0);
  const maksMinggu = Math.max(...minggu.map((m) => m.total.uangMasuk), 1);

  const stok = PAKAI_PASTA.map((t) => {
    const l = lots.filter((x) => x.tipe === t);
    const ref = [...l].sort((a, b) => +b.tanggal - +a.tanggal)[0];
    return { nama: NAMA_TIPE[t], sisa: l.reduce((a, x) => a + x.sisaJob, 0), perTube: ref?.jobPerTube ?? 0 };
  });

  // Lampiran: semua transaksi bulan ini (selain batal), urut tanggal masuk lalu invoice.
  const lampiran = [
    ...servis.map((j) => ({
      invoice: j.invoice ?? "—",
      masuk: j.tanggalMasuk,
      selesai: j.tanggalSelesai,
      jenis: `Servis ${NAMA_TIPE[j.tipe]}`,
      laptop: j.modelLaptop,
      customer: j.customer?.nama ?? "—",
      status: j.status,
      lunas: j.lunas,
      jumlah: j.jumlah,
      laba: hitungBagiHasil(j).keuntunganBersih,
    })),
    ...reparasi.map((j) => ({
      invoice: j.invoice ?? "—",
      masuk: j.tanggalMasuk,
      selesai: j.tanggalSelesai,
      jenis: "Reparasi",
      laptop: j.modelLaptop,
      customer: j.customer?.nama ?? "—",
      status: j.status,
      lunas: j.lunas,
      jumlah: j.jumlah,
      laba: hitungReparasi(j).keuntungan,
    })),
  ].sort((a, b) => +a.masuk - +b.masuk || a.invoice.localeCompare(b.invoice));
  const statusTeks = (x: { status: string; lunas: boolean }) =>
    x.status === "BATAL" ? "Batal" : x.status === "BOOKING" ? "Booking" : x.status === "DIKERJAKAN" ? "Dikerjakan" : x.lunas ? "Selesai · lunas" : "Belum lunas";

  const kesimpulan: string[] = [
    totalJob === 0
      ? `Belum ada transaksi selesai dan lunas pada ${namaBulan(kunci)}.`
      : `Pada ${namaBulan(kunci)} B4 menyelesaikan ${totalJob} pekerjaan (${aktifServis.length} servis dan ${aktifRep.length} reparasi) dengan pendapatan Rp ${angka(pendapatan)}${pendapatanLalu ? `, ${delta(pendapatan, pendapatanLalu).startsWith("−") ? "turun" : "naik"} ${delta(pendapatan, pendapatanLalu).replace(/^[+−]/, "")} dari ${namaBulan(kunciLalu)}` : ""}.`,
    totalJob > 0 ? `Keuntungan bersih Rp ${angka(laba)} (margin ${pct(laba, pendapatan)}), dan Kas Lab bertambah Rp ${angka(kasLab)}.` : "",
    tagJumlah > 0 ? `Masih ada tagihan Rp ${angka(tagJumlah)} dari ${tagServis.length + tagRep.length} pesanan yang belum selesai atau belum lunas, jadi belum dihitung sebagai pendapatan.` : "Tidak ada tagihan yang tertunda.",
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Laporan bulanan" sub="disusun otomatis dari data job, siap cetak atau simpan PDF" aside={<PrintButton />}>
        <MonthSelect value={kunci} options={opsi} />
      </PageHeader>

      <article className="kertas rise rise-1 rounded-2xl border border-line bg-white p-8 text-[0.86rem] leading-snug text-[#1a1f23] md:p-12">
        {/* Kop */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-4 border-[#1a1f23] pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-md bg-[#1a1f23] font-mono text-sm font-bold text-[#38d47f]">B4</span>
              <div className="text-[1.35rem] font-bold tracking-tight">B4 Service Center</div>
            </div>
            <div className="mt-1 text-[0.78rem] text-[#5b6770]">Lab B401, Teknik Elektro ITS, Surabaya</div>
            <div className="mt-4 text-[0.8rem] font-semibold text-[#5b6770]">Laporan Keuangan Bulanan</div>
            <div className="text-[1.7rem] font-bold leading-tight tracking-tight">{namaBulan(kunci)}</div>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-5 gap-y-1 text-[0.8rem]">
            <dt className="text-[#5b6770]">No. laporan</dt>
            <dd className="font-mono font-semibold">LAP-{kunci.replace("-", "")}</dd>
            <dt className="text-[#5b6770]">Status</dt>
            <dd>
              <span className={`rounded px-2 py-0.5 text-[0.7rem] font-bold ${final ? "bg-[#d9f2e3] text-[#14673f]" : "bg-[#fbe9c7] text-[#8a5a00]"}`}>
                {final ? "Final" : "Sementara"}
              </span>
            </dd>
            <dt className="text-[#5b6770]">Dicetak</dt>
            <dd className="font-mono">{tglPenuh(hariIni)}</dd>
          </dl>
        </header>

        {/* 1 */}
        <Bagian no="I" judul="Ringkasan">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Pendapatan" value={`Rp ${angka(pendapatan)}`} sub={pendapatanLalu ? `${delta(pendapatan, pendapatanLalu)} dari ${namaBulan(kunciLalu)}` : "belum ada bulan pembanding"} />
            <Stat label="Keuntungan bersih" value={`Rp ${angka(laba)}`} sub={`margin ${pct(laba, pendapatan)}`} />
            <Stat label="Kas Lab" value={`Rp ${angka(kasLab)}`} sub={kasLabLalu ? `${delta(kasLab, kasLabLalu)} dari ${namaBulan(kunciLalu)}` : "belum ada bulan pembanding"} />
            <Stat label="Pekerjaan selesai" value={`${totalJob}`} sub={`rata-rata Rp ${angka(totalJob ? Math.round(pendapatan / totalJob) : 0)}/job`} />
          </div>
          <ul className="mt-4 list-disc space-y-1 pl-5">
            {kesimpulan.map((k) => (
              <li key={k}>{k}</li>
            ))}
          </ul>
        </Bagian>

        {/* 2 */}
        <Bagian no="II" judul="Laba rugi">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#c9d1d6]">
                <th className={`${TH} text-left`}>Keterangan</th>
                <th className={`${TH} text-right`}>{namaBulan(kunci)}</th>
                <th className={`${TH} text-right`}>{namaBulan(kunciLalu)}</th>
                <th className={`${TH} text-right`}>Perubahan</th>
              </tr>
            </thead>
            <tbody>
              <Baris judul="Pendapatan" />
              <Baris indent label="Servis pasta" a={s.uangMasuk} b={lalu.s.uangMasuk} />
              <Baris indent label="Reparasi hardware" a={r.omzet} b={lalu.r.omzet} />
              <Baris total label="Total pendapatan" a={pendapatan} b={pendapatanLalu} />
              <Baris judul="Modal" />
              <Baris indent label="Modal pasta" a={-s.modalPasta} b={-lalu.s.modalPasta} kurungan />
              <Baris indent label="Pembayaran ke Reparium" a={-r.modal} b={-lalu.r.modal} kurungan />
              <Baris total label="Keuntungan bersih" a={laba} b={labaLalu} tebal />
              <Baris judul="Pembagian hasil" />
              <Baris indent label="Bagi hasil pekerja" a={-s.pekerja} b={-lalu.s.pekerja} kurungan />
              <Baris indent label="Bagi hasil marketing" a={-s.marketing} b={-lalu.s.marketing} kurungan />
              <Baris indent label="Bagian manajemen (servis)" a={-s.manajemen} b={-lalu.s.manajemen} kurungan />
              <Baris indent label="Bagian manajemen (reparasi)" a={-r.manage} b={-lalu.r.manage} kurungan />
              <Baris indent label="Ongkir" a={-s.ongkir} b={-lalu.s.ongkir} kurungan />
              <Baris total label="Masuk Kas Lab" a={kasLab} b={kasLabLalu} tebal aksen />
            </tbody>
          </table>
          {selisih !== 0 && (
            <p className="mt-2 text-[0.78rem] font-semibold text-[#b3261e]">
              Pembagian hasil berbeda Rp {angka(selisih)} dari keuntungan bersih. Periksa data job.
            </p>
          )}
        </Bagian>

        {/* 3 */}
        <Bagian no="III" judul="Kinerja per jenis layanan">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#c9d1d6]">
                <th className={`${TH} text-left`}>Layanan</th>
                <th className={`${TH} text-right`}>Job</th>
                <th className={`${TH} text-right`}>Pendapatan</th>
                <th className={`${TH} text-right`}>Keuntungan</th>
                <th className={`${TH} text-right`}>Margin</th>
                <th className={`${TH} text-right`}>Kas Lab</th>
              </tr>
            </thead>
            <tbody>
              {segmen.map((g) => (
                <tr key={g.nama} className="border-b border-[#e8ecef]">
                  <td className={TD}>{g.nama}</td>
                  <td className={`${TD} ${NUM}`}>{g.job}</td>
                  <td className={`${TD} ${NUM}`}>{nilai(g.omzet)}</td>
                  <td className={`${TD} ${NUM}`}>{nilai(g.laba)}</td>
                  <td className={`${TD} ${NUM}`}>{pct(g.laba, g.omzet)}</td>
                  <td className={`${TD} ${NUM}`}>{nilai(g.lab)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-[#1a1f23] font-bold">
                <td className={TD}>Total</td>
                <td className={`${TD} ${NUM}`}>{totalJob}</td>
                <td className={`${TD} ${NUM}`}>{nilai(pendapatan)}</td>
                <td className={`${TD} ${NUM}`}>{nilai(laba)}</td>
                <td className={`${TD} ${NUM}`}>{pct(laba, pendapatan)}</td>
                <td className={`${TD} ${NUM}`}>{nilai(kasLab)}</td>
              </tr>
            </tbody>
          </table>
        </Bagian>

        {/* 4 */}
        <Bagian no="IV" judul="Servis per minggu">
          <div className="space-y-2">
            {minggu.map((m) => (
              <div key={m.nomor} className="grid grid-cols-[150px_1fr_110px_70px] items-center gap-3">
                <span>
                  <span className="font-semibold">Minggu {m.nomor}</span>{" "}
                  <span className="text-[0.74rem] text-[#5b6770]">{tglPendek(m.awal)}–{tglPendek(m.akhir)}</span>
                </span>
                <div className="h-4 rounded bg-[#eef1f3]">
                  <div className="h-full rounded bg-[#1f7a4d]" style={{ width: `${(m.total.uangMasuk / maksMinggu) * 100}%` }} />
                </div>
                <span className={`${NUM}`}>{nilai(m.total.uangMasuk)}</span>
                <span className="text-right font-mono text-[0.76rem] text-[#5b6770]">{m.total.jumlahJob} job</span>
              </div>
            ))}
          </div>
        </Bagian>

        {/* 5 */}
        <Bagian no="V" judul="Bagi hasil">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#c9d1d6]">
                <th className={`${TH} text-left`}>Penerima</th>
                <th className={`${TH} text-left`}>Kategori</th>
                <th className={`${TH} text-right`}>Job</th>
                <th className={`${TH} text-right`}>Jumlah</th>
                <th className={`${TH} text-right`}>Status</th>
              </tr>
            </thead>
            <tbody>
              {bagi.map((b) => (
                <tr key={b.kunci} className="border-b border-[#e8ecef]">
                  <td className={TD}>{b.nama}</td>
                  <td className={`${TD} capitalize text-[#5b6770]`}>{b.kategori.toLowerCase()}</td>
                  <td className={`${TD} ${NUM}`}>{b.jumlahJob}</td>
                  <td className={`${TD} ${NUM}`}>{nilai(b.jumlah)}</td>
                  <td className={`${TD} text-right`}>{b.dibayarAt ? "Dibayar" : "Belum dibayar"}</td>
                </tr>
              ))}
              {r.manage > 0 && (
                <tr className="border-b border-[#e8ecef]">
                  <td className={TD}>Manajemen</td>
                  <td className={`${TD} text-[#5b6770]`}>reparasi</td>
                  <td className={`${TD} ${NUM}`}>{r.jumlahJob}</td>
                  <td className={`${TD} ${NUM}`}>{nilai(r.manage)}</td>
                  <td className={`${TD} text-right`}>{manageTf >= r.manage ? "Ditransfer" : manageTf > 0 ? `Sebagian (${angka(manageTf)})` : "Belum ditransfer"}</td>
                </tr>
              )}
              {bagi.length === 0 && r.manage === 0 && (
                <tr><td colSpan={5} className={`${TD} text-center text-[#5b6770]`}>Belum ada bagi hasil bulan ini.</td></tr>
              )}
            </tbody>
          </table>
        </Bagian>

        {/* 6 */}
        <Bagian no="VI" judul="Tagihan dan pesanan berjalan">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Tagihan" value={`Rp ${angka(tagJumlah)}`} sub={`${tagServis.length + tagRep.length} pesanan`} />
            <Stat label="Booking" value={`${booking}`} sub="belum dikerjakan" />
            <Stat label="Dibatalkan" value={`${batal}`} sub="tidak dihitung" />
          </div>
          {tagServis.length + tagRep.length > 0 && (
            <table className="mt-3 w-full">
              <thead>
                <tr className="border-b border-[#c9d1d6]">
                  <th className={`${TH} text-left`}>Invoice</th>
                  <th className={`${TH} text-left`}>Laptop</th>
                  <th className={`${TH} text-left`}>Status</th>
                  <th className={`${TH} text-right`}>Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {[...tagServis, ...tagRep].map((j) => (
                  <tr key={j.id} className="border-b border-[#e8ecef]">
                    <td className={`${TD} font-mono`}>{j.invoice ?? "—"}</td>
                    <td className={TD}>{j.modelLaptop}</td>
                    <td className={TD}>{statusTeks(j)}</td>
                    <td className={`${TD} ${NUM}`}>{angka(j.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Bagian>

        {/* 7 */}
        <Bagian no="VII" judul="Stok pasta">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#c9d1d6]">
                <th className={`${TH} text-left`}>Jenis</th>
                <th className={`${TH} text-right`}>Sisa jatah</th>
                <th className={`${TH} text-right`}>Setara tube</th>
              </tr>
            </thead>
            <tbody>
              {stok.map((x) => (
                <tr key={x.nama} className="border-b border-[#e8ecef]">
                  <td className={TD}>Pasta {x.nama}</td>
                  <td className={`${TD} ${NUM}`}>{x.sisa} job</td>
                  <td className={`${TD} ${NUM}`}>{x.perTube ? (x.sisa / x.perTube).toFixed(1).replace(".", ",") : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[0.74rem] text-[#5b6770]">Posisi stok saat laporan dicetak, bukan akhir periode.</p>
        </Bagian>

        {/* Lampiran */}
        <section className="mt-8">
          <h2 className="mb-3 border-b border-[#1a1f23] pb-1.5 text-[1rem] font-bold">Lampiran. Daftar transaksi</h2>
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[720px] text-[0.8rem] print:min-w-0 print:text-[0.72rem]">
              <thead>
                <tr className="border-b border-[#c9d1d6]">
                  <th className={`${TH} text-left`}>Invoice</th>
                  <th className={`${TH} text-left`}>Masuk</th>
                  <th className={`${TH} text-left`}>Selesai</th>
                  <th className={`${TH} text-left`}>Jenis</th>
                  <th className={`${TH} text-left`}>Laptop</th>
                  <th className={`${TH} text-left`}>Customer</th>
                  <th className={`${TH} text-left`}>Status</th>
                  <th className={`${TH} text-right`}>Jumlah</th>
                  <th className={`${TH} text-right`}>Laba</th>
                </tr>
              </thead>
              <tbody>
                {lampiran.map((x) => (
                  <tr key={x.invoice + x.jenis + x.laptop} className={`border-b border-[#e8ecef] ${x.status === "BATAL" ? "text-[#8a949b] line-through" : ""}`}>
                    <td className={`${TD} font-mono`}>{x.invoice}</td>
                    <td className={`${TD} whitespace-nowrap font-mono`}>{tglPendek(x.masuk)}</td>
                    <td className={`${TD} whitespace-nowrap font-mono`}>{tglPendek(x.selesai)}</td>
                    <td className={TD}>{x.jenis}</td>
                    <td className={TD}>{x.laptop}</td>
                    <td className={TD}>{x.customer}</td>
                    <td className={TD}>{statusTeks(x)}</td>
                    <td className={`${TD} ${NUM}`}>{angka(x.jumlah)}</td>
                    <td className={`${TD} ${NUM}`}>{angka(x.laba)}</td>
                  </tr>
                ))}
                {lampiran.length === 0 && (
                  <tr><td colSpan={9} className={`${TD} py-6 text-center text-[#5b6770]`}>Tidak ada transaksi pada periode ini.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Tanda tangan */}
        <footer className="tahan mt-12 flex justify-end text-center text-[0.82rem]">
          <div className="w-[260px]">
            <div className="text-[#5b6770]">Surabaya, {tglPenuh(hariIni)}</div>
            <div className="text-[#5b6770]">Disahkan oleh</div>
            <div className="mt-16 border-t border-[#1a1f23] pt-1 font-semibold">Sultan Syafiq Rakan</div>
            <div className="text-[#5b6770]">Chairman</div>
          </div>
        </footer>
        <div className="mt-8 border-t border-[#dfe4e8] pt-2 text-center font-mono text-[0.68rem] text-[#8a949b]">
          LAP-{kunci.replace("-", "")} · dibuat otomatis oleh B4 ERP · {tglPenuh(hariIni)}
        </div>
      </article>
    </>
  );
}

function Baris({
  judul, label, a = 0, b = 0, indent, total, tebal, kurungan, aksen,
}: {
  judul?: string; label?: string; a?: number; b?: number;
  indent?: boolean; total?: boolean; tebal?: boolean; kurungan?: boolean; aksen?: boolean;
}) {
  if (judul) {
    return (
      <tr>
        <td colSpan={4} className="px-3 pb-1 pt-3 text-[0.72rem] font-bold uppercase tracking-wider text-[#1f7a4d]">{judul}</td>
      </tr>
    );
  }
  const fmt = (n: number) => (kurungan ? kurung(-n) : nilai(n));
  return (
    <tr className={`${total ? "border-t border-[#1a1f23]" : "border-b border-[#eef1f3]"} ${tebal ? "bg-[#f1f5f3] font-bold" : total ? "font-semibold" : ""}`}>
      <td className={`${TD} ${indent ? "pl-7" : ""}`}>{label}</td>
      <td className={`${TD} ${NUM} ${aksen ? "text-[#14673f]" : ""}`}>{fmt(a)}</td>
      <td className={`${TD} ${NUM} text-[#5b6770]`}>{fmt(b)}</td>
      <td className={`${TD} ${NUM} text-[#5b6770]`}>{delta(Math.abs(a), Math.abs(b))}</td>
    </tr>
  );
}
