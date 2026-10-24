// components/dashboard/PersonalDashComponents/DateBox.tsx
"use client";

import { useId } from "react";

// today as "YYYY-MM-DD" in local time, so future days can't be picked
function todayValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// native date picker styled like SelectBox. value is "YYYY-MM-DD", or "" for none
export default function DateBox({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-xs text-[#d9ffe6]/60">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="text-xs text-[#2f9e5b] hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <input
        id={id}
        type="date"
        value={value}
        max={todayValue()}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#2f9e5b]/30 bg-black/30 px-3 py-2 text-base sm:text-sm text-[#d9ffe6] outline-none scheme-dark focus:border-[#2f9e5b] focus:ring-2 focus:ring-[#2f9e5b]/40"
      />
    </div>
  );
}
