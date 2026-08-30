"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputCls =
  "w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink outline-none focus:border-antara";
const btnPrimary =
  "w-full cursor-pointer rounded-lg bg-antara px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-antara-dark disabled:opacity-60 disabled:cursor-not-allowed";

export function LoginForm() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      email: String(fd.get("email") ?? "").trim(),
      password: String(fd.get("password") ?? ""),
    };

    setEnviando(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo iniciar sesión");
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
          Email
        </span>
        <input name="email" type="email" required autoFocus className={inputCls} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink/50">
          Contraseña
        </span>
        <input name="password" type="password" required className={inputCls} />
      </label>

      {error && <p className="text-sm text-debt">{error}</p>}

      <button type="submit" disabled={enviando} className={btnPrimary}>
        {enviando ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
