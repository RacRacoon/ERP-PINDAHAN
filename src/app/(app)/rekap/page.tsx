import { angka, namaBulan, namaBulanPendek, rupiah } from "@/lib/format";
import { pilihanBulan, rekapMingguan, ringkasanBulan, ringkasanCampaign, tanggalBulanJob, tentukanBulan } from "@/lib/queries";
import { Card, PageHeader, Th } from "@/components/ui";
import { WeeklyChart } from "@/components/weekly-chart";
import { MonthSelect } from "@/components/month-select";
import { CampaignCard } from "@/components/campaign-card";

const dm = (d: Date) => `${d.getUTCDate()} ${namaBulanPendek(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`)}`;

export default async function RekapPage({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const kunci = await tentukanBulan((await searchParams).bulan);
  const [opsi, d] = await Promise.all([pilihanBulan(), ringkasanBulan(kunci)]);
  const minggu = rekapMingguan(kunci, d.aktifServis);
  const campaign = await ringkasanCampaign(d.servis, d.aktifServis);
  const { s, r } = d;
  const grafik = minggu.map((m) => {
    const reparasi = d.aktifRep
      .filter((j) => {
        const t = tanggalBulanJob(j).getTime();
        return t >= m.awal.getTime() && t <= m.akhir.getTime();
      })
      .reduce((a, j) => a + j.jumlah, 0);
    return { label: `Minggu ${m.nomor}`, rentang: `${dm(m.awal)} – ${dm(m.akhir)}`, servis: m.total.uangMasuk, reparasi, total: m.total.uangMasuk + reparasi };
  });
  const dibagi = s.marketing + s.pekerja + s.manajemen + r.manage;

  const sel = (n: number, warna = "") =>
    n === 0 ? <span className="text-muted/40">0</span> : <span className={warna}>{angka(n)}</span>;

  return (
    <>
      <PageHeader title="Rekap">
        <MonthSelect value={kunci} options={opsi} />
      </PageHeader>

      <Card className="rise rise-1 overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-5">
          <h2 className="font-semibold">Servis pasta per minggu</h2>
          <span className="text-sm text-muted">dikelompokkan berdasarkan tanggal selesai</span>
        </div>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[1080px] text-[0.9rem]">
            <thead>
              <tr>
                <Th>Periode</Th>
                <Th right>Gaming</Th>
                <Th right>Work</Th>
                <Th right>Clean</Th>
                <Th right>Mac</Th>
                <Th right>Masuk</Th>
                <Th right>Pasta</Th>
                <Th right>Untung</Th>
                <Th right>Lab</Th>
                <Th right>Mkt</Th>
                <Th right>Pekerja</Th>
                <Th right>Manaj</Th>
              </tr>
            </thead>
            <tbody>
              {minggu.map((m) => (
                <tr key={m.nomor} className={`border-t border-line ${m.total.jumlahJob === 0 ? "text-muted" : ""}`}>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold">Minggu {m.nomor}</span>{" "}
                    <span className="text-[0.8rem] text-muted">{dm(m.awal)} – {dm(m.akhir)}</span>
                  </td>
                  <td className="num px-4 py-3.5">{sel(m.gaming)}</td>
                  <td className="num px-4 py-3.5">{sel(m.work)}</td>
                  <td className="num px-4 py-3.5">{sel(m.cleaning)}</td>
                  <td className="num px-4 py-3.5">{sel(m.macbook)}</td>
                  <td className="num px-4 py-3.5">{sel(m.total.uangMasuk)}</td>
                  <td className="num px-4 py-3.5">{sel(m.total.modalPasta, "text-danger")}</td>
                  <td className="num px-4 py-3.5 font-semibold">{sel(m.total.keuntunganBersih)}</td>
                  <td className="num px-4 py-3.5">{sel(m.total.lab, "text-accent")}</td>
                  <td className="num px-4 py-3.5">{sel(m.total.marketing)}</td>
                  <td className="num px-4 py-3.5">{sel(m.total.pekerja)}</td>
                  <td className="num px-4 py-3.5">{sel(m.total.manajemen)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-line font-bold">
                <td className="px-4 py-4">Total {namaBulan(kunci).split(" ")[0]}</td>
                <td className="num px-4 py-4">{minggu.reduce((a, m) => a + m.gaming, 0)}</td>
                <td className="num px-4 py-4">{minggu.reduce((a, m) => a + m.work, 0)}</td>
                <td className="num px-4 py-4">{minggu.reduce((a, m) => a + m.cleaning, 0)}</td>
                <td className="num px-4 py-4">{minggu.reduce((a, m) => a + m.macbook, 0)}</td>
                <td className="num px-4 py-4">{angka(s.uangMasuk)}</td>
                <td className="num px-4 py-4">{angka(s.modalPasta)}</td>
                <td className="num px-4 py-4">{angka(s.keuntunganBersih)}</td>
                <td className="num px-4 py-4 text-accent">{angka(s.lab)}</td>
                <td className="num px-4 py-4">{angka(s.marketing)}</td>
                <td className="num px-4 py-4">{angka(s.pekerja)}</td>
                <td className="num px-4 py-4">{angka(s.manajemen)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      <Card className="rise rise-2 mt-4 p-6 lg:max-w-[640px]">
        <h2 className="mb-4 font-semibold">Gabungan dua lini</h2>
        <div className="space-y-2 text-[0.92rem]">
          <Row l="Uang masuk servis" v={angka(s.uangMasuk)} />
          <Row l="Uang masuk reparasi" v={angka(r.omzet)} />
        </div>
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-[0.92rem]">
          <Row l="Total masuk" v={angka(s.uangMasuk + r.omzet)} strong />
          <Row l="Modal pasta" v={`−${angka(s.modalPasta)}`} neg />
          <Row l="Dibayar ke Reparium" v={`−${angka(r.modal)}`} neg />
        </div>
        <div className="mt-3 space-y-2 border-t border-line pt-3 text-[0.92rem]">
          <Row l="Keuntungan bersih" v={angka(s.keuntunganBersih + r.keuntungan)} strong />
          <Row l="Dibagi ke orang" v={`−${angka(dibagi)}`} neg />
        </div>
        <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
          <span className="font-semibold">Masuk Kas Lab</span>
          <span className="num text-[1.9rem] font-bold text-accent">{rupiah(s.lab + r.kasLab)}</span>
        </div>
        <div className="mt-4 flex items-baseline justify-between rounded-lg bg-[#1c1a12] px-3 py-2.5 text-[0.92rem]">
          <span><span className="font-semibold text-amber">Tagihan</span> <span className="text-[0.8rem] text-muted">belum masuk · {d.tag.job} job</span></span>
          <span className="num font-semibold text-amber">{angka(d.tag.jumlah)}</span>
        </div>
        <p className="mt-3 text-xs text-muted">Hanya job selesai &amp; lunas yang dihitung sebagai uang masuk. Semua angka dijumlahkan dari job, tidak diketik.</p>
      </Card>

      {campaign && <CampaignCard data={campaign} bulan={namaBulan(kunci)} />}

      <Card className="rise rise-3 mt-4 p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Uang masuk per minggu · {namaBulan(kunci)}</h2>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-sky" /> Uang masuk</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-accent" /> Servis</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm bg-amber" /> Reparasi</span>
          </div>
        </div>
        <WeeklyChart data={grafik} />
        <p className="mt-3 text-xs text-muted">Job selesai &amp; lunas, dikelompokkan berdasarkan tanggal selesai.</p>
      </Card>
    </>
  );
}

function Row({ l, v, strong, neg }: { l: string; v: string; strong?: boolean; neg?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={strong ? "font-semibold" : "text-muted"}>{l}</span>
      <span className={`num ${strong ? "font-semibold" : ""} ${neg ? "text-danger" : ""}`}>{v}</span>
    </div>
  );
}
