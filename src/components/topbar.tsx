"use client";

import { usePathname } from "next/navigation";
import { Cari } from "./cari";

export function Topbar({ tarifAktif, hariIni }: { tarifAktif: string | null; hariIni: string }) {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-20 flex print:hidden h-12 items-center gap-4 border-b border-line bg-bg/90 px-6 backdrop-blur md:px-10">
      <span className="hidden w-40 shrink-0 truncate font-mono text-xs text-muted xl:inline">~{path === "/" ? "/dashboard" : path}</span>
      <Cari />
      <span className="ml-auto hidden shrink-0 font-mono text-xs text-muted lg:inline">
        {tarifAktif && (
          <>
            tarif aktif: <span className="text-accent">{tarifAktif}</span>
            <span className="mx-2 text-line">|</span>
          </>
        )}
        {hariIni}
      </span>
    </header>
  );
}
