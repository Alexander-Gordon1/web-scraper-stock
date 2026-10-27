// components/shared/BackButton.tsx
"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  href?: string;
  label?: string;
};

export default function BackButton({
  href = "/user/dashboard",
  label = "Back",
}: BackButtonProps) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(href)}
      className="fixed top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-background border border-foreground/10 rounded-md text-sm font-medium text-foreground/70 hover:text-foreground shadow-sm transition-colors z-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4"
      >
        <path
          fillRule="evenodd"
          d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
          clipRule="evenodd"
        />
      </svg>
      {label}
    </button>
  );
}
