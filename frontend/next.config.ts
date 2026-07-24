/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_OFFLINE_MODE: process.env.NEXT_PUBLIC_OFFLINE_MODE ?? "true",
  },
};

export default nextConfig;
