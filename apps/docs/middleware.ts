import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'zh'];
const defaultLocale = 'en';

// Paths that should NOT be localized
const publicPaths = ['/docs', '/api', '/og', '/llms', '/_next', '/logo.svg', '/favicon.ico'];

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language') || '';
  // Match zh, zh-CN, zh-TW, etc. as a language tag boundary
  if (/\bzh\b/i.test(acceptLanguage)) return 'zh';
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip known public paths and static files (paths containing a dot, e.g. .svg, .ico)
  if (publicPaths.some(p => pathname.startsWith(p)) || pathname.includes('.')) {
    return NextResponse.next();
  }

  // Check if the pathname already has a locale
  const pathnameHasLocale = locales.some(
    locale => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return NextResponse.next();

  // Redirect to locale-prefixed path
  const locale = getLocale(request);
  const newUrl = new URL(`/${locale}${pathname}`, request.url);
  return NextResponse.redirect(newUrl);
}

// matcher pre-filters routes before middleware runs; publicPaths handles additional runtime checks
export const config = {
  matcher: ['/((?!_next|api|docs|og|llms|.*\\..*).*)'],
};
