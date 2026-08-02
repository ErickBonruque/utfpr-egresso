// Classificação de erro do sistema (Fase 9).
//
// Antes desta fase cada action decidia sozinha o que fazer no `catch`: umas
// devolviam `e.message` (e um erro de driver do Postgres ia parar na tela),
// outras engoliam a exceção com `catch {}` (e a causa real sumia). A regra
// agora é uma só:
//
//   DomainError  → mensagem escrita para o usuário; pode aparecer na tela.
//   qualquer outro → inesperado; vai para o log com contexto e o usuário
//                    recebe um texto genérico.
//
// A separação é só de tipo — nada de I/O aqui, para continuar testável.

export class DomainError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "DomainError";
  }
}

export function isDomainError(error: unknown): error is DomainError {
  return error instanceof DomainError;
}

/// Mensagem segura de exibir. `null` quando o erro é inesperado — o chamador
/// decide o texto genérico (e é ele quem loga).
export function userMessage(error: unknown): string | null {
  return isDomainError(error) ? error.message : null;
}
