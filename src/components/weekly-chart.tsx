"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type TitikMinggu = { label: string; rentang: string; total: number; servis: number; reparasi: number };

const ribu = (n: number) => (n === 0 ? "0" : n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} jt` : `${Math.round(n / 1000)} rb`);

function Tip({ active, payload }: { active?: boolean; payload?: { payload: TitikMinggu }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  const baris = [
    ["Uang masuk", p.total, "text-ink"],
    ["Servis", p.servis, "text-accent"],
    ["Reparasi", p.reparasi, "text-amber"],
  ] as const;
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2 shadow-xl">
      <div className="font-mono text-xs text-muted">{p.label} · {p.rentang}</div>
      {baris.map(([nama, nilai, warna]) => (
        <div key={nama} className="mt-1 flex items-center justify-between gap-6 font-mono text-sm">
          <span className="text-muted">{nama}</span>
          <span className={`font-semibold ${warna}`}>Rp {nilai.toLocaleString("id-ID")}</span>
        </div>
      ))}
    </div>
  );
}

export function WeeklyChart({ data }: { data: TitikMinggu[] }) {
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={3} barCategoryGap="24%">
          <CartesianGrid vertical={false} stroke="#2b343a" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#2b343a" }}
            tick={{ fill: "#96a2aa", fontSize: 11, fontFamily: "var(--font-jb)" }}
          />
          <YAxis
            width={52}
            tickLine={false}
            axisLine={false}
            tickFormatter={ribu}
            tick={{ fill: "#96a2aa", fontSize: 11, fontFamily: "var(--font-jb)" }}
          />
          <Tooltip content={<Tip />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
          <Bar dataKey="total" fill="#5ab0f5" radius={[3, 3, 0, 0]} minPointSize={2} />
          <Bar dataKey="servis" fill="#38d47f" radius={[3, 3, 0, 0]} minPointSize={2} />
          <Bar dataKey="reparasi" fill="#f2a93b" radius={[3, 3, 0, 0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
