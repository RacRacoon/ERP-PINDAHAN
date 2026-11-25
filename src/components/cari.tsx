"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cari, type HasilCari } from "@/app/(app)/cari-actions";

const JUDUL: Record<HasilCari["jenis"], string> = {
  servis: "Servis",
  reparasi: "Reparasi",
  customer: "Customer",
  instansi: "Instansi",
};
const URUTAN: HasilCari["jenis"][] = ["servis", "reparasi", "customer", "instansi"];

/** Kotak cari di bar atas: servis, reparasi, customer, instansi. Tekan "/" untuk fokus, panah + Enter untuk memilih. */
export function Cari() {
  const router = useRouter();
  const path = usePathname();
  const idList = useId();
  const input = useRef<HTMLInputElement>(null);
  const wadah = useRef<HTMLDivElement>(null);

  const [q, setQ] = useState("");
  // Hasil menyimpan kata yang dicarinya, jadi hasil basi dari ketikan sebelumnya tidak pernah tampil.
  const [diambil, setDiambil] = useState<{ kata: string; data: HasilCari[] }>({ kata: "", data: [] });
  const [buka, setBuka] = useState(false);
  const [sorot, setSorot] = useState(0);

  const kata = q.trim();
  const siap = kata.length >= 2;
  const hasil = diambil.kata === kata ? diambil.data : [];
  const memuat = siap && diambil.kata !== kata;

  // Urutan tampil dikelompokkan per jenis, jadi indeks panah harus mengikuti urutan itu.
  const urut = URUTAN.flatMap((j) => hasil.filter((h) => h.jenis === j));

  useEffect(() => {
    if (!siap) return;
    let batal = false;
    const t = setTimeout(async () => {
      let data: HasilCari[] = [];
      try {
        data = await cari(kata);
      } catch {
        // gagal mencari: tampil sebagai "tidak ada hasil"
      }
      if (!batal) {
        setDiambil({ kata, data });
        setSorot(0);
      }
    }, 220);
    return () => {
      batal = true;
      clearTimeout(t);
    };
  }, [kata, siap]);

  // Tutup kalau pindah halaman (termasuk tombol back) atau klik di luar.
  const [pathLama, setPathLama] = useState(path);
  if (path !== pathLama) {
    setPathLama(path);
    setBuka(false);
  }
  useEffect(() => {
    const klikLuar = (e: MouseEvent) => {
      if (!wadah.current?.contains(e.target as Node)) setBuka(false);
    };
    document.addEventListener("mousedown", klikLuar);
    return () => document.removeEventListener("mousedown", klikLuar);
  }, []);

  // "/" memfokuskan kotak cari, kecuali sedang mengetik di isian lain.
  useEffect(() => {
    const tombol = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) return;
      e.preventDefault();
      input.current?.focus();
    };
    document.addEventListener("keydown", tombol);
    return () => document.removeEventListener("keydown", tombol);
  }, []);

  const pilih = (h: HasilCari) => {
    setBuka(false);
    setQ("");
    input.current?.blur();
    router.push(h.href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setBuka(false);
      input.current?.blur();
    } else if (e.key === "ArrowDown" && urut.length) {
      e.preventDefault();
      setBuka(true);
      setSorot((s) => (s + 1) % urut.length);
    } else if (e.key === "ArrowUp" && urut.length) {
      e.preventDefault();
      setSorot((s) => (s - 1 + urut.length) % urut.length);
    } else if (e.key === "Enter" && buka && urut[sorot]) {
      e.preventDefault();
      pilih(urut[sorot]);
    }
  };

  let nomorUrut = -1;
  return (
    <div ref={wadah} className="relative min-w-0 flex-1 md:max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" strokeWidth={1.75} />
      <input
        ref={input}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setBuka(true);
        }}
        onFocus={() => setBuka(true)}
        onKeyDown={onKey}
        role="combobox"
        aria-expanded={buka && siap}
        aria-controls={idList}
        aria-autocomplete="list"
        aria-label="Cari"
        placeholder="Cari customer, laptop, WA, IG"
        maxLength={60}
        className="h-8 w-full rounded-lg border border-line bg-panel pl-9 pr-9 text-[0.85rem] text-ink outline-none transition placeholder:text-muted focus:border-accent"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[0.68rem] text-muted md:block">/</kbd>

      {buka && siap && (
        <div
          id={idList}
          role="listbox"
          className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-panel p-1.5 shadow-[0_12px_40px_rgb(0_0_0/0.45)] md:min-w-[460px]"
        >
          {urut.length === 0 ? (
            <p className="px-3 py-4 text-sm text-muted">{memuat ? "Mencari…" : `Tidak ada hasil untuk "${kata}".`}</p>
          ) : (
            URUTAN.map((j) => {
              const baris = hasil.filter((h) => h.jenis === j);
              if (!baris.length) return null;
              return (
                <div key={j} className="py-1">
                  <div className="label-caps px-3 pb-1 pt-1.5">{JUDUL[j]}</div>
                  {baris.map((h) => {
                    const idx = ++nomorUrut;
                    const aktif = idx === sorot;
                    return (
                      <button
                        type="button"
                        key={`${h.jenis}-${h.id}`}
                        role="option"
                        aria-selected={aktif}
                        onMouseEnter={() => setSorot(idx)}
                        onClick={() => pilih(h)}
                        className={`block w-full rounded-lg px-3 py-2 text-left transition-colors ${aktif ? "bg-panel2" : ""}`}
                      >
                        <div className="truncate text-[0.9rem] font-medium">{h.judul}</div>
                        <div className="truncate font-mono text-[0.75rem] text-muted">{h.sub}</div>
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
