"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";

const AVATAR_KEY = "m404-profile-avatar";
const NAME_KEY = "m404-profile-name";
const USERNAME_KEY = "m404-profile-username";

export default function SidebarProfile() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      setAvatar(localStorage.getItem(AVATAR_KEY));
      setName(localStorage.getItem(NAME_KEY) ?? "");
      setUsername(localStorage.getItem(USERNAME_KEY) ?? "");
    } catch {
      /* ignore */
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === AVATAR_KEY) setAvatar(e.newValue);
      if (e.key === NAME_KEY) setName(e.newValue ?? "");
      if (e.key === USERNAME_KEY) setUsername(e.newValue ?? "");
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = typeof reader.result === "string" ? reader.result : null;
      if (!base64) return;
      setAvatar(base64);
      try {
        localStorage.setItem(AVATAR_KEY, base64);
      } catch {
        /* ignore quota */
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const initials = name
    ? name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("")
    : "M";

  const displayName = name.trim() || "Your profile";
  const displayMeta = username.trim()
    ? `@${username.replace(/^@/, "")}`
    : "Add photo & details";

  return (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={avatar ? "Change profile photo" : "Add profile photo"}
        title={avatar ? "Change photo" : "Add photo"}
        className="group/avatar relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-muted transition-colors hover:border-foreground/35 hover:text-foreground"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
        {avatar ? (
          <Image
            src={avatar}
            alt=""
            fill
            unoptimized
            className="object-cover transition duration-200 group-hover/avatar:brightness-50"
          />
        ) : (
          <span className="font-mono text-[12px] font-semibold tracking-wide uppercase transition duration-200 group-hover/avatar:opacity-40">
            {initials}
          </span>
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition duration-200 group-hover/avatar:opacity-100">
          <Camera className="size-3.5 text-white" aria-hidden />
        </span>
      </button>

      <Link
        href="/settings"
        className="min-w-0 flex-1 rounded-lg px-1 py-0.5 transition-colors hover:bg-pill"
      >
        <p className="truncate text-[13px] font-medium text-foreground">
          {displayName}
        </p>
        <p className="truncate text-[11px] text-subtle">{displayMeta}</p>
      </Link>
    </div>
  );
}
