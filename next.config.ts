import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.ygoprodeck.com" },
      { protocol: "https", hostname: "images.pokemontcg.io" },
      { protocol: "https", hostname: "images.digimoncard.io" },
      { protocol: "https", hostname: "digimoncard.io" },
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "**.cardtrader.com" },
      { protocol: "https", hostname: "product-images.cardtrader.com" },
    ],
  },
};

export default nextConfig;
