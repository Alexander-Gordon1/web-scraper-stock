// components/TerminalField.tsx
//
// Terminal-style form pieces for the login / register / forgot password pages,
// using the same greens as IntroRain's rain.

type TerminalFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
};

export const TERMINAL_BUTTON =
  "mt-2 rounded-md border border-[#2f9e5b] bg-[#2f9e5b]/15 py-3 font-mono text-sm font-bold uppercase tracking-[0.3em] text-[#d9ffe6] backdrop-blur-sm transition hover:bg-[#2f9e5b] hover:text-black hover:shadow-[0_0_22px_rgba(47,158,91,0.6)] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60";

export const TERMINAL_LINK = "font-mono text-sm text-[#2f9e5b] hover:text-[#d9ffe6] hover:underline";

export const TERMINAL_ERROR =
  "rounded-md border border-red-500/50 bg-red-950/60 px-4 py-2 font-mono text-sm text-red-300";

export default function TerminalField({ id, label, ...inputProps }: TerminalFieldProps) {
  return (
    <div className="group flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-mono text-sm font-semibold uppercase tracking-[0.2em] text-[#2f9e5b] transition-colors group-focus-within:text-[#d9ffe6]"
      >
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-md border border-[#2f9e5b]/40 bg-black/40 px-3 backdrop-blur-sm transition focus-within:border-[#2f9e5b] focus-within:shadow-[0_0_14px_rgba(47,158,91,0.45)]">
        <span aria-hidden="true" className="font-mono text-[#2f9e5b]">
          &gt;
        </span>
        <input
          id={id}
          {...inputProps}
          className="w-full bg-transparent py-2.5 font-mono text-base text-[#d9ffe6] caret-[#2f9e5b] sm:text-sm outline-none placeholder:text-[#2f9e5b]/50 autofill:shadow-[inset_0_0_0_1000px_#0b1a10] autofill:[-webkit-text-fill-color:#d9ffe6]"
        />
      </div>
    </div>
  );
}
