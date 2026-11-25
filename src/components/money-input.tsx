"use client";

import { angka } from "@/lib/format";

/**
 * Kolom uang rupiah: tampil berformat ribuan (925.000), nilai mentah dikirim lewat input tersembunyi.
 * Sengaja bukan type="number": itu memaksa kelipatan `step` dan menolak nilai seperti 882.500.
 */
export function MoneyInput({
  id,
  name,
  value,
  onChange,
  required,
  className = "",
}: {
  id?: string;
  name?: string;
  value: number;
  onChange: (n: number) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        required={required}
        value={value ? angka(value) : ""}
        onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
        onFocus={(e) => e.target.select()}
        className={`field num font-mono ${className}`}
      />
    </>
  );
}
