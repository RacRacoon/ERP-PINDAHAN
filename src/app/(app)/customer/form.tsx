"use client";

import { useActionState } from "react";
import type { FormState } from "../servis/actions";
import { createCustomer, updateCustomer } from "./actions";

export type DataCustomer = { id: string; nama: string; noWa: string; instagram: string; instansi: string; catatan: string };

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-muted">{children}</label>
);
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs text-danger">{msg}</p> : null);

export function FormCustomer({ instansiList, edit }: { instansiList: string[]; edit?: DataCustomer }) {
  const [state, aksi, pending] = useActionState<FormState, FormData>(
    edit ? updateCustomer.bind(null, edit.id) : createCustomer,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={aksi} className="space-y-4 rounded-2xl border border-line bg-panel p-6">
      <div>
        <Label htmlFor="nama">Nama</Label>
        <input id="nama" name="nama" defaultValue={edit?.nama} required autoFocus={!edit} className="field" />
        <Err msg={fe.nama} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="noWa">Nomor WA</Label>
          <input id="noWa" name="noWa" defaultValue={edit?.noWa} inputMode="tel" placeholder="0812…" className="field font-mono" />
          <Err msg={fe.noWa} />
        </div>
        <div>
          <Label htmlFor="instagram">Instagram</Label>
          <input id="instagram" name="instagram" defaultValue={edit?.instagram} placeholder="@username" autoCapitalize="none" className="field font-mono" />
          <Err msg={fe.instagram} />
        </div>
      </div>
      <p className="-mt-2 text-xs text-muted">Isi salah satu atau dua-duanya.</p>
      <div>
        <Label htmlFor="instansi">Instansi</Label>
        <input id="instansi" name="instansi" defaultValue={edit?.instansi} list="daftar-instansi" placeholder="mis. HIMATEKKOM, Umum" className="field" />
        <datalist id="daftar-instansi">
          {instansiList.map((n) => <option key={n} value={n} />)}
        </datalist>
      </div>
      <div>
        <Label htmlFor="catatan">Catatan</Label>
        <textarea id="catatan" name="catatan" rows={3} defaultValue={edit?.catatan} maxLength={500} className="field resize-y" />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-[#231313] px-3 py-2 text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-accent py-3 font-semibold text-[#06210f] transition hover:shadow-[0_0_24px_rgb(56_212_127/0.35)] active:scale-[0.99] disabled:opacity-50">
        {pending ? "Menyimpan…" : edit ? "Simpan perubahan" : "Simpan customer"}
      </button>
    </form>
  );
}
