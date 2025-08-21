"use client";

import React, { useMemo, useState } from "react";

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl'; // tailwind size variants
  alt?: string;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
  }
  if (email) {
    const base = email.split("@")[0] || email;
    return base.slice(0, 2).toUpperCase();
  }
  return "?";
}

export default function Avatar({ src, name, email, size = 'md', alt = "" , className, ...rest }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = useMemo(() => getInitials(name, email), [name, email]);
  const showImage = !!src && !failed;

  const sizeClasses =
    size === 'sm' ? 'h-6 w-6 text-[10px]'
    : size === 'md' ? 'h-8 w-8 text-[12px]'
    : size === 'lg' ? 'h-10 w-10 text-[14px]'
    : 'h-12 w-12 text-[16px]';

  return (
    <div
      {...rest}
      className={`inline-flex items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100 ${sizeClasses} ${className || ""}`}
      aria-label={alt || name || email || "avatar"}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src || undefined}
          alt={alt}
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="font-semibold text-gray-600 select-none">
          {initials}
        </span>
      )}
    </div>
  );
}
