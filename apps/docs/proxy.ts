import { createI18nMiddleware } from 'fumadocs-core/i18n/middleware';
import { i18n } from '@/lib/i18n';

// Next.js 16 proxy (formerly `middleware.ts`): redirects/rewrites requests to
// the appropriate locale based on the i18n config.
export default createI18nMiddleware(i18n);

export const config = {
  // Ignore Next internals, API routes, OG/LLM route handlers, and static assets.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|llms|og).*)'],
};
