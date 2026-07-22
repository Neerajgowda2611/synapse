import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Public routes — no auth check in proxy (token is in localStorage, checked client-side)
const publicPaths = ["/login", "/auth/callback", "/logout/callback", "/api/auth/callback/zitadel"]

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public/).*)"],
}
