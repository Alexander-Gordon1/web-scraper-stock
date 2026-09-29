// app/reg-forgot/page.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

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
      {/* Logo + site name */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-6xl">📈</span>
        <h1 className="text-5xl font-extrabold tracking-tight">StockScraper</h1>
      </div>

      {/* Forgot password */}
      {isForgot && (
        <form
          className="flex w-full max-w-sm flex-col gap-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <h2 className="text-xl font-semibold text-center">Reset your password</h2>
          <p className="text-sm text-gray-500 text-center">
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <div className="flex flex-col gap-1">
            <label htmlFor="reset-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
          >
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
          <h2 className="text-xl font-semibold text-center">Create an account</h2>

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 border border-red-200">{error}</p>
          )}

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="reg-email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="reg-password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="reg-confirm" className="text-sm font-medium">
              Confirm password
            </label>
            <input
              id="reg-confirm"
              type="password"
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Registering…" : "Register"}
          </button>
        </form>
      )}

      {/* Back to login */}
      <button
        type="button"
        onClick={() => router.push("/user/login")}
        className="text-sm text-blue-600 hover:underline"
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
