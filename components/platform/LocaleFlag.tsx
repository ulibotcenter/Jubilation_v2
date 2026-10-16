"use client";

import { useId } from "react";
import type { AppLocale } from "@/lib/i18n/messages";

const SIZE = { width: 18, height: 12 };

export function LocaleFlag({
  locale,
  title,
}: {
  locale: AppLocale;
  title?: string;
}) {
  const clipId = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 18 12"
      width={SIZE.width}
      height={SIZE.height}
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
      aria-label={title}
      className="locale-flag-svg"
    >
      <clipPath id={clipId}>
        <rect x="0" y="0" width="18" height="12" rx="1.5" />
      </clipPath>
      <g clipPath={`url(#${clipId})`}>
        {locale === "pt" ? <BrazilFlag /> : locale === "es" ? <SpainFlag /> : <UnitedStatesFlag />}
      </g>
      <rect
        x="0.35"
        y="0.35"
        width="17.3"
        height="11.3"
        rx="1.4"
        fill="none"
        stroke="rgba(15,23,42,0.18)"
        strokeWidth="0.7"
      />
    </svg>
  );
}

function BrazilFlag() {
  return (
    <>
      <rect width="18" height="12" fill="#009B3A" />
      <polygon points="9,1.15 16.6,6 9,10.85 1.4,6" fill="#FEDD00" />
      <circle cx="9" cy="6" r="2.45" fill="#002776" />
    </>
  );
}

function UnitedStatesFlag() {
  return (
    <>
      <rect width="18" height="12" fill="#fff" />
      <rect y="0" width="18" height="1.71" fill="#B22234" />
      <rect y="3.43" width="18" height="1.71" fill="#B22234" />
      <rect y="6.86" width="18" height="1.71" fill="#B22234" />
      <rect y="10.29" width="18" height="1.71" fill="#B22234" />
      <rect width="8.2" height="6.4" fill="#3C3B6E" />
    </>
  );
}

function SpainFlag() {
  return (
    <>
      <rect width="18" height="12" fill="#AA151B" />
      <rect y="3" width="18" height="6" fill="#F1BF00" />
    </>
  );
}
