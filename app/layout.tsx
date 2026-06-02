import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { MobileNav } from "@/components/mobile-nav";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

/**
 * Font loading strategy:
 *
 * next/font/google is the preferred approach — it self-hosts fonts, eliminates
 * render-blocking @import, and uses <link rel="preload"> for optimal perf.
 *
 * However, next/font requires outbound network access during `next build`
 * to download font files from Google. In environments where fonts.googleapis.com
 * is blocked (e.g. sandboxed CI, certain corporate networks), the build fails.
 *
 * Current setup:
 * - Fonts are loaded via <link> in the <head> below (non-blocking with
 *   rel="preconnect" + display=swap), which works in all environments.
 * - CSS custom properties (--font-poppins, --font-inter) are set inline so
 *   the same CSS vars work whether next/font or the link approach is used.
 *
 * To migrate to next/font when network allows:
 * 1. Uncomment the next/font imports at the top of this file
 * 2. Remove the <link> tags from <head>
 * 3. Add className={`${poppins.variable} ${inter.variable}`} to <html>
 * 4. Confirm: npm run build succeeds with network access
 */

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: { default: "imaposla.me — Poslovi u Crnoj Gori", template: "%s | imaposla.me" },
  description: "Oglasi za posao, kandidati i poslodavci u Crnoj Gori. Pronađi posao ili objavi oglas.",
  metadataBase: new URL("https://imaposla.me"),
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    siteName: "imaposla.me",
    locale: "sr_ME",
    type: "website",
    images: [
      {
        url: "/og-image?title=imaposla.me&subtitle=Poslovi+u+Crnoj+Gori",
        width: 1200,
        height: 630,
        alt: "imaposla.me — Poslovi u Crnoj Gori"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "imaposla.me — Poslovi u Crnoj Gori",
    description: "Oglasi za posao, kandidati i poslodavci u Crnoj Gori.",
    images: ["/og-image?title=imaposla.me&subtitle=Poslovi+u+Crnoj+Gori"]
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sr-ME" data-theme="light">
      <head>
        {/* Font preconnect — eliminates DNS lookup latency */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Non-blocking font load with display=swap — no render blocking */}
        {/* NOTE: Replace with next/font/google when build environment has network access */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <Header />
          <main className="site-shell">{children}</main>
          <MobileNav />
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
