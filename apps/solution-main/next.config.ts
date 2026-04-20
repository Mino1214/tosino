import type { NextConfig } from "next";

const isProdBuild = process.env.NODE_ENV === "production";

const nextConfig: NextConfig = {
  ...(isProdBuild ? { output: "export" as const } : {}),
  images: {
    ...(isProdBuild ? { unoptimized: true } : {}),
  },
};

export default nextConfig;
