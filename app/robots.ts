import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin/",
          "/firma/",
          "/profil/",
          "/auth/",
          "/api/",
          "/logout",
          "/reset-lozinka",
          "/zaboravljena-lozinka"
        ]
      }
    ],
    sitemap: "https://imaposla.me/sitemap.xml"
  };
}
