"use client";

import { useState } from "react";
import { jenisKontak } from "@/lib/kontak";

/**
 * Satu kolom untuk nomor WA atau akun Instagram. Jenisnya dikenali dari isinya:
 * angka = WhatsApp, `@username` atau huruf = Instagram. Server membaca ulang dengan aturan yang sama.
 */
export function KontakInput({ defaultValue, error, name = "customerKontak" }: { defaultValue?: string; error?: string; name?: string }) {
  const [nilai, setNilai] = useState(defaultValue ?? "");
  const jenis = jenisKontak(nilai);

  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={name} className="whitespace-nowrap text-sm text-muted">WA / Instagram</label>
        {jenis && (
          <span className={`rounded-md px-1.5 py-0.5 text-[0.68rem] font-semibold ${jenis === "wa" ? "bg-[#12331f] text-accent" : "bg-[#2a1f3d] text-[#b79cf0]"}`}>
            {jenis === "wa" ? "WhatsApp" : "Instagram"}
          </span>
        )}
      </div>
      <input
        id={name}
        name={name}
        value={nilai}
        onChange={(e) => setNilai(e.target.value)}
        placeholder="0812… atau @username"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        className="field font-mono"
      />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
