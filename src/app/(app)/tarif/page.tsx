import { db } from "@/lib/db";
import { angka, hariIniJakarta, isoTanggal, tglPendek } from "@/lib/format";
import { periodeBerlaku } from "@/lib/campaign";
import { hitungBagiHasil, modalPastaPerJob } from "@/lib/hitung";
import { periodeNormal, peringatanTarif } from "@/lib/queries";
import { NAMA_TIPE, URUTAN_TIPE } from "@/lib/tipe";
import { RefillForm } from "./refill-form";
import { Badge, Card, Notice, PageHeader, Th } from "@/components/ui";

export default async function TarifPage() {
  const [periode, lots, peringatan] = await Promise.all([
    db.ratePeriod.findMany({ include: { rates: true }, orderBy: [{ aktif: "desc" }, { mulai: "desc" }] }),
    db.pastaLot.findMany(),
    peringatanTarif(),
  ]);

  const hari = isoTanggal(hariIniJakarta());
  const berlakuId = periodeBerlaku(periode, hari)?.id; // tarif normal yang dipakai hari ini; yang mulainya di depan belum berlaku

  const stok = (["GAMING", "WORK"] as const).map((tipe) => {
    const l = lots.filter((x) => x.tipe === tipe);
    const ref = l.sort((a, b) => +b.tanggal - +a.tanggal)[0];
    return { tipe, ref, sisa: l.reduce((a, x) => a + x.sisaJob, 0) };
  });

  return (
    <>
      <PageHeader title="Tarif & promo" sub="harga dan pembagian per periode — job baru ikut yang aktif" />

      {peringatan.length > 0 && (
        <div className="rise rise-1 mb-4 space-y-3">
          {peringatan.map((p) => (
            <Notice key={p.teks} title="Perlu dicek">{p.teks}</Notice>
          ))}
        </div>
      )}

      <Card className="rise rise-2 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-[0.9rem]">
            <thead>
              <tr>
                <Th>Tipe</Th>
                <Th right>Harga</Th>
                <Th right>Pasta</Th>
                <Th right>Ongkir</Th>
                <Th right>Marketing</Th>
                <Th right>Pekerja</Th>
                <Th right>Manajemen</Th>
                <Th right>Kas Lab</Th>
              </tr>
            </thead>
            {periode.map((p) => (
              <tbody key={p.id}>
                <tr className={`border-t border-line ${p.id === berlakuId ? "bg-[#12201a]" : "bg-bg/40"}`}>
                  <td colSpan={8} className="label-caps px-4 py-3 !text-[0.72rem]">
                    <span className={periodeNormal(p.nama) ? "!text-ink" : "!text-sky"}>{p.nama.toUpperCase()}</span>
                    {p.id === berlakuId && <span className="ml-3 align-middle"><Badge tone="lunas">AKTIF</Badge></span>}
                    {p.aktif && !p.campaign && periodeNormal(p.nama) && isoTanggal(p.mulai) > hari && (
                      <span className="ml-3 align-middle"><Badge tone="kerja">MULAI {tglPendek(p.mulai).toUpperCase()}</Badge></span>
                    )}
                    {p.catatan && p.nama !== "Oktober 2026" && (
                      <span className="ml-3 font-normal normal-case tracking-normal text-muted">{p.catatan.split(".")[0]}</span>
                    )}
                  </td>
                </tr>
                {p.rates
                  .sort((a, b) => URUTAN_TIPE.indexOf(a.tipe) - URUTAN_TIPE.indexOf(b.tipe))
                  .map((r) => {
                    const { shareLab } = hitungBagiHasil({ jumlah: r.hargaServis, ...r });
                    const nol = (n: number) => (n === 0 ? <span className="text-muted/50">0</span> : angka(n));
                    return (
                      <tr key={r.id} className="border-t border-line transition-colors hover:bg-panel2/50">
                        <td className={`px-4 py-3.5 ${p.id === berlakuId ? "font-semibold" : ""}`}>{NAMA_TIPE[r.tipe]}</td>
                        <td className="num px-4 py-3.5">{angka(r.hargaServis)}</td>
                        <td className="num px-4 py-3.5 text-muted">{angka(r.modalPasta)}</td>
                        <td className="num px-4 py-3.5 text-muted">{nol(r.ongkir)}</td>
                        <td className="num px-4 py-3.5">{nol(r.shareMarketing)}</td>
                        <td className="num px-4 py-3.5">{nol(r.sharePekerja)}</td>
                        <td className="num px-4 py-3.5">{nol(r.shareManajemen)}</td>
                        <td className={`num px-4 py-3.5 font-semibold ${shareLab < 0 ? "text-danger" : p.id === berlakuId ? "text-amber" : ""}`}>{angka(shareLab)}</td>
                      </tr>
                    );
                  })}
              </tbody>
            ))}
          </table>
        </div>
      </Card>

      <div className="rise rise-3 mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-semibold">Modal pasta</h2>
            <span className="text-xs text-muted">harga tube dibagi jumlah job</span>
          </div>
          <div className="space-y-3">
            {stok.map(({ tipe, ref }) =>
              ref && (
                <div key={tipe} className="flex items-center justify-between rounded-xl bg-panel2 px-4 py-3.5">
                  <div>
                    <div className="font-medium">Pasta {tipe === "GAMING" ? "Gaming" : "Work"}</div>
                    <div className="text-[0.8rem] text-muted">
                      Rp {angka(ref.hargaTube)}
                      {ref.biayaTambahan > 0 && <> + {angka(ref.biayaTambahan)} biaya lain</>} ÷ {ref.jobPerTube} job
                    </div>
                  </div>
                  <div className="num font-semibold">{angka(modalPastaPerJob(ref.hargaTube + ref.biayaTambahan, ref.jobPerTube))}<span className="font-normal text-muted">/job</span></div>
                </div>
              ),
            )}
          </div>
        </Card>
        <Card className="p-6">
          <h2 className="mb-4 font-semibold">Stok tube</h2>
          <div className="space-y-3">
            {stok.map(({ tipe, ref, sisa }) => {
              const tipis = sisa <= (ref?.jobPerTube ?? 3);
              const tube = ref ? Math.ceil(sisa / ref.jobPerTube) : 0;
              return (
                <div key={tipe} className={`flex items-center justify-between rounded-xl px-4 py-3.5 ${tipis ? "border border-[#5a4417] bg-[#211c10]" : "bg-panel2"}`}>
                  <div>
                    <div className="font-medium">Pasta {tipe === "GAMING" ? "Gaming" : "Work"}</div>
                    <div className="text-[0.8rem] text-muted">{tube} tube — cukup {sisa} job lagi</div>
                  </div>
                  <div className={`num text-lg font-bold ${tipis ? "text-amber" : ""}`}>{sisa} job</div>
                </div>
              );
            })}
          </div>
          {stok.map(({ tipe, ref }) =>
            ref && <RefillForm key={tipe} tipe={tipe} nama={tipe === "GAMING" ? "Gaming" : "Work"} hargaTube={ref.hargaTube} jobPerTube={ref.jobPerTube} />,
          )}
          <p className="mt-4 text-xs leading-relaxed text-muted">
            Tiap job servis mengurangi satu jatah. Kalau jatah habis sebelum tube habis, angka pembagi di modal pasta perlu dikoreksi. Kalau harga tube berubah, tarif (modal pasta per job) tidak ikut berubah otomatis.
          </p>
        </Card>
      </div>
    </>
  );
}
