/// Comparação de texto tolerante a acento e caixa. Existe porque busca é o
/// lugar onde o usuário digita "agronomo" e espera achar "Agrônomo" — e
/// tanto a fonte real (Adzuna) quanto a de demonstração precisam da mesma
/// regra para não divergirem no que consideram "casou".
export function foldText(raw: string | null | undefined): string {
  return (raw ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/// Palavras da busca que valem para casar. Termos de até 2 letras são
/// preposição na prática ("de", "em", "da") e casariam com tudo.
export function significantWords(term: string): string[] {
  return foldText(term)
    .split(/\s+/)
    .filter((word) => word.length > 2);
}
