import Link from "next/link";

export function CustomerTabs({ aktif }: { aktif: "customer" | "instansi" }) {
  const tab = (id: "customer" | "instansi", label: string) => (
    <Link
      href={`/${id}`}
      className={`rounded-lg px-4 py-1.5 text-sm transition ${
        aktif === id ? "bg-panel2 font-semibold text-ink" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="inline-flex gap-1 rounded-xl border border-line bg-panel p-1">
      {tab("customer", "Customer")}
      {tab("instansi", "Instansi")}
    </div>
  );
}
