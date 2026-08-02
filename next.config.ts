import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist's legacy build, which isn't meant to be
  // webpack-bundled — bundling it breaks its ESM/CJS interop at runtime.
  // Keeping it external lets Node require() it directly instead.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
