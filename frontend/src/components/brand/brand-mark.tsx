import { useId } from "react";
import { cn } from "@/lib";

type BrandMarkProps = {
  className?: string;
  /** When true, mark is decorative (wordmark carries the name). */
  decorative?: boolean;
  title?: string;
};

/**
 * OwnBoard product mark — honey board tile, white O + desk plank, teal verified seal.
 * Works from favicon size up to hero lockups.
 */
export function BrandMark({ className, decorative = false, title = "OwnBoard" }: BrandMarkProps) {
  const gradId = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-8 shrink-0", className)}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      {!decorative && <title>{title}</title>}
      <defs>
        <linearGradient id={gradId} x1="8" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E9A01C" />
          <stop offset="1" stopColor="#B85F18" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="18" fill={`url(#${gradId})`} />
      <circle cx="30" cy="33" r="15.5" stroke="#fff" strokeWidth="6.5" fill="none" />
      <rect x="18" y="36" width="24" height="5.5" rx="2.75" fill="#fff" />
      <circle cx="46.5" cy="19.5" r="9" fill="#2A8A8E" />
      <path
        d="M42.6 19.7 45.3 22.4 51 16.4"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type BrandWordmarkProps = {
  className?: string;
};

/** Custom OwnBoard logotype — Fraunces display face, not the UI sans. */
export function BrandWordmark({ className }: BrandWordmarkProps) {
  return (
    <span
      className={cn(
        "font-brand text-[1.0625rem] font-semibold leading-none tracking-[-0.03em] text-foreground",
        className,
      )}
    >
      Own
      <span className="text-brand-amber">Board</span>
    </span>
  );
}

type BrandLogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
};

/** Mark + wordmark lockup for marketing chrome and hero brand moments. */
export function BrandLogo({ className, markClassName, wordmarkClassName }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} aria-label="OwnBoard">
      <BrandMark decorative className={cn("shadow-button", markClassName)} />
      <BrandWordmark className={wordmarkClassName} />
    </span>
  );
}
