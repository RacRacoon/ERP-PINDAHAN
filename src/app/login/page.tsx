import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";

async function masuk(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/",
    });
  } catch (e) {
    if (e instanceof AuthError) redirect("/login?error=1");
    throw e; // redirect sukses dilempar sebagai error oleh Next
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await auth()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(600px 300px at 50% 20%, rgb(56 212 127 / 0.10), transparent 70%), radial-gradient(500px 400px at 85% 90%, rgb(90 176 245 / 0.06), transparent 70%)",
        }}
      />
      <div className="rise relative w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-2 font-mono text-sm text-muted">
          <span className="size-2.5 rounded-full bg-[#f2706a]" />
          <span className="size-2.5 rounded-full bg-amber" />
          <span className="size-2.5 rounded-full bg-accent" />
          <span className="ml-2">b4@erp ~ login</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          B4 <span className="text-accent">ERP</span>
        </h1>
        <p className="mt-1 mb-8 text-muted">Service Center — input dan monitoring.</p>

        <form action={masuk} className="space-y-4 rounded-2xl border border-line bg-panel p-6">
          <div>
            <label htmlFor="email" className="label-caps mb-1.5 block">Email</label>
            <input id="email" name="email" type="email" required autoComplete="username" autoFocus className="field" />
          </div>
          <div>
            <label htmlFor="password" className="label-caps mb-1.5 block">Password</label>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
          </div>
          {error && (
            <p role="alert" className="rounded-lg bg-[#231313] px-3 py-2 text-sm text-danger">
              Email atau password salah.
            </p>
          )}
          <button className="w-full rounded-xl bg-accent py-3 font-semibold text-[#06210f] transition hover:shadow-[0_0_24px_rgb(56_212_127/0.35)] active:scale-[0.99]">
            Masuk
          </button>
        </form>
      </div>
    </main>
  );
}
