"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TitikBulan = { kunci: string; label: string; pemasukan: number; laba: number; arsip: boolean };

const juta = (n: number) => (n === 0 ? "0" : `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt`);

function Tip({ active, payload }: { active?: boolean; payload?: { payload: TitikBulan }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2 shadow-xl">
      <div className="font-mono text-xs text-muted">
        {p.label}
        {p.arsip && " · arsip laporan"}
      </div>
      <div className="mt-1 flex items-center justify-between gap-6 font-mono text-sm">
        <span className="text-muted">Pemasukan</span>
        <span className="font-semibold text-ink">Rp {p.pemasukan.toLocaleString("id-ID")}</span>
      </div>
      <div className="flex items-center justify-between gap-6 font-mono text-sm">
        <span className="text-muted">Keuntungan</span>
        <span className="font-semibold text-accent">Rp {p.laba.toLocaleString("id-ID")}</span>
      </div>
    </div>
  );
}

type TitikProps = { cx?: number; cy?: number; payload?: TitikBulan };

/** Titik arsip digambar berongga, titik dari job penuh. */
const titik = (warna: string) =>
  function Titik({ cx, cy, payload }: TitikProps) {
    if (cx === undefined || cy === undefined || !payload) return <g />;
    return payload.arsip ? (
      <circle cx={cx} cy={cy} r={4.5} fill="#171c20" stroke={warna} strokeWidth={2} />
    ) : (
      <circle cx={cx} cy={cy} r={4.5} fill={warna} stroke="#171c20" strokeWidth={2} />
    );
  };

export function MonthlyChart({ data, tinggi = 300 }: { data: TitikBulan[]; tinggi?: number }) {
  return (
    <div className="w-full" style={{ height: tinggi }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#2b343a" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#2b343a" }}
            tick={{ fill: "#96a2aa", fontSize: 11, fontFamily: "var(--font-jb)" }}
            padding={{ left: 24, right: 24 }}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tickFormatter={juta}
            tick={{ fill: "#96a2aa", fontSize: 11, fontFamily: "var(--font-jb)" }}
          />
          <Tooltip content={<Tip />} cursor={{ stroke: "#2b343a" }} />
          <Line dataKey="pemasukan" type="linear" stroke="#5ab0f5" strokeWidth={2.5} dot={titik("#5ab0f5")} activeDot={{ r: 6 }} isAnimationActive={false} />
          <Line dataKey="laba" type="linear" stroke="#38d47f" strokeWidth={2.5} dot={titik("#38d47f")} activeDot={{ r: 6 }} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
