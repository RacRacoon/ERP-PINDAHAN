import Link from "next/link";
import { ArrowDown, ArrowUp, Minus, Plus } from "lucide-react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`rounded-2xl border border-line bg-panel ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  sub,
  children,
  aside,
}: {
  title: string;
  sub?: React.ReactNode;
  children?: React.ReactNode; // di sebelah judul (mis. pemilih bulan)
  aside?: React.ReactNode; // kanan (mis. tombol)
}) {
  return (
    <div className="rise mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
      <div>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-[1.9rem] font-semibold leading-tight tracking-tight">{title}</h1>
          {children}
        </div>
        {sub && <p className="mt-1 text-[0.95rem] text-muted">{sub}</p>}
      </div>
      {aside}
    </div>
  );
}

export function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-[0.95rem] font-semibold text-[#06210f] shadow-[0_0_0_0_rgb(56_212_127/0)] transition hover:shadow-[0_0_24px_0_rgb(56_212_127/0.35)] active:scale-[0.98]"
    >
      <Plus className="size-4" strokeWidth={2.5} />
      {children}
    </Link>
  );
}

// Tombol aksi di baris tabel. Ikon untuk aksi yang jarang dipakai (Invoice, Edit, Batal), teks untuk aksi alur kerja (Selesai, Lunas).
const aksiDasar = "inline-flex items-center justify-center rounded-md border border-line text-muted transition hover:border-accent hover:text-accent";
export const aksiTeks = `${aksiDasar} h-8 px-2.5 text-[0.72rem] md:h-7`;
export const aksiIkon = `${aksiDasar} size-8 md:size-7`;
export const aksiIkonBahaya = `${aksiDasar} size-8 md:size-7 hover:!border-danger hover:!text-danger`;

export function Kpi({
  label,
  value,
  sub,
  tone = "default",
  className = "",
  banding,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  tone?: "default" | "accent" | "amber";
  className?: string;
  /** Perubahan dari bulan lalu. `netral`: tanpa warna naik/turun (mis. bulan yang belum penuh). */
  banding?: { arah: "naik" | "turun" | "sama"; teks: string; pembanding: string; netral?: boolean; title?: string };
}) {
  const warna = tone === "accent" ? "text-accent" : tone === "amber" ? "text-amber" : "text-ink";
  const ring = tone === "accent" ? "border-accent-dim bg-[linear-gradient(180deg,rgb(56_212_127/0.07),transparent)]" : "border-line";
  return (
    <div className={`rounded-2xl border ${ring} bg-panel p-4 sm:p-5 ${className}`}>
      <div className="label-caps">{label}</div>
      <div className={`mt-2 font-mono text-[1.05rem] sm:text-[1.65rem] font-bold leading-none tracking-tight ${warna}`}>{value}</div>
      {banding && (
        <div
          title={banding.title}
          className={`mt-2.5 flex items-center gap-1.5 text-[0.82rem] ${
            banding.netral || banding.arah === "sama" ? "text-muted" : banding.arah === "naik" ? "text-accent" : "text-danger"
          }`}
        >
          {banding.arah === "naik" ? <ArrowUp className="size-3.5" strokeWidth={2.5} /> : banding.arah === "turun" ? <ArrowDown className="size-3.5" strokeWidth={2.5} /> : <Minus className="size-3.5" strokeWidth={2.5} />}
          <span className="font-mono font-semibold">{banding.teks}</span>
          <span className="text-muted">{banding.pembanding}</span>
        </div>
      )}
      {sub && <div className={`${banding ? "mt-1.5" : "mt-2.5"} text-[0.85rem] text-muted`}>{sub}</div>}
    </div>
  );
}

const TONE = {
  gaming: "bg-[#3a2c10] text-amber",
  work: "bg-[#262e34] text-[#b4bec5]",
  lunas: "bg-[#12331f] text-accent",
  booking: "bg-[#3a2c10] text-amber",
  kerja: "bg-[#12293d] text-sky",
  batal: "bg-[#3b1d1c] text-danger",
  violet: "bg-[#2a2145] text-violet",
  sky: "bg-[#12293d] text-sky",
  amber: "bg-[#3a2c10] text-amber",
  green: "bg-[#12331f] text-accent",
} as const;

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof TONE;
  children: React.ReactNode;
}) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function TipeBadge({ tipe }: { tipe: "GAMING" | "WORK" | "CLEANING" | "REPASTE_MACBOOK" | null }) {
  if (!tipe) return <span className="text-muted">—</span>;
  if (tipe === "GAMING") return <Badge tone="gaming">Gaming</Badge>;
  if (tipe === "CLEANING") return <Badge tone="sky">Cleaning</Badge>;
  if (tipe === "REPASTE_MACBOOK") return <Badge tone="violet">MacBook</Badge>;
  return <Badge tone="work">Work</Badge>;
}

export function StatusBadge({ status, lunas }: { status: string; lunas: boolean }) {
  if (status === "BATAL") return <Badge tone="batal">Batal</Badge>;
  if (status === "BOOKING") return <Badge tone="booking">Booking</Badge>;
  if (status === "DIKERJAKAN") return <Badge tone="kerja">{lunas ? "Dikerjakan · lunas" : "Dikerjakan"}</Badge>;
  return lunas ? <Badge tone="lunas">Selesai · lunas</Badge> : <Badge tone="amber">Belum lunas</Badge>;
}

export function Notice({
  title,
  children,
  tone = "amber",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "amber" | "red";
}) {
  const c =
    tone === "amber"
      ? "border-[#5a4417] bg-[#211c10] text-[#e9d9b2]"
      : "border-[#5a2422] bg-[#231313] text-[#f1c9c7]";
  const t = tone === "amber" ? "text-amber" : "text-danger";
  return (
    <div className={`rounded-xl border p-4 text-[0.88rem] leading-relaxed ${c}`}>
      {title && <div className={`mb-1 font-semibold ${t}`}>{title}</div>}
      {children}
    </div>
  );
}

export function Th({
  children,
  right,
  className = "",
}: {
  children?: React.ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <th className={`label-caps px-4 py-3.5 font-medium ${right ? "text-right" : "text-left"} ${className}`}>{children}</th>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-14 text-center text-muted">{children}</div>;
}
