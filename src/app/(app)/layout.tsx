import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";
import { auth, signOut } from "@/auth";
import { db } from "@/lib/db";
import { hariIniJakarta, isoTanggal, tglPendek } from "@/lib/format";
import { periodeBerlaku } from "@/lib/campaign";
import { BottomNav, Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const hari = hariIniJakarta();
  const aktif = periodeBerlaku(await db.ratePeriod.findMany({ select: { nama: true, aktif: true, campaign: true, mulai: true } }), isoTanggal(hari));
  const nama = session.user?.name ?? "Admin";

  return (
    <div className="flex min-h-screen">
      <Sidebar>
        <div className="flex items-center gap-3 border-t border-line p-4">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent-dim text-sm font-bold text-white">
            {nama.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-semibold">{nama}</div>
            <div className="text-xs text-muted">admin</div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button aria-label="Keluar" title="Keluar" className="rounded-md p-2 text-muted transition hover:bg-panel2 hover:text-ink">
              <LogOut className="size-4" />
            </button>
          </form>
        </div>
      </Sidebar>
      <div className="min-w-0 flex-1 pb-20 md:pb-0">
        <Topbar tarifAktif={aktif?.nama ?? null} hariIni={`${tglPendek(hari)} ${hari.getUTCFullYear()}`} />
        <main className="mx-auto max-w-[1280px] px-6 py-8 md:px-10">{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
