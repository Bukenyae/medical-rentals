import React from "react";

export type IconName =
  | "dashboard"
  | "media"
  | "payments"
  | "history"
  | "analytics"
  | "messages"
  | "feedback"
  | "manage"
  | "check"
  | "plus"
  | "bell"
  | "search"
  | "arrow-left"
  | "arrow-right";

export interface IconProps {
  name: IconName;
  className?: string;
}

export default function Icon({ name, className = "w-5 h-5" }: IconProps) {
  const common = `fill-none stroke-current ${className}`;
  switch (name) {
    case "dashboard":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="M3 12h8V3H3v9ZM13 21h8v-8h-8v8ZM3 21h8v-6H3v6ZM13 11h8V3h-8v8Z" />
        </svg>
      );
    case "media":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.5" />
          <path strokeWidth="1.5" d="m8 13 3-3 5 5" />
          <circle cx="8" cy="9" r="1.25" />
        </svg>
      );
    case "payments":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" strokeWidth="1.5" />
          <path strokeWidth="1.5" d="M3 10h18M7 15h3" />
        </svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
          <path strokeWidth="1.5" d="M12 7v6l4 2" />
        </svg>
      );
    case "analytics":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="M4 20V7m6 13V4m6 16v-8m4 8H2" />
        </svg>
      );
    case "messages":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="M21 12c0 4.418-4.03 8-9 8-1.122 0-2.194-.168-3.178-.478L3 20l1.548-4.358C4.202 14.346 4 13.193 4 12c0-4.418 4.03-8 9-8s8 3.582 8 8Z" />
        </svg>
      );
    case "feedback":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="M4 5h16v12H7l-3 3V5Z" />
        </svg>
      );
    case "manage":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="M6 6h12v12H6zM9 3v6M15 15v6" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="m5 13 4 4L19 7" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="M12 5v14M5 12h14" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="M15 17H5l1.5-2V10a5.5 5.5 0 1 1 11 0v5L19 17h-4Z" />
          <path strokeWidth="1.5" d="M10 20a2 2 0 0 0 4 0" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <circle cx="11" cy="11" r="7" strokeWidth="1.5" />
          <path strokeWidth="1.5" d="m20 20-3-3" />
        </svg>
      );
    case "arrow-left":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="M15 6l-6 6 6 6" />
        </svg>
      );
    case "arrow-right":
      return (
        <svg viewBox="0 0 24 24" className={common} aria-hidden>
          <path strokeWidth="1.5" d="m9 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}
