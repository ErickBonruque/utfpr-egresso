import dagre from "@dagrejs/dagre";

/// Estados de exibição de um nó da árvore no portal do aluno. O engine da
/// Fase 6 deriva isso das matrículas; até lá vem de mock/seed.
export type CareerNodeState = "done" | "in-progress" | "locked";

export type CareerTreeNode = {
  id: string;
  /// null = raiz (a árvore configurada no admin pode ter várias raízes).
  parentId: string | null;
  title: string;
  subtitle?: string | null;
  icon?: string | null;
  xp: number;
  state: CareerNodeState;
  /// 0–100 (relevante para "in-progress").
  progress: number;
};

export type PositionedCareerNode = CareerTreeNode & { x: number; y: number };

export type CareerTreeEdge = { id: string; source: string; target: string };

export type CareerTreeLayout = {
  nodes: PositionedCareerNode[];
  edges: CareerTreeEdge[];
};

export const CAREER_NODE_WIDTH = 176;
export const CAREER_NODE_HEIGHT = 88;

/// Posiciona a árvore (top-down) com dagre. Puro: recebe os nós com
/// parentId e devolve posições top-left (convenção do React Flow) + edges.
/// Nós com parentId inexistente são tratados como raízes (dado do admin
/// pode estar em edição — não explodir).
export function layoutCareerTree(nodes: CareerTreeNode[]): CareerTreeLayout {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 56 });
  g.setDefaultEdgeLabel(() => ({}));

  const ids = new Set(nodes.map((n) => n.id));
  const edges: CareerTreeEdge[] = [];

  for (const node of nodes) {
    g.setNode(node.id, {
      width: CAREER_NODE_WIDTH,
      height: CAREER_NODE_HEIGHT,
    });
  }
  for (const node of nodes) {
    if (node.parentId && ids.has(node.parentId)) {
      g.setEdge(node.parentId, node.id);
      edges.push({
        id: `${node.parentId}->${node.id}`,
        source: node.parentId,
        target: node.id,
      });
    }
  }

  dagre.layout(g);

  const positioned = nodes.map((node) => {
    const { x, y } = g.node(node.id);
    // dagre devolve o centro do nó; React Flow espera o canto superior
    // esquerdo.
    return {
      ...node,
      x: x - CAREER_NODE_WIDTH / 2,
      y: y - CAREER_NODE_HEIGHT / 2,
    };
  });

  return { nodes: positioned, edges };
}
