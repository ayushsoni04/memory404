import type { Metadata } from "next";
import BrandShowcase from "@/components/BrandShowcase";

export const metadata: Metadata = {
  title: "Brand",
  description:
    "memory404 brand mark — Departure Mono glitch 404 on an idle dither field.",
  alternates: {
    canonical: "/brand",
  },
  openGraph: {
    title: "memory404 brand",
    description:
      "memory404 brand mark — Departure Mono glitch 404 on an idle dither field.",
    url: "/brand",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "memory404 brand",
    description:
      "memory404 brand mark — Departure Mono glitch 404 on an idle dither field.",
  },
};

/** Public brand showcase — short keyword slug `/brand` (Yoast/Shopify practices). */
export default function BrandPage() {
  return <BrandShowcase />;
}
