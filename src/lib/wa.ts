/** Normalisasi nomor WA ke 62xxxxxxxxxx. Null kalau tidak masuk akal. */
export function normalisasiWa(input: string): string | null {
  let n = input.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (n.startsWith("0")) n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  return /^62\d{8,13}$/.test(n) ? n : null;
}
