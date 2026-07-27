import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Auth recovery flows — no SEO value
      disallow: ["/forgot-password", "/reset-password", "/api/"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
