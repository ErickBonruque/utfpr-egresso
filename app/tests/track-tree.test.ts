import { describe, expect, it } from "vitest";
import { wouldCreateCycle } from "@/lib/track-tree";

type N = { id: string; parentId: string | null };

describe("wouldCreateCycle", () => {
  // Árvore-base: raiz → A → B → C (cadeia linear).
  const chain: N[] = [
    { id: "root", parentId: null },
    { id: "A", parentId: "root" },
    { id: "B", parentId: "A" },
    { id: "C", parentId: "B" },
  ];

  it("tornar raiz nunca cria ciclo", () => {
    expect(wouldCreateCycle(chain, "C", null)).toBe(false);
  });

  it("ser o próprio pai cria ciclo", () => {
    expect(wouldCreateCycle(chain, "A", "A")).toBe(true);
  });

  it("apontar para o próprio ancestral cria ciclo (subárvore dentro dela mesma)", () => {
    // C é ancestral de A? não — A é ancestral de C. Mas A virar filho de C
    // encurrala a subárvore A→B→C num ciclo.
    expect(wouldCreateCycle(chain, "A", "C")).toBe(true);
  });

  it("apontar para descendente direto cria ciclo", () => {
    expect(wouldCreateCycle(chain, "A", "B")).toBe(true);
  });

  it("apontar para nó não relacionado NÃO cria ciclo", () => {
    // Árvore com dois ramos independentes sob a mesma raiz.
    const tree: N[] = [
      { id: "root", parentId: null },
      { id: "x", parentId: "root" },
      { id: "y", parentId: "root" },
      { id: "x1", parentId: "x" },
    ];
    // x1 virar filho de y: y não é ancestral de x1 → ok.
    expect(wouldCreateCycle(tree, "x1", "y")).toBe(false);
  });

  it("cadeia profunda: detecta ciclo no fundo da árvore", () => {
    // root → A → B → C: fazer root filho de C fecha o ciclo raiz→...→C→root.
    expect(wouldCreateCycle(chain, "root", "C")).toBe(true);
  });

  it("parentId inexistente é tratado como raiz válida (não ciclo)", () => {
    // Pai candidato não está no snapshot: não há como subir a cadeia, então
    // não fecha ciclo. (Defesa para dado parcial em edição.)
    expect(wouldCreateCycle(chain, "A", "ghost")).toBe(false);
  });
});
