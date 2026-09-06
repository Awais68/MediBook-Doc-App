import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig, guardFor } from "@/auth.config";
import { ROLE_HOME } from "@/lib/constants";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const user = req.auth?.user;
  const guard = guardFor(pathname);

  // Signed-in users should not sit on the auth screens.
  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL(ROLE_HOME[user.role] ?? "/dashboard", req.url));
  }

  if (!guard) return NextResponse.next();

  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (!guard.roles.includes(user.role)) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
