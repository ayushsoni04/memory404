import type { Metadata } from "next";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

/** Same combo as blog.maximeheckel.com: Inter + Departure Mono + Fira Code */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const departureMono = localFont({
  src: "../public/fonts/DepartureMono-Regular.woff2",
  variable: "--font-departure",
  display: "swap",
});

const firaCode = localFont({
  src: "../public/fonts/fira-code.woff2",
  variable: "--font-fira",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ayush Soni — Product Designer | UX, UI & Design Systems",
  description:
    "Product designer in India creating intuitive SaaS, AI, and digital experiences—from research and UX to design systems and polished interfaces.",
  metadataBase: new URL("https://ayushdesign.in"),
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  authors: [{ name: "Ayush Soni", url: "https://ayushdesign.in" }],
  keywords: [
    "Product Designer",
    "UX Designer",
    "UI Designer",
    "Product Design Portfolio",
    "SaaS Designer",
    "AI Designer",
    "Design Systems",
    "Interaction Design",
    "Ayush Soni",
  ],
  openGraph: {
    title: "Ayush Soni — Product Designer | UX, UI & Design Systems",
    description:
      "Product designer in India creating intuitive SaaS, AI, and digital experiences—from research and UX to design systems and polished interfaces.",
    url: "https://ayushdesign.in",
    siteName: "Ayush Soni Portfolio",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Ayush Soni — Product Designer | UX, UI & Design Systems",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ayush Soni — Product Designer | UX, UI & Design Systems",
    description:
      "Product designer in India creating intuitive SaaS, AI, and digital experiences—from research and UX to design systems and polished interfaces.",
    images: ["/og-image.png"],
    creator: "@ayushsoni04",
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
    other: [
      { rel: "icon", url: "/android-chrome-192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/android-chrome-512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export const viewport = {
  themeColor: "#0c0c0c",
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "Ayush Soni",
  "jobTitle": "Product Designer",
  "url": "https://ayushdesign.in",
  "image": "https://ayushdesign.in/portrait-sketch.png",
  "sameAs": [
    "https://linkedin.com/in/ayushsoni04",
    "https://github.com/ayushsoni04",
    "https://x.com/ayushsoni04",
    "https://behance.net/ayushsoni04",
  ],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Ayush Soni — Product Designer Portfolio",
  "url": "https://ayushdesign.in",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${departureMono.variable} ${firaCode.variable} dark h-full antialiased`}
    >
      <head>
        {/* Preconnect to external origins */}
        <link rel="preconnect" href="https://www.google.com" />
        <link rel="preconnect" href="https://api.microlink.io" />
        <link rel="preconnect" href="https://s0.wp.com" />



        {/* Structured Data (JSON-LD) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
