/// Lógica pura de árvore de trilhas (TrackNode) compartilhada entre o editor
/// visual do admin e o portal do aluno. Sem React, sem Prisma — testável.

/// Verifica se tornar `nodeId` filho de `newParentId` criaria um ciclo.
/// Um ciclo ocorre quando `newParentId` é o próprio `nodeId` ou um de seus
/// descendentes (mover uma subárvore para dentro dela mesma).
///
/// `nodes` é o snapshot da trilha (id + parentId). `newParentId === null`
/// significa "tornar raiz" — nunca cria ciclo, devolve `false`.
export function wouldCreateCycle(
  nodes: { id: string; parentId: string | null }[],
  nodeId: string,
  newParentId: string | null,
): boolean {
  if (newParentId === null) return false;
  if (newParentId === nodeId) return true;

  const parentOf = new Map(nodes.map((n) => [n.id, n.parentId]));
  // Sobe a cadeia de ancestrais a partir do pai candidato: se esbarrarmos no
  // próprio nó, é porque ele é ancestral do candidato — ou seja, o candidato
  // é descendente do nó (ciclo).
  let cursor: string | null = newParentId;
  while (cursor) {
    if (cursor === nodeId) return true;
    cursor = parentOf.get(cursor) ?? null;
  }
  return false;
}
