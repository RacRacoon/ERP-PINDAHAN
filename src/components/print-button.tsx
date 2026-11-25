"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-[0.95rem] font-semibold text-[#06210f] transition hover:shadow-[0_0_24px_0_rgb(56_212_127/0.35)] active:scale-[0.98]"
    >
      <Printer className="size-4" strokeWidth={2.5} />
      Cetak / simpan PDF
    </button>
  );
}
