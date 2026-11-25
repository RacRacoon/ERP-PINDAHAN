import { auth } from "@/auth";

// Cek optimistis saja: belum login -> /login. Otorisasi sebenarnya tetap di layout & server action.
export const proxy = auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/login") {
    const url = new URL("/login", req.nextUrl.origin);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico).*)"],
};
