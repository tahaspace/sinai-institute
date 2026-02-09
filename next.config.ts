import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // ⚠️ تجاهل أخطاء TypeScript أثناء البناء للإنتاج
    ignoreBuildErrors: true,
  },
  eslint: {
    // تجاهل أخطاء ESLint أثناء البناء
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};

export default nextConfig;
