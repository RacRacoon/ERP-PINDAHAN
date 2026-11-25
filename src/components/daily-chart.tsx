"use client";

import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis } from "recharts";

export type TitikHarian = { hari: number; label: string; jumlah: number };

function Tip({ active, payload }: { active?: boolean; payload?: { payload: TitikHarian }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-panel2 px-3 py-2 shadow-xl">
      <div className="font-mono text-xs text-muted">{p.label}</div>
      <div className="font-mono text-sm font-semibold text-ink">Rp {p.jumlah.toLocaleString("id-ID")}</div>
    </div>
  );
}

export function DailyChart({ data }: { data: TitikHarian[] }) {
  const maks = Math.max(...data.map((d) => d.jumlah), 0);
  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 4, bottom: 0 }} barCategoryGap={3}>
          <CartesianGrid vertical={false} stroke="#2b343a" strokeDasharray="2 4" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: "#2b343a" }}
            tick={{ fill: "#96a2aa", fontSize: 11, fontFamily: "var(--font-jb)" }}
            padding={{ left: 14, right: 14 }}
            interval={Math.max(0, Math.floor(data.length / 3) - 1)}
          />
          <Tooltip content={<Tip />} cursor={{ fill: "rgb(255 255 255 / 0.04)" }} />
          <Bar dataKey="jumlah" radius={[3, 3, 0, 0]} minPointSize={2}>
            {data.map((d) => (
              <Cell key={d.hari} fill={d.jumlah === 0 ? "#222b30" : d.jumlah === maks ? "#38d47f" : "#1f7a4d"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
