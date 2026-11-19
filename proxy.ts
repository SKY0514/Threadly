import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { AUTH_ROUTES, BASE_URL, PUBLIC_ROUTES } from "./constants/routes";
import { cookies } from "next/headers";
import { verify } from "./actions/sessions";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // 초대 링크는 로그인 여부와 상관없이 일단 페이지까지 통과시킵니다 — 거기서
  // 토큰이 유효한지부터 확인하고, 유효할 때만 로그인을 요구해야 합니다.
  // 여기서 먼저 로그인/회원가입을 강제하면, 이미 죽은 링크를 위해 가입까지
  // 시키고 나서 실패하는 최악의 경험이 됩니다.
  if (pathname.startsWith("/invite/")) {
    return NextResponse.next();
  }

  const cookie = (await cookies()).get("session")?.value;
  const session = await verify(cookie);

  // 퍼블릭 라우트가 아닌데 세션이 없는 경우. (예: 홈 화면인데 세션이 없는 경우)
  if (!isPublicRoute && !session) {
    const loginUrl = new URL(AUTH_ROUTES.LOGIN, request.url);
    loginUrl.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  // 퍼블릭 라우트인데, 세션이 있는 경우. (예: 로그인 or 회원가입 페이지인데, 세션이 있는 경우)

  if (isPublicRoute && session) {
    return NextResponse.redirect(new URL(BASE_URL, request.nextUrl));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - files with an extension (public assets, e.g. /logo.png)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\..*).*)",
  ],
};
