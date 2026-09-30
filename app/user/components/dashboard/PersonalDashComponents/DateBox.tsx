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
        <label htmlFor={id} className="text-xs text-[#E5EAF5]/60">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label={`Clear ${label.toLowerCase()}`}
            className="text-xs text-[#9085e9] hover:underline"
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
        className="w-full rounded-lg border border-[#D0BDF4] bg-[#262826] px-3 py-2 text-sm text-[#E5EAF5] outline-none scheme-dark focus:border-[#9085e9] focus:ring-2 focus:ring-[#9085e9]/40"
      />
    </div>
  );
}
