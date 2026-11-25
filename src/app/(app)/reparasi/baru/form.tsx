"use client";

import { useActionState, useState } from "react";
import { hitungReparasi, PERSEN_KAS_LAB_REPARASI_BARU } from "@/lib/hitung";
import { angka } from "@/lib/format";
import { MoneyInput } from "@/components/money-input";
import { KontakInput } from "@/components/kontak-input";
import { createRepairJob, updateRepairJob } from "../actions";
import type { FormState } from "../../servis/actions";

export type DataEditReparasi = {
  id: string;
  tanggalMasuk: string;
  tanggalSelesai: string;
  modelLaptop: string;
  tipe: string;
  masalah: string;
  penyelesaian: string;
  customerNama: string;
  customerKontak: string;
  customerInstansi: string;
  pembayaran: string;
  status: "BOOKING" | "DIKERJAKAN" | "SELESAI";
  lunas: boolean;
  transfer: boolean;
  jumlah: number;
  modalReparium: number;
  persenKasLab: number;
};

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-muted">{children}</label>
);
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs text-danger">{msg}</p> : null);

export function FormReparasi({
  hariIni,
  instansiList,
  edit,
}: {
  hariIni: string;
  instansiList: string[];
  edit?: DataEditReparasi;
}) {
  const [state, aksi, pending] = useActionState<FormState, FormData>(
    edit ? updateRepairJob.bind(null, edit.id) : createRepairJob,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};
  const [jumlah, setJumlah] = useState(edit?.jumlah ?? 0);
  const [modal, setModal] = useState(edit?.modalReparium ?? 0);
  const [pct, setPct] = useState(edit?.persenKasLab ?? PERSEN_KAS_LAB_REPARASI_BARU);
  const h = hitungReparasi({ jumlah, modalReparium: modal, persenKasLab: pct });
  const rugi = h.keuntungan < 0;
  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

  return (
    <form action={aksi} className="grid items-start gap-5 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-semibold">Perangkat &amp; masalah</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="tanggalMasuk">Tanggal masuk</Label>
              <input id="tanggalMasuk" name="tanggalMasuk" type="date" defaultValue={edit?.tanggalMasuk ?? hariIni} required className="field font-mono" />
            </div>
            <div>
              <Label htmlFor="modelLaptop">Model / perangkat</Label>
              <input id="modelLaptop" name="modelLaptop" defaultValue={edit?.modelLaptop} placeholder="mis. Lenovo LOQ" required autoFocus={!edit} className="field" />
              <Err msg={fe.modelLaptop} />
            </div>
            <div>
              <Label htmlFor="masalah">Masalah</Label>
              <input id="masalah" name="masalah" defaultValue={edit?.masalah} placeholder="Keyboard gabisa dipencet" required className="field" />
              <Err msg={fe.masalah} />
            </div>
            <div>
              <Label htmlFor="penyelesaian">Penyelesaian</Label>
              <input id="penyelesaian" name="penyelesaian" defaultValue={edit?.penyelesaian} placeholder="Ganti keyboard" className="field" />
            </div>
            <div>
              <Label htmlFor="tipe">Tipe</Label>
              <select id="tipe" name="tipe" defaultValue={edit?.tipe ?? ""} className="field">
                <option value="">—</option>
                <option value="GAMING">Gaming</option>
                <option value="WORK">Work</option>
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
            <div className="mt-4 grid items-end gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="tanggalSelesai">Tanggal selesai</Label>
                <input id="tanggalSelesai" name="tanggalSelesai" type="date" defaultValue={edit.tanggalSelesai} className="field font-mono" />
                <Err msg={fe.tanggalSelesai} />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-panel2 px-4 py-3 text-sm">
                <input type="checkbox" name="lunas" defaultChecked={edit.lunas} className="size-4 accent-[#38d47f]" />
                Sudah lunas
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-panel2 px-4 py-3 text-sm">
                <input type="checkbox" name="transfer" defaultChecked={edit.transfer} className="size-4 accent-[#38d47f]" />
                Manage ditransfer
              </label>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-panel p-6">
          <h2 className="mb-4 font-semibold">Customer <span className="text-sm font-normal text-muted">· opsional</span></h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <div>
              <Label htmlFor="pembayaran">Pembayaran</Label>
              <select id="pembayaran" name="pembayaran" defaultValue={edit ? edit.pembayaran : "QRIS"} className="field">
                <option value="">Belum bayar</option>
                {["QRIS", "DANA", "TUNAI", "TRANSFER"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
        </section>
      </div>

      <aside className="rounded-2xl border border-line bg-panel p-6 lg:sticky lg:top-20">
        <h2 className="mb-4 font-semibold">Hitungan</h2>
        <div className="space-y-3">
          <div>
            <Label htmlFor="jumlah">Harga ke customer</Label>
            <MoneyInput id="jumlah" name="jumlah" required value={jumlah} onChange={setJumlah} />
            <Err msg={fe.jumlah} />
          </div>
          <div>
            <Label htmlFor="modalReparium">Dibayar ke Reparium</Label>
            <MoneyInput id="modalReparium" name="modalReparium" required value={modal} onChange={setModal} />
            <Err msg={fe.modalReparium} />
          </div>
          <div>
            <Label htmlFor="persenKasLab">Kas Lab (%)</Label>
            <input id="persenKasLab" name="persenKasLab" type="number" min={0} max={100} value={pct} onChange={(e) => setPct(Math.min(100, num(e.target.value)))} className="field num font-mono" />
          </div>
        </div>

        <div className="mt-5 space-y-1.5 border-t border-line pt-4 text-[0.92rem]">
          <div className="flex justify-between"><span className="text-muted">Keuntungan</span><span className={`num font-semibold ${rugi ? "text-danger" : ""}`}>{angka(h.keuntungan)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Kas Lab · {pct}%</span><span className="num text-accent">{angka(h.kasLab)}</span></div>
          <div className="flex justify-between"><span className="text-muted">Manage · sisa</span><span className="num">{angka(h.manage)}</span></div>
        </div>

        {state?.error && <p role="alert" className="mt-4 rounded-lg bg-[#231313] px-3 py-2 text-sm text-danger">{state.error}</p>}
        <button disabled={pending || rugi || !jumlah} className="mt-5 w-full rounded-xl bg-accent py-3.5 font-semibold text-[#06210f] transition hover:shadow-[0_0_24px_rgb(56_212_127/0.35)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none">
          {pending ? "Menyimpan…" : edit ? "Simpan perubahan" : "Simpan reparasi"}
        </button>
      </aside>
    </form>
  );
}
