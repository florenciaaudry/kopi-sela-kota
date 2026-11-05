import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: ".next-local",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
