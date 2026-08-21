import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Item photos live in Supabase Storage — the project ref varies per
    // deployment (see NEXT_PUBLIC_SUPABASE_URL), so this allowlists any
    // *.supabase.co host rather than hardcoding one project's domain.
    // Letting next/image actually optimize these (resize, lazy-load,
    // serve modern formats) instead of falling back to `unoptimized` is
    // the fix for full-size camera photos loading in every item card.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
