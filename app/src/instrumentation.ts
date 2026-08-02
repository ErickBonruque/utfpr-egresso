import type { Instrumentation } from "next";
import {
  checkEnvironment,
  fatalIssues,
  formatEnvIssues,
} from "@/lib/env-check";
import { logger } from "@/server/logger";

// Boot do servidor. Roda uma vez por instância, depois do build — por isso é
// aqui, e não no import de auth.ts, que a conferência de ambiente acontece:
// `next build` roda sem as variáveis de produção e não pode quebrar por isso.
// (Fase 9)
export function register() {
  const isProduction = process.env.NODE_ENV === "production";
  const issues = checkEnvironment(process.env, isProduction);
  if (issues.length === 0) return;

  for (const issue of issues) {
    logger[issue.severity === "fatal" ? "error" : "warn"]("env.issue", {
      variable: issue.variable,
      detail: issue.message,
    });
  }

  const fatal = fatalIssues(issues);
  if (fatal.length > 0) {
    // Fail fast: subir com sessão forjável ou sem banco é pior que não subir.
    throw new Error(
      `Configuração inválida para produção:\n${formatEnvIssues(fatal)}`,
    );
  }
}

// Hook do Next para erros não tratados de request (Server Components, route
// handlers, server actions). Sem ele o Next imprime o stack cru no stdout e o
// coletor recebe várias linhas soltas; aqui vira um registro estruturado só,
// com rota e digest — o mesmo digest que a tela mostra ao usuário, então dá
// para casar o print do suporte com a linha do log.
export const onRequestError: Instrumentation.onRequestError = (
  error,
  request,
  context,
) => {
  logger.error("request_error", error, {
    path: request.path,
    method: request.method,
    digest: (error as { digest?: string }).digest,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
  });
};
