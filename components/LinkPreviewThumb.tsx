"use client";

import { useState } from "react";

type Props = {
  src: string;
  alt: string;
  className?: string;
};

/**
 * Preview thumbnail with lazy load; hides itself if the image fails (hotlink / 403).
 */
export default function LinkPreviewThumb({ src, alt, className }: Props) {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- remote arbitrary preview URLs
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      decoding="async"
      className={className}
      onError={() => setVisible(false)}
    />
  );
}
