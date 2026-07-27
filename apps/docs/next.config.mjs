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
