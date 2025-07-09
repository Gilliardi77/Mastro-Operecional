
/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  experimental: {
    // This allows the Next.js dev server to accept requests from the
    // Firebase Studio preview URL.
    allowedDevOrigins: [
      "https://6000-firebase-studio-1751809876943.cluster-kc2r6y3mtba5mswcmol45orivs.cloudworkstations.dev",
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
