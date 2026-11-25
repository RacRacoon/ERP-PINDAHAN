"use client";

import { useActionState } from "react";
import type { FormState } from "../servis/actions";
import { createInstansi, updateInstansi } from "./actions";

export type DataInstansi = { id: string; nama: string; jenis: string; catatan: string };

const JENIS = ["departemen", "himpunan", "lab", "perusahaan", "umum"];

const Label = ({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-sm text-muted">{children}</label>
);
const Err = ({ msg }: { msg?: string }) => (msg ? <p className="mt-1 text-xs text-danger">{msg}</p> : null);

export function FormInstansi({ edit }: { edit?: DataInstansi }) {
  const [state, aksi, pending] = useActionState<FormState, FormData>(
    edit ? updateInstansi.bind(null, edit.id) : createInstansi,
    undefined,
  );
  const fe = state?.fieldErrors ?? {};

  return (
    <form action={aksi} className="space-y-4 rounded-2xl border border-line bg-panel p-6">
      <div>
        <Label htmlFor="nama">Nama instansi</Label>
        <input id="nama" name="nama" defaultValue={edit?.nama} required autoFocus={!edit} placeholder="mis. Teknik Komputer ITS" className="field" />
        <Err msg={fe.nama} />
      </div>
      <div>
        <Label htmlFor="jenis">Jenis</Label>
        <select id="jenis" name="jenis" defaultValue={edit?.jenis ?? ""} className="field">
          <option value="">—</option>
          {JENIS.map((j) => <option key={j} value={j}>{j[0].toUpperCase() + j.slice(1)}</option>)}
        </select>
      </div>
      <div>
        <Label htmlFor="catatan">Catatan</Label>
        <textarea id="catatan" name="catatan" rows={3} defaultValue={edit?.catatan} maxLength={500} className="field resize-y" />
      </div>
      {state?.error && <p role="alert" className="rounded-lg bg-[#231313] px-3 py-2 text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-xl bg-accent py-3 font-semibold text-[#06210f] transition hover:shadow-[0_0_24px_rgb(56_212_127/0.35)] active:scale-[0.99] disabled:opacity-50">
        {pending ? "Menyimpan…" : edit ? "Simpan perubahan" : "Simpan instansi"}
      </button>
    </form>
  );
}
