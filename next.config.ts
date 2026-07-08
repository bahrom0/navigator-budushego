import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.100.25", "192.168.100.50", "192.168.56.1", "10.183.242.235"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
