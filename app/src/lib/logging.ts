// Formato dos logs estruturados (Fase 9). Só regras puras: montar o registro,
// redigir segredo e serializar. Quem escreve de fato é src/server/logger.ts.
//
// Decisão: uma linha por evento, JSON em produção (a Vercel/qualquer coletor
// parseia sem regex) e texto legível em dev. O `event` é um identificador
// estável em snake_case — é por ele que se procura no coletor, não pela
// mensagem, que pode mudar de redação.

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogContext = Record<string, unknown>;

export type LogRecord = {
  ts: string;
  level: LogLevel;
  event: string;
} & LogContext;

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && value in LEVEL_ORDER;
}

export function shouldLog(level: LogLevel, minimum: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[minimum];
}

export const REDACTED = "[redacted]";

// Casamento por substring no nome da chave (minúsculo, sem separadores), para
// pegar `password`, `newPassword`, `BETTER_AUTH_SECRET`, `app_key` etc. de uma
// vez. Prefixo estreito onde o termo é curto demais ("key" pegaria "keyword").
const SENSITIVE_FRAGMENTS = [
  "password",
  "senha",
  "secret",
  "token",
  "authorization",
  "cookie",
  "credential",
  "apikey",
  "appkey",
  "privatekey",
  "hash",
];

export function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
  return SENSITIVE_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

// Connection strings entram no log por descuido (mensagem de erro do driver,
// contexto de sync). Mantém host/base — que é o que ajuda a diagnosticar — e
// apaga usuário e senha.
const URL_CREDENTIALS = /\b([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+(?::[^/\s@]*)?@/gi;

export function maskUrlCredentials(value: string): string {
  return value.replace(URL_CREDENTIALS, `$1${REDACTED}@`);
}

const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 2000;

function redactValue(value: unknown, depth: number): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    const masked = maskUrlCredentials(value);
    return masked.length > MAX_STRING_LENGTH
      ? `${masked.slice(0, MAX_STRING_LENGTH)}…`
      : masked;
  }
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return describeError(value);
  if (typeof value === "function" || typeof value === "symbol")
    return undefined;

  if (depth >= MAX_DEPTH) return "[truncated]";

  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => redactValue(item, depth + 1));
    return value.length > MAX_ARRAY_ITEMS
      ? [...items, `…+${value.length - MAX_ARRAY_ITEMS}`]
      : items;
  }

  if (typeof value === "object") {
    const out: LogContext = {};
    for (const [key, item] of Object.entries(value)) {
      if (isSensitiveKey(key)) {
        out[key] = REDACTED;
        continue;
      }
      const redacted = redactValue(item, depth + 1);
      if (redacted !== undefined) out[key] = redacted;
    }
    return out;
  }

  return String(value);
}

export function redactContext(context: LogContext): LogContext {
  return redactValue(context, 0) as LogContext;
}

export type ErrorShape = {
  name: string;
  message: string;
  stack?: string;
  cause?: unknown;
};

/// Normaliza qualquer `unknown` de um `catch` para um objeto serializável.
export function describeError(error: unknown): ErrorShape {
  if (error instanceof Error) {
    const shape: ErrorShape = {
      name: error.name,
      message: maskUrlCredentials(error.message),
      stack: error.stack ? maskUrlCredentials(error.stack) : undefined,
    };
    if (error.cause !== undefined) {
      shape.cause =
        error.cause instanceof Error
          ? describeError(error.cause)
          : redactValue(error.cause, 1);
    }
    return shape;
  }
  return { name: "NonError", message: maskUrlCredentials(String(error)) };
}

export function buildLogRecord(
  level: LogLevel,
  event: string,
  context: LogContext = {},
  now: Date = new Date(),
): LogRecord {
  // `ts`, `level` e `event` são reservados: contexto não sobrescreve o
  // cabeçalho do registro (senão um `event` no contexto quebraria a busca).
  const { ts: _ts, level: _level, event: _event, ...rest } = context;
  return {
    ts: now.toISOString(),
    level,
    event,
    ...redactContext(rest),
  };
}

export function formatLogRecord(record: LogRecord, pretty: boolean): string {
  if (!pretty) return JSON.stringify(record);

  const { ts, level, event, ...rest } = record;
  const head = `${ts} ${level.toUpperCase().padEnd(5)} ${event}`;
  const keys = Object.keys(rest);
  if (keys.length === 0) return head;
  return `${head} ${JSON.stringify(rest)}`;
}
