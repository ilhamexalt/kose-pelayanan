import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: '/history',
        destination: '/riwayat-antrean',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
