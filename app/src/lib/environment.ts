// Identidade do ambiente (Fase 10). Puro: recebe o `env` e diz o que a tela
// deve avisar.
//
// Existe por um motivo concreto: o deploy desta etapa é de **demonstração** e
// vai ao ar com os logins mockados do seed publicados no README. Sem um aviso
// visível, alguém confunde a demo com o sistema oficial e acha que os dados
// da vitrine são de egressos reais.

export type EnvironmentKind = "local" | "demo" | "producao";

export function readEnvironmentKind(env: {
  CEA_ENVIRONMENT?: string;
  NODE_ENV?: string;
}): EnvironmentKind {
  const declared = env.CEA_ENVIRONMENT?.trim().toLowerCase();
  if (declared === "demo") return "demo";
  if (declared === "producao" || declared === "production") return "producao";
  // Sem declaração explícita: produção só quando o build é de produção.
  return env.NODE_ENV === "production" ? "producao" : "local";
}

export type EnvironmentNotice = { label: string; message: string };

/// `null` quando não há nada a avisar — produção não ganha faixa.
export function environmentNotice(
  kind: EnvironmentKind,
): EnvironmentNotice | null {
  switch (kind) {
    case "demo":
      return {
        label: "Ambiente de demonstração",
        message:
          "Dados fictícios e logins de teste. Não é o sistema oficial da UTFPR.",
      };
    case "local":
      return {
        label: "Ambiente local",
        message: "Dados de desenvolvimento gerados pelo seed.",
      };
    case "producao":
      return null;
  }
}

/// Os logins mockados do seed só fazem sentido fora de produção. Quando a
/// integração com a UTFPR chegar, é esta a chave que os desliga.
export function allowsMockLogins(kind: EnvironmentKind): boolean {
  return kind !== "producao";
}
