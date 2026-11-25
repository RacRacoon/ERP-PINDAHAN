import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

// Satu user, kredensial dari env (RENCANA §4).
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const email = String(c?.email ?? "").trim().toLowerCase();
        const password = String(c?.password ?? "");
        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
        const hash = process.env.ADMIN_PASSWORD_HASH;
        if (!adminEmail || !hash || email !== adminEmail) return null;
        if (!(await bcrypt.compare(password, hash))) return null;
        return { id: "admin", email: adminEmail, name: process.env.ADMIN_NAMA ?? "Admin" };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
});
