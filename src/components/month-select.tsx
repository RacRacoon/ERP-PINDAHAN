"use client";

import { usePathname, useRouter } from "next/navigation";

export function MonthSelect({
  value,
  options,
}: {
  value: string;
  options: { kunci: string; label: string }[];
}) {
  const router = useRouter();
  const path = usePathname();
  return (
    <select
      aria-label="Pilih bulan"
      className="field !w-auto cursor-pointer !py-2 font-medium"
      value={value}
      onChange={(e) => router.push(`${path}?bulan=${e.target.value}`)}
    >
      {options.map((o) => (
        <option key={o.kunci} value={o.kunci}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
