import Link from "next/link";
import { angka, hariIniJakarta, kunciBulan, namaBulan, namaBulanPendek, persen, rentangBulan, rupiah, tglPendek } from "@/lib/format";
import { banding } from "@/lib/banding";
import { tagihanSemua, cekAnomali, pembandingBulanLalu, pilihanBulan, ringkasanBulan, ringkasanCampaign, riwayatBulanan, stokPasta, tanggalBulanJob, tentukanBulan } from "@/lib/queries";
import { ButtonLink, Card, Kpi, PageHeader, StatusBadge, Th, TipeBadge } from "@/components/ui";
import { MonthSelect } from "@/components/month-select";
import { DailyChart } from "@/components/daily-chart";
import { MonthlyChart } from "@/components/monthly-chart";
import { CampaignCard } from "@/components/campaign-card";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ bulan?: string }> }) {
  const kunci = await tentukanBulan((await searchParams).bulan);
  const [opsi, d, lunas, riwayat, pasta, lalu] = await Promise.all([
    pilihanBulan(), ringkasanBulan(kunci), tagihanSemua(), riwayatBulanan(), stokPasta(), pembandingBulanLalu(kunci),
  ]);
  const { servis, reparasi, aktifServis, s, r } = d;
  const [anomali, campaign] = await Promise.all([cekAnomali(kunci, servis, reparasi), ringkasanCampaign(servis, aktifServis)]);

  const untung = s.keuntunganBersih + r.keuntungan;
  const omzet = s.uangMasuk + r.omzet;
  const kasLab = s.lab + r.kasLab;
  const gaming = aktifServis.filter((j) => j.tipe === "GAMING").length;
  const cleaning = aktifServis.filter((j) => j.tipe === "CLEANING").length;
  const macbook = aktifServis.filter((j) => j.tipe === "REPASTE_MACBOOK").length;
  const work = aktifServis.length - gaming - cleaning - macbook;

  // chart harian
  const { awal, akhir } = rentangBulan(kunci);
  const jmlHari = Math.round((akhir.getTime() - awal.getTime()) / 86_400_000);
  const perHari = new Array(jmlHari).fill(0);
  for (const j of aktifServis) perHari[tanggalBulanJob(j).getUTCDate() - 1] += j.jumlah;
  const titik = perHari.map((jumlah, i) => ({ hari: i + 1, label: `${i + 1} ${namaBulanPendek(kunci)}`, jumlah }));
  const hariAdaJob = perHari.filter((x) => x > 0).length;

  const bagi = [
    { nama: "Pekerja", nilai: s.pekerja, warna: "#a06b17" },
    { nama: "Manajemen", nilai: s.manajemen, warna: "#2e6fa3" },
    { nama: "Kas Lab", nilai: s.lab, warna: "#1f7a4d" },
    { nama: "Marketing", nilai: s.marketing, warna: "#6b4aa6" },
  ];
  const maks = Math.max(...bagi.map((b) => b.nilai), 1);

  // Pembanding bulan lalu. Bulan berjalan belum penuh, jadi selisihnya ditampilkan tanpa warna naik/turun.
  const berjalan = kunci >= kunciBulan(hariIniJakarta());
  const bandingKe = (sekarang: number, sebelumnya: number | null | undefined) => {
    // Awal bulan berjalan masih Rp 0: "turun 100%" hanya noise.
    if (!lalu || sebelumnya == null || (berjalan && sekarang === 0)) return undefined;
    const b = banding(sekarang, sebelumnya);
    if (!b) return undefined;
    return {
      ...b,
      pembanding: `vs ${namaBulan(lalu.kunciLalu).split(" ")[0]}${berjalan ? " · belum penuh" : ""}`,
      netral: berjalan,
      title: lalu.sumber === "arsip" ? `Angka ${namaBulan(lalu.kunciLalu)} dari laporan PDF, sebelum ERP dipakai` : undefined,
    };
  };

  return (
    <>
      <PageHeader
        title={namaBulan(kunci)}
        sub={`${gaming} laptop gaming · ${work} laptop biasa${cleaning ? ` · ${cleaning} cleaning` : ""}${macbook ? ` · ${macbook} repaste MacBook` : ""} · ${d.aktifRep.length} reparasi hardware${d.tag.job ? ` · ${d.tag.job} dalam tagihan` : ""}`}
        aside={<ButtonLink href="/servis/baru">Servis baru</ButtonLink>}
      >
        <MonthSelect value={kunci} options={opsi} />
      </PageHeader>

      <div className="rise rise-1 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Kpi label="Uang masuk" value={rupiah(omzet)} banding={bandingKe(omzet, lalu?.pemasukan)} sub={`selesai & lunas · servis ${angka(s.uangMasuk)} · reparasi ${angka(r.omzet)}`} />
        <Kpi label="Keuntungan bersih" value={rupiah(untung)} banding={bandingKe(untung, lalu?.laba)} sub={`margin gabungan ${persen(untung, omzet)}%`} />
        <Kpi label="Kas Lab" value={rupiah(kasLab)} tone="accent" banding={bandingKe(kasLab, lalu?.kasLab)} sub={`servis ${angka(s.lab)} · reparasi ${angka(r.kasLab)}`} />
        <Kpi
          label="Tagihan"
          value={rupiah(lunas.total)}
          tone={lunas.total > 0 ? "amber" : "default"}
          sub={lunas.daftar.length ? <span className="text-amber">{lunas.daftar.slice(0, 2).join(" · ")}{lunas.daftar.length > 2 ? ` +${lunas.daftar.length - 2}` : ""}</span> : "tidak ada tagihan"}
        />
      </div>

      <Card className="rise rise-2 mt-4 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-semibold">Sisa pasta</h2>
          <Link href="/tarif" className="text-sm font-medium text-accent hover:underline">
            Refill
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {pasta.map((p) => (
            <div key={p.tipe} className={`flex items-center justify-between rounded-xl px-4 py-3 ${p.tipis ? "border border-[#5a4417] bg-[#211c10]" : "bg-panel2"}`}>
              <div>
                <div className="font-medium">Pasta {p.nama}</div>
                <div className="text-[0.8rem] text-muted">
                  {p.tubeTeks}{p.tipis ? " · hampir habis" : ""}
                </div>
              </div>
              <div className={`num text-xl font-bold ${p.tipis ? "text-amber" : ""}`}>
                {p.sisa}
                <span className="ml-1 text-sm font-normal text-muted">job</span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {campaign && <CampaignCard data={campaign} bulan={namaBulan(kunci)} ringkas />}

      <div className="rise rise-2 mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">Uang masuk servis per hari</h2>
            <span className="font-mono text-xs text-muted">
              {hariAdaJob} hari ada job dari {jmlHari}
            </span>
          </div>
          <DailyChart data={titik} />
        </Card>

        <Card className="p-6">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="font-semibold">Bagi hasil servis</h2>
            <Link href={`/bagi-hasil?bulan=${kunci}`} className="text-sm font-medium text-accent hover:underline">
              Detail
            </Link>
          </div>
          <div className="space-y-3.5">
            {bagi.map((b) => (
              <div key={b.nama} className="grid grid-cols-[84px_1fr_auto] items-center gap-3">
                <span className="text-sm text-muted">{b.nama}</span>
                <div className="h-7 rounded-md bg-panel2">
                  <div
                    className="h-full rounded-md transition-[width] duration-700"
                    style={{ width: `${(b.nilai / maks) * 100}%`, background: b.warna }}
                  />
                </div>
                <span className="num w-[76px] text-sm font-semibold">{angka(b.nilai)}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <div className="mb-2 text-sm font-semibold text-amber">Perlu dicek</div>
            {anomali.length === 0 ? (
              <p className="text-sm text-muted">Tidak ada anomali. Semua pembagian balance.</p>
            ) : (
              <ul className="space-y-2">
                {anomali.map((a) => (
                  <li key={a} className="flex gap-2.5 text-sm leading-snug">
                    <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-amber" />
                    {a}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Card className="rise rise-3 mt-4 p-6">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-semibold">Tren pemasukan &amp; keuntungan</h2>
          <div className="flex items-center gap-4 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-sky" /> Pemasukan</span>
            <span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-full bg-accent" /> Keuntungan bersih</span>
          </div>
        </div>
        <MonthlyChart data={riwayat} tinggi={260} />
        <p className="mt-3 text-xs text-muted">Titik berongga = arsip laporan PDF (Agustus–September 2026). Mulai Oktober dari job selesai &amp; lunas.</p>
      </Card>

      <Card className="rise rise-3 mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5">
          <h2 className="font-semibold">Servis terakhir</h2>
          <Link href={`/servis?bulan=${kunci}`} className="text-sm font-medium text-accent hover:underline">
            Lihat semua
          </Link>
        </div>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full min-w-[720px] text-[0.9rem]">
            <thead>
              <tr>
                <Th>Masuk</Th>
                <Th>Model laptop</Th>
                <Th>Tipe</Th>
                <Th>PJ</Th>
                <Th>Marketing</Th>
                <Th>Status</Th>
                <Th right>Jumlah</Th>
              </tr>
            </thead>
            <tbody>
              {servis.slice(0, 5).map((j) => (
                <tr key={j.id} className="border-t border-line transition-colors hover:bg-panel2/50">
                  <td className="px-4 py-3.5 font-mono text-[0.82rem] text-muted">{tglPendek(j.tanggalMasuk)}</td>
                  <td className="px-4 py-3.5 font-medium">{j.modelLaptop}</td>
                  <td className="px-4 py-3.5"><TipeBadge tipe={j.tipe} /></td>
                  <td className="px-4 py-3.5">{j.pj.nama}</td>
                  <td className="px-4 py-3.5">{j.marketing?.nama ?? "—"}</td>
                  <td className="px-4 py-3.5"><StatusBadge status={j.status} lunas={j.lunas} /></td>
                  <td className="num px-4 py-3.5 font-medium">{angka(j.jumlah)}</td>
                </tr>
              ))}
              {servis.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted">Belum ada servis bulan ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
