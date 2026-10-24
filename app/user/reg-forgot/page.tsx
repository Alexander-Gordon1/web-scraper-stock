// app/reg-forgot/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import IntroRain from "@/app/user/components/IntroRain";
import TerminalField, {
  TERMINAL_BUTTON,
  TERMINAL_ERROR,
  TERMINAL_LINK,
} from "@/app/user/components/TerminalField";

function RegForgotContent() {
  const router = useRouter();
  const params = useSearchParams();
  const mode = params.get("mode"); // "register" | "forgot"

  const isForgot = mode === "forgot";
  const isRegister = mode === "register";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    const res = await fetch("/user/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: email, password }),
    });
    setLoading(false);
    const data = await res.json().catch(() => ({}));
    if (res.status === 409) setError("Username already exists.");
    else if (res.status === 201) router.push("/user/login");
    else setError(data.message ?? "Registration failed.");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {/* Site name, formed by falling characters */}
      <IntroRain word="Market Rewind" className="md:w-[min(60vw,120vh)]" />

      {/* Forgot password */}
      {isForgot && (
        <form
          className="flex w-full max-w-sm flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <h2 className="text-center font-mono text-xl font-semibold">Reset your password</h2>
          <p className="text-center font-mono text-sm text-[#2f9e5b]">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <TerminalField
            id="reset-email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />

          <button type="submit" className={TERMINAL_BUTTON}>
            Send reset link
          </button>
        </form>
      )}

      {/* Register */}
      {isRegister && (
        <form
          className="flex w-full max-w-sm flex-col gap-4"
          onSubmit={handleRegister}
        >
          <h2 className="text-center font-mono text-xl font-semibold">Create an account</h2>

          {error && <p className={TERMINAL_ERROR}>{error}</p>}

          <TerminalField
            id="reg-email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <TerminalField
            id="reg-password"
            label="Password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <TerminalField
            id="reg-confirm"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <button type="submit" disabled={loading} className={TERMINAL_BUTTON}>
            {loading ? "Registering…" : "Register"}
          </button>
        </form>
      )}

      {/* Back to login */}
      <button
        type="button"
        onClick={() => router.push("/user/login")}
        className={TERMINAL_LINK}
      >
        ← Back to login
      </button>
    </main>
  );
}

export default function RegForgotPage() {
  return (
    <Suspense>
      <RegForgotContent />
    </Suspense>
  );
}
