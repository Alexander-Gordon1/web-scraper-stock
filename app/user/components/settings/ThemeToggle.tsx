// components/settings/ThemeToggle.tsx
"use client";

import { useTheme } from "@/app/user/components/shared/ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex items-center justify-between p-4 bg-background border border-foreground/10 rounded-lg">
      <div>
        <p className="font-medium text-foreground">Dark Mode</p>
        <p className="text-sm text-foreground/60">
          Switch between light and dark appearance
        </p>
      </div>

      <button
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          isDark ? "bg-primary" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
            isDark ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
