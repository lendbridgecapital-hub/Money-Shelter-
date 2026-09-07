const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Produces a self-contained .next/standalone build (a minimal node_modules
  // pruned to just what's needed at runtime) — this is what the Dockerfile
  // in this repo copies into the final image. See DEPLOYMENT.md.
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }, { protocol: 'http', hostname: '**' }],
  },
  eslint: {
    // This starter ships without an ESLint config; run `npm run lint` after
    // adding one (e.g. `npx next lint`) if you want lint-on-build.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    // Belt-and-suspenders: some build environments don't pick up the "@/*"
    // path alias from tsconfig.json reliably. Registering it directly with
    // webpack means the "@/lib/..." imports throughout this app resolve
    // regardless of how the platform's build reads (or ignores) tsconfig.
    config.resolve.alias['@'] = path.join(__dirname, 'src');
    return config;
  },
};

module.exports = nextConfig;
