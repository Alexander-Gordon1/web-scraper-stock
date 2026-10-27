// app/user/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IntroRain from "@/app/user/components/shared/IntroRain";
import TerminalField, {
  TERMINAL_BUTTON,
  TERMINAL_ERROR,
  TERMINAL_LINK,
} from "@/app/user/components/shared/TerminalField";

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
        {error && <p className={TERMINAL_ERROR}>{error}</p>}

        <TerminalField
          id="username"
          label="Username"
          autoComplete="username"
          required
          placeholder="Enter Username here"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <TerminalField
          id="password"
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter Password here"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button type="submit" disabled={loading} className={TERMINAL_BUTTON}>
          {loading ? "Logging in…" : "Log in"}
        </button>

        {/* Register / Forgot password links */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push("/user/reg-forgot?mode=forgot")}
            className={TERMINAL_LINK}
          >
            Forgot password?
          </button>
          <button
            type="button"
            onClick={() => router.push("/user/reg-forgot?mode=register")}
            className={TERMINAL_LINK}
          >
            Register
          </button>
        </div>
      </form>
    </main>
  );
}
