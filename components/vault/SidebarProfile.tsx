"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Camera } from "lucide-react";

type MeUser = {
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export default function SidebarProfile() {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const applyUser = useCallback((user: MeUser) => {
    setAvatar(user.avatarUrl);
    setName(user.name ?? "");
    setUsername(user.username ?? "");
  }, []);

  const loadProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/me");
      if (!res.ok) return;
      const data = await res.json();
      if (data.user) applyUser(data.user as MeUser);
    } catch {
      /* ignore */
    }
  }, [applyUser]);

  useEffect(() => {
    void loadProfile();
    const onUpdated = () => {
      void loadProfile();
    };
    window.addEventListener("m404:profile-updated", onUpdated);
    return () => window.removeEventListener("m404:profile-updated", onUpdated);
  }, [loadProfile]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = typeof reader.result === "string" ? reader.result : null;
      if (!base64) return;
      setAvatar(base64);
      setSavingAvatar(true);
      try {
        const res = await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ avatarUrl: base64 }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          console.error("Avatar save failed:", data.error);
          await loadProfile();
          return;
        }
        const data = await res.json();
        if (data.user) applyUser(data.user as MeUser);
        window.dispatchEvent(new CustomEvent("m404:profile-updated"));
      } catch (err) {
        console.error("Avatar save failed:", err);
        await loadProfile();
      } finally {
        setSavingAvatar(false);
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
        disabled={savingAvatar}
        aria-label={avatar ? "Change profile photo" : "Add profile photo"}
        title={avatar ? "Change photo" : "Add photo"}
        className="group/avatar relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-muted transition-colors hover:border-foreground/35 hover:text-foreground disabled:opacity-60"
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
