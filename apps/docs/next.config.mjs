import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Docs content lives at the repo root (`content/`), outside this app, so the
  // Turbopack root has to stay the repo root — Next infers it from the root
  // lockfile. Pinning `turbopack.root` here breaks every `../../../content`
  // import, and the two-lockfile warning it silences is expected now that this
  // app is not a pnpm workspace member.
  // Pages that moved keep their old URLs (hotcrm#2604). Each rule is written
  // once without a locale (the default locale has no prefix) and once with the
  // zh prefixes. Redirects run before the i18n proxy.
  async redirects() {
    const moved = [
      // Revenue had no app of its own: its pages are part of Sales now.
      ['/docs/revenue', '/docs/sales'],
      ['/docs/revenue/:slug*', '/docs/sales/:slug*'],
    ];
    return moved.flatMap(([from, to]) => [
      { source: from, destination: to, permanent: true },
      {
        source: `/:lang(en|zh-Hans|zh-Hant)${from}`,
        destination: `/:lang${to}`,
        permanent: true,
      },
    ]);
  },
  async rewrites() {
    return [
      {
        source: '/docs/:path*.mdx',
        destination: '/llms.mdx/docs/:path*',
      },
    ];
  },
};

export default withMDX(config);
