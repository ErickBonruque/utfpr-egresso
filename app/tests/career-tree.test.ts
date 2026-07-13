import { describe, expect, it } from "vitest";
import {
  CAREER_NODE_WIDTH,
  type CareerTreeNode,
  layoutCareerTree,
} from "@/lib/career-tree";

function node(
  id: string,
  parentId: string | null,
  state: CareerTreeNode["state"] = "locked",
): CareerTreeNode {
  return { id, parentId, title: id, xp: 100, state, progress: 0 };
}

describe("layoutCareerTree", () => {
  it("posiciona pai acima dos filhos (rankdir TB)", () => {
    const { nodes } = layoutCareerTree([
      node("root", null),
      node("a", "root"),
      node("b", "root"),
    ]);
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    expect(byId.root.y).toBeLessThan(byId.a.y);
    expect(byId.root.y).toBeLessThan(byId.b.y);
  });

  it("irmãos não se sobrepõem horizontalmente", () => {
    const { nodes } = layoutCareerTree([
      node("root", null),
      node("a", "root"),
      node("b", "root"),
      node("c", "root"),
    ]);
    const siblings = nodes
      .filter((n) => n.parentId === "root")
      .sort((m, n) => m.x - n.x);
    for (let i = 1; i < siblings.length; i++) {
      expect(siblings[i].x).toBeGreaterThanOrEqual(
        siblings[i - 1].x + CAREER_NODE_WIDTH,
      );
    }
  });

  it("gera uma edge por nó com pai válido", () => {
    const { edges } = layoutCareerTree([
      node("root", null),
      node("a", "root"),
      node("b", "a"),
    ]);
    expect(edges).toHaveLength(2);
    expect(edges).toContainEqual({
      id: "root->a",
      source: "root",
      target: "a",
    });
    expect(edges).toContainEqual({ id: "a->b", source: "a", target: "b" });
  });

  it("trata parentId inexistente como raiz (dado em edição no admin)", () => {
    const { nodes, edges } = layoutCareerTree([
      node("orphan", "ghost"),
      node("root", null),
    ]);
    expect(nodes).toHaveLength(2);
    expect(edges).toHaveLength(0);
  });

  it("suporta múltiplas raízes", () => {
    const { nodes } = layoutCareerTree([
      node("r1", null),
      node("r2", null),
      node("a", "r1"),
    ]);
    expect(nodes.filter((n) => n.parentId === null)).toHaveLength(2);
  });
});
