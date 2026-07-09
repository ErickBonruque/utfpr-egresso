"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "student" | "admin";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const result =
      mode === "student"
        ? await authClient.signIn.username({
            username: identifier.trim().toLowerCase(),
            password,
          })
        : await authClient.signIn.email({
            email: identifier.trim(),
            password,
          });

    if (result.error) {
      setError(
        mode === "student"
          ? "RA ou senha incorretos."
          : "E-mail ou senha incorretos.",
      );
      setSubmitting(false);
      return;
    }
    router.push(mode === "student" ? "/painel" : "/admin");
    router.refresh();
  }

  const tabClass = (active: boolean) =>
    `flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
        : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
    }`;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex gap-1 rounded-lg border border-neutral-200 p-1 dark:border-neutral-800">
        <button
          type="button"
          className={tabClass(mode === "student")}
          onClick={() => {
            setMode("student");
            setError(null);
          }}
        >
          Aluno / Egresso
        </button>
        <button
          type="button"
          className={tabClass(mode === "admin")}
          onClick={() => {
            setMode("admin");
            setError(null);
          }}
        >
          Administração
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {mode === "student" ? "RA (Registro Acadêmico)" : "E-mail"}
          <input
            type={mode === "student" ? "text" : "email"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={mode === "student" ? "a1234567" : "voce@utfpr.edu.br"}
            autoComplete="username"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Senha
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:focus:border-white"
          />
        </label>

        {mode === "student" && (
          <p className="text-neutral-500 text-xs">
            Use o mesmo RA e senha do portal do aluno.
          </p>
        )}

        {error && (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-red-800 text-sm dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-neutral-900 px-4 py-2 font-medium text-white transition-opacity disabled:opacity-60 dark:bg-white dark:text-neutral-900"
        >
          {submitting ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
