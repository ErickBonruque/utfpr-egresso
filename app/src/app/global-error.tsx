"use client";

// Última rede: só dispara quando o próprio root layout falha, então o
// ThemeProvider, os tokens e as fontes podem não existir. Por isso <html>/
// <body> próprios e estilo inline — nada aqui depende do CSS ter carregado.
// (Fase 9)
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily:
            "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", margin: 0 }}>
          O sistema não pôde ser carregado
        </h1>
        <p style={{ margin: 0, maxWidth: "32rem", lineHeight: 1.5 }}>
          Ocorreu uma falha inesperada. Tente novamente — se continuar, informe
          o código abaixo à administração.
        </p>
        {error.digest && (
          <code style={{ fontSize: "0.75rem", opacity: 0.7 }}>
            {error.digest}
          </code>
        )}
        <button
          type="button"
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 1rem",
            borderRadius: "0.5rem",
            border: "1px solid currentColor",
            background: "transparent",
            color: "inherit",
            font: "inherit",
            cursor: "pointer",
          }}
        >
          Tentar novamente
        </button>
      </body>
    </html>
  );
}
