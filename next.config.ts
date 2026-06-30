import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.25", "192.168.100.50"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
