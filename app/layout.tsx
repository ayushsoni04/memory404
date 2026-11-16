import type { Metadata } from "next";
import { Archivo, Inter, Kaushan_Script } from "next/font/google";
import localFont from "next/font/local";
import { GeistPixelSquare } from "geist/font/pixel";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { DeferredVitals } from "@/components/DeferredVitals";
import { UiSoundBoot } from "@/components/UiSoundBoot";
import { CustomCursor } from "@/components/CustomCursor";
import { ART_STYLE_BOOT_SCRIPT } from "@/lib/art-style";
import "./globals.css";
import "./art-signal.css";

/** Same combo as blog.maximeheckel.com: Inter + Departure Mono + Fira Code */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  preload: true,
  adjustFontFallback: true,
});

const departureMono = localFont({
  src: "../public/fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure",
  display: "swap",
  preload: true,
});

const firaCode = localFont({
  src: "../public/fonts/fira-code.woff2",
  variable: "--font-fira",
  display: "swap",
  preload: false,
});

/** Wide display face for badges and labels. */
const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-wide",
  display: "swap",
  axes: ["wdth"],
  preload: false,
});

/** Brush script for the sprayed "memory 404" logo. */
const spray = Kaushan_Script({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-spray",
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://memory404.app";

export const metadata: Metadata = {
  title: {
    default: "memory404",
    template: "%s — memory404",
  },
  description:
    "Save links into groups and browse them like a dark inspiration feed.",
  metadataBase: new URL(siteUrl),
  robots: {
    index: true,
    follow: true,
  },
  keywords: [
    "link saver",
    "bookmark manager",
    "design inspiration",
    "memory404",
  ],
  openGraph: {
    title: "memory404",
    description:
      "Save links into groups and browse them like a dark inspiration feed.",
    url: "/",
    siteName: "memory404",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "memory404",
    description:
      "Save links into groups and browse them like a dark inspiration feed.",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export const viewport = {
  themeColor: "#04050a",
};

const appSchema = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "memory404",
  url: siteUrl,
  description:
    "Save links into groups and browse them like a dark inspiration feed.",
  applicationCategory: "ProductivityApplication",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // Signal is the app's look; app/art-signal.css keys off this attribute.
      data-art="signal"
      className={`${inter.variable} ${departureMono.variable} ${firaCode.variable} ${archivo.variable} ${spray.variable} ${GeistPixelSquare.variable} dark h-full antialiased`}
      // The boot script below may add data-tone before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script
          id="art-style-boot"
          dangerouslySetInnerHTML={{ __html: ART_STYLE_BOOT_SCRIPT }}
        />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appSchema) }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <NuqsAdapter>{children}</NuqsAdapter>
        <UiSoundBoot />
        <CustomCursor />
        <DeferredVitals />
      </body>
    </html>
  );
}
