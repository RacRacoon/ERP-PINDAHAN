"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Contact, FileBarChart, FileText, LayoutDashboard, Tag, Users, Wrench } from "lucide-react";

type NavItem = { href: string; label: string; icon: typeof Users; match?: string[] };

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/servis", label: "Servis", icon: FileText },
  { href: "/reparasi", label: "Reparasi", icon: Wrench },
  { href: "/customer", label: "Customer", icon: Contact, match: ["/customer", "/instansi"] },
  { href: "/bagi-hasil", label: "Bagi hasil", icon: Users },
  { href: "/tarif", label: "Tarif", icon: Tag },
  { href: "/rekap", label: "Rekap", icon: BarChart3 },
  { href: "/laporan", label: "Laporan", icon: FileBarChart },
];

function adalahAktif(path: string, href: string, match?: string[]) {
  if (href === "/") return path === "/";
  return (match ?? [href]).some((m) => path.startsWith(m));
}

export function Sidebar({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  return (
    <aside className="sticky top-0 hidden print:!hidden h-screen w-[230px] shrink-0 flex-col border-r border-line bg-bg md:flex">
      <div className="flex h-12 items-center gap-2 border-b border-line px-5">
        <span className="size-2.5 rounded-full bg-[#f2706a]" />
        <span className="size-2.5 rounded-full bg-amber" />
        <span className="size-2.5 rounded-full bg-accent" />
        <span className="ml-2 font-mono text-xs text-muted">b4@erp</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const aktif = adalahAktif(path, href, match);
          return (
            <Link
              key={href}
              href={href}
              className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[0.9rem] transition-colors ${
                aktif ? "bg-panel2 font-medium text-ink" : "text-muted hover:bg-panel hover:text-ink"
              }`}
            >
              <Icon className={`size-[18px] ${aktif ? "text-accent" : "group-hover:text-ink"}`} strokeWidth={1.75} />
              {label}
            </Link>
          );
        })}
      </nav>
      {children}
    </aside>
  );
}

/** Navigasi bawah untuk layar kecil. */
export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex print:hidden border-t border-line bg-bg/95 backdrop-blur md:hidden">
      {NAV.map(({ href, label, icon: Icon, match }) => {
        const aktif = adalahAktif(path, href, match);
        return (
          <Link
            key={href}
            href={href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[0.65rem] ${aktif ? "text-accent" : "text-muted"}`}
          >
            <Icon className="size-5" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
