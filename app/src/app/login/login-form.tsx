"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
        ? "bg-primary text-primary-foreground"
        : "text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div className="flex w-full max-w-sm flex-col gap-6">
      <div className="flex gap-1 rounded-lg border p-1">
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
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-identifier">
            {mode === "student" ? "RA (Registro Acadêmico)" : "E-mail"}
          </Label>
          <Input
            id="login-identifier"
            type={mode === "student" ? "text" : "email"}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder={mode === "student" ? "a1234567" : "voce@utfpr.edu.br"}
            autoComplete="username"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password">Senha</Label>
          <Input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {mode === "student" && (
          <p className="text-muted-foreground text-xs">
            Use o mesmo RA e senha do portal do aluno.
          </p>
        )}

        {error && (
          <p className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-destructive text-sm">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </div>
  );
}
