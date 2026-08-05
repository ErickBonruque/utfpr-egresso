// Conferência das variáveis de ambiente (Fase 9). Pura: recebe o `env` e
// devolve os problemas — quem decide abortar ou só avisar é o chamador
// (src/instrumentation.ts, no boot do servidor).
//
// Motivo de existir: o item "secrets fora do código" da revisão de segurança
// só vale se a ausência de um secret for barulhenta. Sem isso, subir em
// produção com o `BETTER_AUTH_SECRET="change-me"` do .env.example passa
// despercebido — e uma sessão assinada com segredo público é forjável.

export type EnvIssue = {
  /// `fatal` derruba o boot em produção; `warning` só registra.
  severity: "fatal" | "warning";
  variable: string;
  message: string;
};

export type EnvLike = Record<string, string | undefined>;

/// Valor de exemplo que não pode sobreviver até produção.
const PLACEHOLDER_SECRETS = new Set(["change-me", "secret", "changeme", ""]);

const MIN_SECRET_LENGTH = 32;

/// `npm run build && npm start` na máquina do dev roda com NODE_ENV=production
/// contra http://localhost — é o smoke test do build de produção, e exigir
/// https ali impediria justamente a conferência que a fase pede. Endereço de
/// loopback nunca é um deploy de verdade, então a exceção é segura.
function isLoopback(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function checkEnvironment(
  env: EnvLike,
  isProduction: boolean,
): EnvIssue[] {
  const issues: EnvIssue[] = [];
  const fatal = (variable: string, message: string) =>
    issues.push({
      // Fora de produção o dev roda com defaults do docker-compose; avisar
      // basta. Em produção, cada um destes é motivo para não subir.
      severity: isProduction ? "fatal" : "warning",
      variable,
      message,
    });

  if (!env.DATABASE_URL) {
    fatal("DATABASE_URL", "Sem string de conexão do Postgres.");
  }

  const secret = env.BETTER_AUTH_SECRET;
  if (!secret) {
    fatal("BETTER_AUTH_SECRET", "Ausente — as sessões seriam forjáveis.");
  } else if (PLACEHOLDER_SECRETS.has(secret.trim().toLowerCase())) {
    fatal(
      "BETTER_AUTH_SECRET",
      "Ainda é o valor de exemplo. Gere um: openssl rand -base64 32",
    );
  } else if (secret.length < MIN_SECRET_LENGTH) {
    fatal(
      "BETTER_AUTH_SECRET",
      `Curto demais (${secret.length} caracteres; mínimo ${MIN_SECRET_LENGTH}).`,
    );
  }

  const baseUrl = env.BETTER_AUTH_URL;
  if (!baseUrl) {
    fatal("BETTER_AUTH_URL", "Ausente — os callbacks de sessão precisam dela.");
  } else if (
    isProduction &&
    !baseUrl.startsWith("https://") &&
    !isLoopback(baseUrl)
  ) {
    fatal(
      "BETTER_AUTH_URL",
      "Em produção precisa ser https (o cookie de sessão é Secure).",
    );
  }

  // Fase 8: escolher o provider real sem dar a conexão é erro de configuração,
  // não degradação — a sincronização falharia em toda execução.
  if (env.ACADEMIC_PROVIDER === "utfpr" && !env.UTFPR_DATABASE_URL) {
    fatal(
      "UTFPR_DATABASE_URL",
      'ACADEMIC_PROVIDER="utfpr" exige a conexão só-leitura das views.',
    );
  }

  // Fase 6.1: sem chave, a busca cai no provider de demonstração (avisando o
  // usuário na tela). Degrada, não quebra — a não ser que alguém tenha pedido
  // explicitamente a fonte real, aí a ausência da chave é erro de configuração.
  if (!env.ADZUNA_APP_ID || !env.ADZUNA_APP_KEY) {
    const requiresReal = env.JOBS_PROVIDER?.trim().toLowerCase() === "adzuna";
    if (requiresReal) {
      fatal(
        "ADZUNA_APP_ID/ADZUNA_APP_KEY",
        'JOBS_PROVIDER="adzuna" exige as credenciais da API.',
      );
    } else {
      issues.push({
        severity: "warning",
        variable: "ADZUNA_APP_ID/ADZUNA_APP_KEY",
        message: "Sem credenciais: a busca de vagas usa dados de demonstração.",
      });
    }
  }

  return issues;
}

export function fatalIssues(issues: EnvIssue[]): EnvIssue[] {
  return issues.filter((issue) => issue.severity === "fatal");
}

export function formatEnvIssues(issues: EnvIssue[]): string {
  return issues
    .map((issue) => `  - ${issue.variable}: ${issue.message}`)
    .join("\n");
}
