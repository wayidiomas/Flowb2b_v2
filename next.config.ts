import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-lib'],
  experimental: {
    serverActions: {
      bodySizeLimit: '60mb',
    },
    middlewareClientMaxBodySize: '60mb',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'asahknimbggpzpoebmej.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
