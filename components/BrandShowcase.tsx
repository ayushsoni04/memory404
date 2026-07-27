"use client";

import Image from "next/image";
import Link from "next/link";
import AuthDitherBackground from "@/components/auth/AuthDitherBackground";
import GlitchText from "@/components/GlitchText";

/** Centered brand mark on the auth dither field — for public sharing. */
export default function BrandShowcase() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center overflow-hidden bg-background p-6">
      <AuthDitherBackground />
      <Link
        href="/"
        aria-label="memory404"
        className="relative z-10 inline-flex items-center gap-4 text-foreground transition hover:opacity-85 sm:gap-5"
      >
        <Image
          src="/logo.png"
          alt=""
          width={72}
          height={72}
          className="size-[4.5rem] object-contain sm:size-24"
          aria-hidden
          draggable={false}
          priority
        />
        <GlitchText className="text-4xl tracking-[0.2em] font-semibold uppercase sm:text-6xl">
          404
        </GlitchText>
      </Link>
    </div>
  );
}
