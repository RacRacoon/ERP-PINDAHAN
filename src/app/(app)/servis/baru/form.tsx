"use client";

import { startTransition, useActionState, useState } from "react";
import { hitungBagiHasil } from "@/lib/hitung";
import { NAMA_TIPE, URUTAN_TIPE, type Tipe } from "@/lib/tipe";
import { angka, tglPendek } from "@/lib/format";
import { NAMA_PERAN, labelTarif, pilihPeriodeAwal, type PeranReferral } from "@/lib/campaign";
import { createServiceJob, updateServiceJob, type FormState } from "../actions";
import { tambahMarketing } from "../orang-actions";
import { Notice } from "@/components/ui";
import { KontakInput } from "@/components/kontak-input";

type Rate = {
  tipe: Tipe;
  hargaServis: number;
  modalPasta: number;
  ongkir: number;
  shareMarketing: number;
  sharePekerja: number;
  shareManajemen: number;
};
type Periode = {
  id: string;
  nama: string;
  aktif: boolean;
  campaign: boolean;
  mulai: string;
  selesai: string | null;
  rates: Rate[];
  peringatan: string[];
};
type Menunggu = { id: string; ratePeriodId: string; peran: PeranReferral | null; label: string };
type Orang = { id: string; nama: string; peran: string };

/** Data job yang sedang diedit. Tipe dan tarif dikunci, karena itu snapshot saat job dibuat. */
export type DataEdit = {
  id: string;
  ratePeriodId: string;
  tipe: Tipe;
  tanggalMasuk: string;
  tanggalSelesai: string;
  modelLaptop: string;
  keluhan: string;
  catatan: string;
  customerNama: string;
  customerKontak: string;
  customerInstansi: string;
  pjId: string;
  marketingId: string;
  pembayaran: string;
  status: "BOOKING" | "DIKERJAKAN" | "SELESAI";
  lunas: boolean;
  jumlah: number;
  modalPasta: number;
  ongkir: number;
  shareMarketing: number;
  sharePekerja: number;
  shareManajemen: number;
  referralKode: string | null;
  referralPeran: PeranReferral | null;
};

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-muted">
    {children}
  </label>
);
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs text-danger">{msg}</p> : null);

