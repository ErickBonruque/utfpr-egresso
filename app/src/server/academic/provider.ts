// Camada de integração acadêmica (Fase 8) — a interface única.
//
// Objetivo da fase: deixar o sistema "apenas esperando a conexão". Todo dado
// acadêmico (situação, matrículas, notas) entra no CEA por AQUI. Trocar a
// origem — hoje o provider sintético, amanhã a view SQL da UTFPR — é mudar
// uma variável de ambiente, não mexer em tela, action ou engine.
//
// Mesmo padrão do JobsProvider da Fase 6.1: interface fina, implementações
// intercambiáveis, mapeamento de payload em funções puras testáveis.

import type { SourceAcademicRecord } from "@/lib/academic-sync";

/// Falha de transporte/consulta na fonte (conexão recusada, timeout, SQL
/// inválido, credencial ausente). Distinta de "aluno não encontrado", que é
/// um resultado legítimo e vem como `null`.
export class AcademicSourceError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AcademicSourceError";
  }
}

export interface AcademicDataProvider {
  /// Identificador curto gravado no log de cada execução ("seed", "utfpr").
  readonly name: string;

  /// Falso quando falta configuração (ex.: sem string de conexão). A rotina
  /// de sincronização checa antes de varrer os alunos, para falhar com uma
  /// mensagem útil em vez de N erros iguais.
  isConfigured(): boolean;

  /// Busca o registro acadêmico completo de um aluno pelo RA — a chave
  /// natural da UTFPR. `null` quando a fonte não conhece o RA (aluno de outro
  /// campus, RA digitado errado no cadastro). Lança `AcademicSourceError`
  /// quando a fonte falha.
  fetchStudent(ra: string): Promise<SourceAcademicRecord | null>;
}
