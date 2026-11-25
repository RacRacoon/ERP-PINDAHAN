import { angka } from "@/lib/format";
import { NAMA_TIPE, URUTAN_TIPE } from "@/lib/tipe";
import type { ringkasanCampaign } from "@/lib/queries";
import { Card } from "@/components/ui";

type Ringkas = NonNullable<Awaited<ReturnType<typeof ringkasanCampaign>>>;

/** Bagian campaign "Ajak Teman" untuk rekap dan dashboard. Dipanggil hanya kalau bulan itu punya job campaign. */
export function CampaignCard({ data, bulan, ringkas = false }: { data: Ringkas; bulan: string; ringkas?: boolean }) {
  const tipe = URUTAN_TIPE.filter((t) => data.perTipe[t] > 0);
  return (
    <Card className="rise rise-3 mt-4 p-6">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Ajak Teman · {bulan}</h2>
        <span className="text-sm text-muted">
          {data.jumlahJob} job · {data.pasanganLengkap} pasangan lengkap
          {data.menunggu > 0 && <span className="text-amber"> · {data.menunggu} menunggu pasangan</span>}
        </span>
      </div>

      <div className={`grid gap-6 ${ringkas ? "lg:grid-cols-2" : "lg:grid-cols-3"}`}>
        {!ringkas && (
          <div>
            <div className="label-caps mb-2">Job per tipe</div>
            <div className="space-y-2 text-[0.92rem]">
              {tipe.map((t) => (
                <Baris key={t} l={NAMA_TIPE[t]} v={`${data.perTipe[t]} job`} />
              ))}
              <Baris l="Pasangan lengkap" v={String(data.pasanganLengkap)} strong />
              <Baris l="Menunggu pasangan" v={String(data.menunggu)} tone={data.menunggu > 0 ? "amber" : undefined} />
            </div>
          </div>
        )}

        <div>
          <div className="label-caps mb-2">Diskon yang diberikan</div>
          <div className="space-y-2 text-[0.92rem]">
            <Baris l="Total diskon" v={angka(data.diskon)} strong />
            <Baris l="Ditanggung Marketing" v={angka(data.marketing)} />
            <Baris l="Ditanggung Manajemen" v={angka(data.manajemen)} />
            {data.lain !== 0 && <Baris l="Lainnya (Pekerja / Kas Lab)" v={angka(data.lain)} tone="amber" />}
          </div>
        </div>

        <div>
          <div className="label-caps mb-2">Kas Lab · selesai &amp; lunas</div>
          <div className="space-y-2 text-[0.92rem]">
            <Baris l={`Job campaign (${data.selesaiCampaign})`} v={angka(data.kasLabCampaign)} tone="accent" />
            <Baris l={`Job normal (${data.selesaiNormal})`} v={angka(data.kasLabNormal)} tone="accent" />
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">
        Jumlah job dan diskon dihitung dari semua job campaign selain Batal. Diskon = harga tarif normal dikurangi harga job. Kas Lab hanya dari job selesai &amp; lunas. Semua ikut masuk total bulanan.
      </p>
    </Card>
  );
}

function Baris({ l, v, strong, tone }: { l: string; v: string; strong?: boolean; tone?: "amber" | "accent" }) {
  return (
    <div className="flex justify-between gap-4">
      <span className={strong ? "font-semibold" : "text-muted"}>{l}</span>
      <span className={`num ${strong ? "font-semibold" : ""} ${tone === "amber" ? "text-amber" : tone === "accent" ? "text-accent" : ""}`}>{v}</span>
    </div>
  );
}
