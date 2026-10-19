"use client";

import { useState } from "react";

type Props = {
  src: string;
  className: string;
  size: number;
  loading?: "eager" | "lazy";
};

/** A site icon that steps aside when the file fails, instead of a broken image. */
export function FaviconImage({ src, className, size, loading = "lazy" }: Props) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- small remote icon; native lazy
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      loading={loading}
      decoding="async"
      data-favicon=""
      className={className}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
