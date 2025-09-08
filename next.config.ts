
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
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
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.sticgsa.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'ucarecdn.com',
        port: '',
        pathname: '/3336978a-7b33-42e1-a423-02631b746583/**',
      }
    ],
  },
};

export default nextConfig;
