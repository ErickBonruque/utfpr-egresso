import { isDomainError } from "@/lib/errors";
import {
  buildLogRecord,
  describeError,
  formatLogRecord,
  isLogLevel,
  type LogContext,
  type LogLevel,
  shouldLog,
} from "@/lib/logging";

// Saída dos logs estruturados (Fase 9). Única porta de log do servidor —
// `console.*` direto em código de app é o que a revisão da fase proíbe.
//
// Nível mínimo por `LOG_LEVEL` (debug|info|warn|error); default `debug` em dev
// e `info` em produção. Escreve em stdout/stderr porque é o que a Vercel, o
// Docker e o `npm run dev` sabem coletar sem dependência extra.
//
// A saída é `console.*` e não `process.stdout.write` de propósito: este módulo
// é alcançado pelo instrumentation.ts, que o Next compila também para o Edge
// Runtime — e lá `process.stdout` não existe.

const isProduction = process.env.NODE_ENV === "production";

function minimumLevel(): LogLevel {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (isLogLevel(configured)) return configured;
  return isProduction ? "info" : "debug";
}

function emit(level: LogLevel, event: string, context?: LogContext): void {
  if (!shouldLog(level, minimumLevel())) return;
  const line = formatLogRecord(
    buildLogRecord(level, event, context),
    !isProduction,
  );
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (event: string, context?: LogContext) => emit("debug", event, context),
  info: (event: string, context?: LogContext) => emit("info", event, context),
  warn: (event: string, context?: LogContext) => emit("warn", event, context),
  error: (event: string, error?: unknown, context?: LogContext) =>
    emit("error", event, {
      ...context,
      ...(error === undefined ? {} : { error: describeError(error) }),
    }),
};

export const GENERIC_ACTION_ERROR =
  "Não foi possível concluir a operação. Tente novamente — se persistir, avise a administração.";

/// Encerramento padrão de `catch` em server action. Regra única da Fase 9:
///
///   - DomainError  → é mensagem escrita para o usuário; volta como está e
///                    só deixa rastro em `debug` (regra de negócio negada não
///                    é incidente, mas ajuda a entender uma sessão).
///   - qualquer outro → inesperado; vai inteiro para o log (com stack e
///                      contexto) e o usuário recebe `fallback`.
///
/// Assim nenhum texto de exceção chega à tela — mensagem de driver e de ORM
/// costuma expor nome de tabela, coluna e até connection string.
export function actionCatch(
  event: string,
  error: unknown,
  fallback: string = GENERIC_ACTION_ERROR,
  context?: LogContext,
): { error: string } {
  if (isDomainError(error)) {
    logger.debug(event, { ...context, rejected: error.message });
    return { error: error.message };
  }
  logger.error(event, error, context);
  return { error: fallback };
}
