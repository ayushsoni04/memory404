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
  title: "Not a Bookmark",
  description: "Save and browse links — not a bookmark",
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
      <body className="flex min-h-full flex-col bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
