// components/dashboard/PersonalDashComponents/SelectBox.tsx
const selectClass =
  "w-full appearance-none rounded-lg border border-[#D0BDF4] bg-[#262826] px-3 py-2 pr-8 text-sm text-[#E5EAF5] outline-none focus:border-[#9085e9] focus:ring-2 focus:ring-[#9085e9]/40 cursor-pointer";

// native <select> with a chevron, so the dropdown works with mouse, touch and keyboard
export default function SelectBox({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[#E5EAF5]/60">{label}</span>
      <span className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#E5EAF5]/60">▾</span>
      </span>
    </label>
  );
}