export function FormServis({
  periode,
  menunggu,
  orang: orangAwal,
  hariIni,
  instansiList,
  edit,
}: {
  periode: Periode[];
  menunggu: Menunggu[];
  orang: Orang[];
  hariIni: string;
  instansiList: string[];
  edit?: DataEdit;
}) {
  const [state, aksi, pending] = useActionState<FormState, FormData>(
    edit ? updateServiceJob.bind(null, edit.id) : createServiceJob,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  // Saat form dibuka selalu tarif normal yang aktif. Tarif campaign dipilih sendiri per job.
  const awal = pilihPeriodeAwal(periode, hariIni);
  const [periodeId, setPeriodeId] = useState(edit?.ratePeriodId ?? awal.id);
  const [tipe, setTipe] = useState<Tipe>(edit?.tipe ?? "GAMING");
  const p = periode.find((x) => x.id === periodeId)!;
  const rate = p.rates.find((r) => r.tipe === tipe);

  // Nilai bisa diubah per job (override). Harga akhir = harga tarif - diskon, atau diketik langsung.
  const [ov, setOv] = useState<{ mkt?: number; pkj?: number; mnj?: number }>(
    edit ? { mkt: edit.shareMarketing, pkj: edit.sharePekerja, mnj: edit.shareManajemen } : {},
  );
  const [akhir, setAkhir] = useState<number | null>(edit?.jumlah ?? null);
  const [modeDiskon, setModeDiskon] = useState<"rp" | "persen">("rp");
  const [inputDiskon, setInputDiskon] = useState(0); // Rp, atau persen kalau mode persen
  const tarifHarga = rate?.hargaServis ?? 0;
  // Saat edit, modal pasta dan ongkir memakai snapshot job, bukan tarif periode sekarang.
  const modal = edit?.modalPasta ?? rate?.modalPasta ?? 0;
  const ongkirVal = edit?.ongkir ?? rate?.ongkir ?? 0;
  const diskonRp =
    akhir !== null
      ? Math.max(0, tarifHarga - akhir)
      : Math.min(tarifHarga, modeDiskon === "rp" ? inputDiskon : Math.round((tarifHarga * inputDiskon) / 100));
  const jumlah = akhir ?? tarifHarga - diskonRp;
  const diskonTampil =
    akhir !== null
      ? modeDiskon === "rp"
        ? diskonRp
        : tarifHarga ? Math.round((diskonRp / tarifHarga) * 10000) / 100 : 0
      : inputDiskon;
  const mkt = ov.mkt ?? rate?.shareMarketing ?? 0;
  const pkj = ov.pkj ?? rate?.sharePekerja ?? 0;
  const mnj = ov.mnj ?? rate?.shareManajemen ?? 0;

  const hasil = rate
    ? hitungBagiHasil({
        jumlah, modalPasta: modal, ongkir: ongkirVal,
        shareMarketing: mkt, sharePekerja: pkj, shareManajemen: mnj,
      })
    : { keuntunganBersih: 0, shareLab: 0 };

  const labTanpaDiskon = rate
    ? hitungBagiHasil({
        jumlah: tarifHarga, modalPasta: modal, ongkir: ongkirVal,
        shareMarketing: mkt, sharePekerja: pkj, shareManajemen: mnj,
      }).shareLab
    : 0;

  const [pjId, setPjId] = useState(edit?.pjId ?? "");
  const [mktId, setMktId] = useState(edit?.marketingId ?? "");
  const [orang, setOrang] = useState(orangAwal);
  const nama = (id: string) => orang.find((o) => o.id === id)?.nama;
  const teknisi = orang.filter((o) => o.peran !== "MARKETING");
  const marketing = orang.filter((o) => o.peran !== "TEKNISI");

  // Tambah marketing baru langsung dari form, lalu otomatis terpilih.
  const [tambah, setTambah] = useState<{ buka: boolean; nama: string; error: string; info: string; proses: boolean }>({
    buka: false, nama: "", error: "", info: "", proses: false,
  });
  const simpanMarketing = async () => {
    setTambah((t) => ({ ...t, proses: true, error: "", info: "" }));
    const r = await tambahMarketing(tambah.nama);
    if (!r.ok) {
      setTambah((t) => ({ ...t, proses: false, error: r.error }));
      return;
    }
    setOrang((daftar) => [...daftar.filter((o) => o.id !== r.orang.id), r.orang].sort((a, b) => a.nama.localeCompare(b.nama)));
    setMktId(r.orang.id);
    setTambah({ buka: false, nama: "", error: "", info: r.info ?? "", proses: false });
  };
  const reset = () => {
    setOv({});
    setAkhir(null);
    setInputDiskon(0);
  };
  const labNegatif = hasil.shareLab < 0;

  // Campaign "Ajak Teman"
  const [peran, setPeran] = useState<PeranReferral | "">(edit?.referralPeran ?? "");
  const [pasanganId, setPasanganId] = useState("");
  const calonPasangan = menunggu.filter((m) => m.ratePeriodId === periodeId && (!peran || m.peran !== peran));
  const gantiPeriode = (id: string) => {
    const baru = periode.find((x) => x.id === id)!;
    setPeriodeId(id);
    // tipe yang tidak ada di tarif baru (mis. Cleaning di campaign) diganti ke tipe pertama yang tersedia
    if (!baru.rates.some((r) => r.tipe === tipe)) {
      const pertama = URUTAN_TIPE.find((t) => baru.rates.some((r) => r.tipe === t));
      if (pertama) setTipe(pertama);
    }
    setPasanganId("");
    reset();
  };

  return (
    <form
      // Dikirim manual (bukan action={aksi}) supaya React tidak mengosongkan isian saat server menolak simpan.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => aksi(fd));
      }}
      className="grid items-start gap-5 lg:grid-cols-[1fr_380px]"
    >
      {/* nilai terhitung ikut dikirim; server tetap memvalidasi & menyalin modal dari Rate */}
      <input type="hidden" name="ratePeriodId" value={periodeId} />
      <input type="hidden" name="tipe" value={tipe} />
      <input type="hidden" name="jumlah" value={jumlah} />
      <input type="hidden" name="shareMarketing" value={mkt} />
      <input type="hidden" name="sharePekerja" value={pkj} />
      <input type="hidden" name="shareManajemen" value={mnj} />
      {p.campaign && !edit && (
        <>
          <input type="hidden" name="referralPeran" value={peran} />
          <input type="hidden" name="referralPasanganId" value={pasanganId} />
        </>
      )}

      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-semibold">Laptop</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tanggalMasuk">Tanggal masuk</Label>
              <input
                id="tanggalMasuk"
                name="tanggalMasuk"
                type="date"
                defaultValue={edit?.tanggalMasuk ?? hariIni}
                min={p.campaign ? p.mulai : undefined}
                max={p.campaign && p.selesai ? p.selesai : undefined}
                required
                className="field font-mono"
              />
              <Err msg={fe.tanggalMasuk} />
            </div>
            <div>
              <Label htmlFor="modelLaptop">Model laptop</Label>
              <input id="modelLaptop" name="modelLaptop" defaultValue={edit?.modelLaptop} placeholder="mis. Asus ROG Strix G15" required autoFocus={!edit} className="field" />
              <Err msg={fe.modelLaptop} />
            </div>
          </div>

          <div className="mt-4">
            <Label>Tipe</Label>
            <div className="flex flex-wrap gap-3">
              {URUTAN_TIPE.map((t) => {
                const r = p.rates.find((x) => x.tipe === t);
                const on = tipe === t;
                return (
                  <button
                    type="button"
                    key={t}
                    disabled={!r || !!edit}
                    onClick={() => { setTipe(t); reset(); }}
                    className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition disabled:opacity-40 ${
                      on ? "border-accent bg-[#12331f]" : "border-line bg-panel2 hover:border-[#3a464e]"
                    }`}
                  >
                    <span className={`grid size-4 place-items-center rounded-full border-2 ${on ? "border-accent" : "border-muted"}`}>
                      {on && <span className="size-1.5 rounded-full bg-accent" />}
                    </span>
                    <span className="font-semibold">{NAMA_TIPE[t]}</span>
                    <span className="font-mono text-muted">{r ? `${t === "CLEANING" ? "mulai " : ""}${angka(r.hargaServis)}` : "—"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {edit && <p className="mt-2 text-xs text-muted">Tipe dan tarif dikunci karena sudah disalin ke pesanan ini. Kalau salah tipe, batalkan lalu buat pesanan baru.</p>}

          <div className="mt-4">
            <Label htmlFor="keluhan">Keluhan</Label>
            <textarea id="keluhan" name="keluhan" rows={3} defaultValue={edit?.keluhan} placeholder="Panas banget pas ngegame, kipas kenceng terus" className="field resize-y" />
          </div>
          <div className="mt-4">
            <Label htmlFor="catatan">Catatan {diskonRp > 0 && <span className="text-amber">· tulis alasan diskon</span>}</Label>
            <input id="catatan" name="catatan" defaultValue={edit?.catatan} maxLength={300} placeholder="mis. diskon repaste bareng servis besar" className="field" />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-semibold">Customer <span className="text-sm font-normal text-muted">· opsional, tapi sebaiknya diisi</span></h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="customerNama">Nama</Label>
              <input id="customerNama" name="customerNama" defaultValue={edit?.customerNama} className="field" />
              <Err msg={fe.customerNama} />
            </div>
            <KontakInput defaultValue={edit?.customerKontak} error={fe.customerKontak} />
            <div>
              <Label htmlFor="customerInstansi">Instansi</Label>
              <input id="customerInstansi" name="customerInstansi" defaultValue={edit?.customerInstansi} list="daftar-instansi" placeholder="mis. HIMATEKKOM, Umum" className="field" />
              <datalist id="daftar-instansi">
                {instansiList.map((n) => <option key={n} value={n} />)}
              </datalist>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-semibold">Orang &amp; pembayaran</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="pjId">PJ (yang ngerjain)</Label>
              <select id="pjId" name="pjId" required value={pjId} onChange={(e) => setPjId(e.target.value)} className="field">
                <option value="" disabled>Pilih…</option>
                {teknisi.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
              </select>
              <Err msg={fe.pjId} />
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between">
                <label htmlFor="marketingId" className="text-sm text-muted">Marketing (yang bawa)</label>
                {!tambah.buka && (
                  <button
                    type="button"
                    onClick={() => setTambah((t) => ({ ...t, buka: true, info: "", error: "" }))}
                    className="text-xs text-accent hover:underline"
                  >
                    + Tambah
                  </button>
                )}
              </div>
              <select id="marketingId" name="marketingId" value={mktId} onChange={(e) => setMktId(e.target.value)} className="field">
                <option value="">— tanpa marketing —</option>
                {marketing.map((o) => <option key={o.id} value={o.id}>{o.nama}</option>)}
              </select>
              {tambah.buka && (
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    value={tambah.nama}
                    onChange={(e) => setTambah((t) => ({ ...t, nama: e.target.value, error: "" }))}
                    onKeyDown={(e) => {
                      // Enter di sini hanya menambah marketing, bukan mengirim form servis.
                      if (e.key === "Enter") { e.preventDefault(); if (!tambah.proses) simpanMarketing(); }
                      if (e.key === "Escape") setTambah({ buka: false, nama: "", error: "", info: "", proses: false });
                    }}
                    placeholder="Nama marketing baru"
                    maxLength={60}
                    aria-label="Nama marketing baru"
                    className="field min-w-0 flex-1"
                  />
                  <button
                    type="button"
                    disabled={tambah.proses || tambah.nama.trim().length < 2}
                    onClick={simpanMarketing}
                    className="rounded-lg border border-line bg-panel2 px-3.5 text-sm transition hover:border-accent hover:text-accent disabled:opacity-40"
                  >
                    {tambah.proses ? "…" : "Simpan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTambah({ buka: false, nama: "", error: "", info: "", proses: false })}
                    className="rounded-lg px-2 text-sm text-muted hover:text-ink"
                  >
                    Batal
                  </button>
                </div>
              )}
              <Err msg={tambah.error} />
              {tambah.info && <p className="mt-1 text-xs text-muted">{tambah.info}</p>}
            </div>
            <div>
              <Label htmlFor="pembayaran">Pembayaran</Label>
              <select id="pembayaran" name="pembayaran" defaultValue={edit ? edit.pembayaran : "QRIS"} className="field">
                <option value="">Belum bayar</option>
                {["QRIS", "DANA", "TUNAI", "TRANSFER"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="periode">Tarif</Label>
              <select id="periode" value={periodeId} disabled={!!edit} onChange={(e) => gantiPeriode(e.target.value)} className="field">
                {periode.filter((x) => x.id === periodeId || x.aktif || !x.selesai || x.selesai >= hariIni).map((x) => (
                  <option key={x.id} value={x.id}>{labelTarif(x.nama)}{x.id === awal.id ? " — aktif" : x.aktif && !x.campaign && x.mulai > hariIni ? ` — mulai ${tglPendek(new Date(x.mulai + "T00:00:00Z"))}` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="status">{edit ? "Status" : "Status awal"}</Label>
              <select id="status" name="status" defaultValue={edit?.status ?? "DIKERJAKAN"} className="field">
                <option value="BOOKING">Booking</option>
                <option value="DIKERJAKAN">Dikerjakan</option>
                <option value="SELESAI">Selesai</option>
              </select>
            </div>
          </div>
          {edit && (
            <div className="mt-4 grid items-end gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="tanggalSelesai">Tanggal selesai</Label>
                <input id="tanggalSelesai" name="tanggalSelesai" type="date" defaultValue={edit.tanggalSelesai} className="field font-mono" />
                <Err msg={fe.tanggalSelesai} />
                <p className="mt-1 text-xs text-muted">Dipakai kalau status Selesai. Kosong = hari ini.</p>
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-panel2 px-4 py-3 text-sm">
                <input type="checkbox" name="lunas" defaultChecked={edit.lunas} className="size-4 accent-[#38d47f]" />
                Sudah lunas
              </label>
            </div>
          )}
        </section>

        {p.campaign && (
          <section className="rounded-2xl border border-[#1f4a6b] bg-[#101c26] p-6">
            <h2 className="mb-1 font-semibold">{labelTarif(p.nama)}</h2>
            <p className="mb-4 text-sm text-muted">
              Berlaku {p.mulai} sampai {p.selesai ?? "seterusnya"}. Pengajak dan temannya sama-sama memakai tarif ini. Teman harus customer baru. Cleaning tidak ikut.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Peran di campaign</Label>
                <div className="flex gap-3">
                  {(["PENGAJAK", "TEMAN"] as const).map((x) => (
                    <button
                      type="button"
                      key={x}
                      disabled={!!edit}
                      onClick={() => { setPeran(x); setPasanganId(""); }}
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed ${
                        peran === x ? "border-sky bg-[#12293d] text-sky" : "border-line bg-panel2 text-muted hover:border-[#3a464e] hover:text-ink"
                      }`}
                    >
                      {NAMA_PERAN[x]}
                    </button>
                  ))}
                </div>
                <Err msg={fe.referralPeran} />
              </div>
              {!edit && (
                <div>
                  <Label htmlFor="pasangan">Pasangan</Label>
                  <select id="pasangan" value={pasanganId} onChange={(e) => setPasanganId(e.target.value)} className="field">
                    <option value="">— belum ada · menunggu pasangan —</option>
                    {calonPasangan.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.peran ? NAMA_PERAN[m.peran] : ""} · {m.label}
                      </option>
                    ))}
                  </select>
                  <Err msg={fe.referralPasanganId} />
                  <p className="mt-1 text-xs text-muted">Pilih job pasangan yang sudah tercatat. Kosongkan kalau pasangannya belum datang.</p>
                </div>
              )}
              {edit && (
                <div>
                  <Label>Kode pasangan</Label>
                  <div className="field font-mono">{edit.referralKode ?? "—"}</div>
                </div>
              )}
            </div>
            {peran === "TEMAN" && !edit && (
              <div className="mt-4">
                <Label htmlFor="alasanTeman">Alasan kalau bukan customer baru <span className="text-muted">· opsional</span></Label>
                <input id="alasanTeman" name="alasanTeman" maxLength={200} placeholder="Isi hanya kalau diminta setelah menyimpan" className="field" />
                <Err msg={fe.alasanTeman} />
              </div>
            )}
          </section>
        )}
      </div>

      {/* hitungan langsung */}
      <aside className="rounded-2xl border border-line bg-panel p-6 lg:sticky lg:top-20">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-semibold">Hitungan</h2>
          <span className="text-xs text-muted">{NAMA_TIPE[tipe]} · {p.campaign ? labelTarif(p.nama) : p.nama.split(" ")[0]}</span>
        </div>

        <Baris label={tipe === "CLEANING" ? "Harga mulai dari" : "Harga tarif"}><span className="num">{angka(tarifHarga)}</span></Baris>
        <Baris label="Diskon">
          <div className="flex items-center gap-1.5">
            <div className="flex overflow-hidden rounded-lg border border-line text-xs">
              {(["rp", "persen"] as const).map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => { setModeDiskon(m); setAkhir(null); setInputDiskon(0); }}
                  className={`px-2 py-1.5 transition ${modeDiskon === m ? "bg-[#12331f] font-semibold text-accent" : "bg-panel2 text-muted hover:text-ink"}`}
                >
                  {m === "rp" ? "Rp" : "%"}
                </button>
              ))}
            </div>
            <input
              type="text"
              inputMode="decimal"
              aria-label="Diskon"
              value={modeDiskon === "rp" ? angka(diskonTampil) : String(diskonTampil).replace(".", ",")}
              onChange={(e) => {
                const v = modeDiskon === "rp" ? Number(e.target.value.replace(/\D/g, "")) : Number(e.target.value.replace(",", ".").replace(/[^\d.]/g, ""));
                setAkhir(null);
                setInputDiskon(Number.isFinite(v) ? Math.min(v, modeDiskon === "rp" ? tarifHarga : 100) : 0);
              }}
              onFocus={(e) => e.target.select()}
              className="field num !w-[92px] !px-3 !py-1.5 font-mono"
            />
          </div>
        </Baris>
        <Baris label="Harga akhir">
          <Edit value={jumlah} onChange={(n) => setAkhir(n)} />
        </Baris>
        {tipe === "CLEANING" && (
          <p className="mt-1 text-xs leading-relaxed text-muted">
            Harga cleaning mulai dari {angka(tarifHarga)}. Naikkan Harga akhir kalau pekerjaannya lebih berat; selisihnya masuk Kas Lab kecuali jatah di bawah diubah.
          </p>
        )}
        <Baris label="Modal pasta">{modal === 0 ? <span className="num text-muted">tanpa pasta</span> : <span className="num text-danger">−{angka(modal)}</span>}</Baris>
        {ongkirVal > 0 && <Baris label="Ongkir"><span className="num text-danger">−{angka(ongkirVal)}</span></Baris>}
        <div className="my-3 flex items-baseline justify-between border-t border-line pt-3">
          <span className="font-semibold">Keuntungan bersih</span>
          <span className="num text-xl font-semibold">{angka(hasil.keuntunganBersih)}</span>
        </div>

        <div className="label-caps mt-5 mb-2">Bagi hasil — bisa diubah</div>
        <Baris label={`Marketing${nama(mktId) ? " · " + nama(mktId) : ""}`}>
          <Edit value={mkt} onChange={(n) => setOv((o) => ({ ...o, mkt: n }))} />
        </Baris>
        <Baris label={`Pekerja${nama(pjId) ? " · " + nama(pjId) : ""}`}>
          <Edit value={pkj} onChange={(n) => setOv((o) => ({ ...o, pkj: n }))} />
        </Baris>
        <Baris label="Manajemen">
          <Edit value={mnj} onChange={(n) => setOv((o) => ({ ...o, mnj: n }))} />
        </Baris>

        <div className="mt-4 flex items-end justify-between border-t border-line pt-4">
          <div>
            <div className="font-semibold">Kas Lab</div>
            <div className="text-xs text-muted">sisa setelah dibagi</div>
          </div>
          <div className={`num text-[2rem] font-bold leading-none ${labNegatif ? "text-danger" : "text-accent"}`}>
            {angka(hasil.shareLab)}
          </div>
        </div>

        {diskonRp > 0 && !labNegatif && (
          <p className="mt-3 rounded-lg bg-[#211c10] px-3 py-2 text-xs leading-relaxed text-[#e9d9b2]">
            Diskon Rp {angka(diskonRp)} ditanggung Kas Lab: tanpa diskon Rp {angka(labTanpaDiskon)}. Ubah jatah di atas kalau mau dibagi ke yang lain.
          </p>
        )}
        {labNegatif && (
          <div className="mt-4"><Notice tone="red" title="Pembagian melebihi keuntungan">Kas Lab negatif. Kurangi jatah atau naikkan harga.</Notice></div>
        )}
        {p.peringatan.length > 0 && (
          <div className="mt-4"><Notice title="Periksa tarif ini">{p.peringatan.join(" ")}</Notice></div>
        )}
        {state?.error && (
          <p role="alert" className="mt-4 rounded-lg bg-[#231313] px-3 py-2 text-sm text-danger">{state.error}</p>
        )}

        <button
          disabled={pending || !rate || labNegatif || (p.campaign && !edit && !peran)}
          className="mt-5 w-full rounded-xl bg-accent py-3.5 font-semibold text-[#06210f] transition hover:shadow-[0_0_24px_rgb(56_212_127/0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {pending ? "Menyimpan…" : edit ? "Simpan perubahan" : "Simpan servis"}
        </button>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {edit
            ? "Perubahan langsung ikut ke daftar servis, bagi hasil, dan rekap bulanan."
            : "Sekali simpan langsung masuk ke daftar servis, bagi hasil, dan rekap bulanan. Nilai tarif disalin ke job ini, jadi mengubah tarif nanti tidak mengubah laporan lama."}
        </p>
      </aside>
    </form>
  );
}

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5 text-[0.92rem]">
      <span className="text-muted">{label}</span>
      {children}
    </div>
  );
}

function Edit({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      value={angka(value)}
      onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
      onFocus={(e) => e.target.select()}
      className="field num !w-[120px] !px-3 !py-1.5 font-mono"
    />
  );
}
