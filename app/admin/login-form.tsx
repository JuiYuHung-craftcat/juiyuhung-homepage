"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setError((await res.json().catch(() => ({}))).error ?? "Login failed.");
  };

  return (
    <form onSubmit={submit} className="max-w-sm mx-auto pt-12 font-mono animate-fade-in">
      <p className="text-xl font-bold pb-1">$ sudo edit-posts</p>
      <p className="text-sm opacity-70 pb-6">Authentication required.</p>
      <label className="block text-sm pb-1" htmlFor="password">
        [sudo] password for JuiYuHung:
      </label>
      <input
        id="password"
        type="password"
        autoFocus
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full bg-transparent border-2 border-terminal_green/50 focus:border-terminal_green rounded px-3 py-2 outline-none"
      />
      {error && <p className="text-red-500 text-sm pt-2">{error}</p>}
      <button
        type="submit"
        disabled={busy || !password}
        className="mt-4 w-full py-2 rounded bg-terminal_green text-black font-bold disabled:opacity-40 hover:bg-terminal_green/80 transition-colors"
      >
        {busy ? "Checking..." : "LOG IN"}
      </button>
    </form>
  );
}
