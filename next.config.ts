import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=()" },
  { key: "X-DNS-Prefetch-Control",    value: "on" },
  {
    // FIX P2: Aktiviran enforcement (bez -Report-Only).
    // unsafe-eval uklonjen — Next.js 15 ne zahtijeva eval u produkciji.
    // unsafe-inline ostaje jer Next.js inline skripte koristi za hydration.
    // Ako se pojave probleme s fontovima ili ikonama, dodati odgovarajuće src-ove.
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "object-src 'none'",
      "img-src 'self' data: blob: https://*.supabase.co https://preview.redd.it",
      "font-src 'self' data: https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Allow <img> tags from Supabase Storage (already using plain <img>, not next/image)
  // These patterns are needed if next/image is ever used
  images: {
    remotePatterns: [
      {
        // Supabase Storage — matches any Supabase project URL
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // picsum.photos only needed for dev mock banners — not used in production
      ...(process.env.NODE_ENV !== "production" ? [{
        protocol: "https" as const,
        hostname: "picsum.photos",
      }] : []),
    ],
  },

  // FIX P2: /profil/sacuvano → trajni redirect na /profil/sacuvani
  // Bolje od client-side redirect komponente — 308 Permanent na nivou Next.js
  async redirects() {
    return [
      {
        source: "/profil/sacuvano",
        destination: "/profil/sacuvani",
        permanent: true,
      },
    ];
  },

  experimental: {
    staleTimes: {
      dynamic: 30,
      static: 180,
    }
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      },
      {
        source: "/(oglasi|firme|gradovi|kategorije)(.*)",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=300" }
        ]
      },
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "public, s-maxage=30, stale-while-revalidate=120" }
        ]
      }
    ];
  }
};

export default nextConfig;
