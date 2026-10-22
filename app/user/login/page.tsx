// app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IntroRain from "@/app/user/components/IntroRain";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/user/api/loginCheck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/user/dashboard");
    } else {
      const data = await res.json();
      setError(data.message ?? "Login failed.");
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      {/* Site name, formed by falling characters */}
      <IntroRain word="Market Rewind" className="md:w-[min(60vw,120vh)]" />

      {/* Login form */}
      <form
        className="flex w-full max-w-sm flex-col gap-4"
        onSubmit={handleLogin}
      >
        {error && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600 border border-red-200">
            {error}
          </p>
        )}

        <div className="flex flex-col gap-1">
          <label
            htmlFor="username"
            className="text-sm text-gray-300 font-medium"
          >
            Username
          </label>
          <input
            id="username"
            autoComplete="username"
            required
            placeholder="Enter Username here"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-lg border border-gray-300 bg-background px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="password"
            className="text-sm text-gray-300 font-medium"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="Enter Password here"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-gray-300 bg-background px-4 py-2.5 text-white text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="mt-2 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {loading ? "Logging in…" : "Log in"}
        </button>

        {/* Register / Forgot password links */}
        <div className="flex justify-between text-sm">
          <button
            type="button"
            onClick={() => router.push("/user/reg-forgot?mode=forgot")}
            className="text-blue-600 hover:underline"
          >
            Forgot password?
          </button>
          <button
            type="button"
            onClick={() => router.push("/user/reg-forgot?mode=register")}
            className="text-blue-600 hover:underline"
          >
            Register
          </button>
        </div>
      </form>
    </main>
  );
}
