// app/user/settings/page.tsx
"use client";

import { useRouter } from "next/navigation";
import BackButton from "@/app/user/components/shared/BackButton";
import ThemeToggle from "@/app/user/components/settings/ThemeToggle";

export default function SettingsPage() {
  const router = useRouter();
  return (
    <>
      <BackButton />

      <div className="max-w-2xl mx-auto p-6 flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        <section>
          <h2 className="text-lg font-semibold mb-3">Appearance</h2>
          <ThemeToggle />
        </section>
      </div>
    </>
  );
}
