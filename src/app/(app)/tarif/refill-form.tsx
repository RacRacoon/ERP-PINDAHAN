"use client";

import { useActionState } from "react";
import { PackagePlus } from "lucide-react";
import { refillPasta, type RefillState } from "./actions";

export function RefillForm({ tipe, nama, hargaTube, jobPerTube }: { tipe: "GAMING" | "WORK"; nama: string; hargaTube: number; jobPerTube: number }) {
  const [state, aksi, pending] = useActionState<RefillState, FormData>(refillPasta, undefined);
  return (
    <form action={aksi} className="mt-3 rounded-xl border border-line bg-panel2/40 p-4">
      <input type="hidden" name="tipe" value={tipe} />
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-sm font-medium">Refill pasta {nama}</span>
        <span className="font-mono text-xs text-muted">1 tube = {jobPerTube} job</span>
      </div>
      <div className="grid grid-cols-[70px_1fr_1fr] items-end gap-3">
        <label className="block text-xs text-muted">
          Tube
          <input name="tube" type="number" min={1} max={50} defaultValue={1} required className="field mt-1 font-mono" />
        </label>
        <label className="block text-xs text-muted">
          Harga per tube (Rp)
          <input name="hargaTube" type="number" min={0} step={100} defaultValue={hargaTube} required className="field mt-1 font-mono" />
        </label>
        <label className="block text-xs text-muted">
          Biaya lain (Rp)
          <input name="biayaTambahan" type="number" min={0} step={100} defaultValue={0} className="field mt-1 font-mono" />
        </label>
        <button
          disabled={pending}
          className="col-span-3 inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-[#06210f] transition active:scale-[0.98] disabled:opacity-60"
        >
          <PackagePlus className="size-4" /> {pending ? "Menyimpan…" : "Tambah stok"}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-accent">{state.ok}</p>}
    </form>
  );
}
