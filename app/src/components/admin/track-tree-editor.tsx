"use client";

import {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  type OnConnect,
  type OnNodeDrag,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { Plus } from "lucide-react";
import { useTheme } from "next-themes";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { toast } from "sonner";
import { ConfirmButton } from "@/components/admin/confirm-button";
import {
  NodeFields,
  type TrackNodeData,
} from "@/components/admin/track-node-fields";
import { GamIcon } from "@/components/gam-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CAREER_NODE_HEIGHT,
  CAREER_NODE_WIDTH,
  type CareerTreeNode,
  layoutCareerTree,
} from "@/lib/career-tree";
import { TRACK_NODE_KIND_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

import "@xyflow/react/dist/style.css";

type TrackEditNodeData = { node: TrackNodeData; selected: boolean };
type TrackEditFlowNode = Node<TrackEditNodeData, "track">;

/// Nó custom do React Flow no modo edição: card sem estados de progresso
/// (o admin não vê done/locked — vê a estrutura). A realce `--brand` indica
/// o nó selecionado (abre o painel lateral). Handles visíveis para conectar.
function TrackNodeEditView({ data }: NodeProps<TrackEditFlowNode>) {
  const { node, selected } = data;
  return (
    <div
      style={{ width: CAREER_NODE_WIDTH, minHeight: CAREER_NODE_HEIGHT }}
      className={cn(
        "flex flex-col gap-1 rounded-lg border bg-card p-2.5 text-card-foreground shadow-sm transition-colors",
        selected && "border-brand ring-2 ring-brand/40",
      )}
    >
      <Handle type="target" position={Position.Top} />
      <span className="flex size-6 items-center justify-center rounded-md border bg-muted text-muted-foreground">
        <GamIcon name={node.icon} className="size-3" />
      </span>
      <p className="font-medium text-xs leading-tight">{node.name}</p>
      <div className="flex items-center gap-1">
        <Badge
          variant={node.kind === "BRANCH" ? "outline" : "secondary"}
          className="px-1 py-0 text-[9px]"
        >
          {TRACK_NODE_KIND_LABEL[node.kind]}
        </Badge>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {node.xpReward} XP
        </span>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { track: TrackNodeEditView };

type EditorProps = {
  trackId: string;
  nodes: TrackNodeData[];
  subjects: { code: string; name: string }[];
  // Server actions (pre-bound ou não — o componente fecha o bind).
  createNodeAt: (
    trackId: string,
    parentId: string | null,
  ) => Promise<{ error: string } | { id: string } | undefined>;
  setNodeParent: (
    nodeId: string,
    parentId: string | null,
  ) => Promise<{ error: string } | undefined>;
  reorderSiblings: (
    nodeId: string,
    sortOrder: number,
  ) => Promise<{ error: string } | undefined>;
  updateNode: (
    nodeId: string,
    formData: FormData,
  ) => Promise<{ error: string } | undefined>;
  deleteNode: (nodeId: string) => Promise<{ error: string } | undefined>;
};

export function TrackTreeEditor({
  trackId,
  nodes,
  subjects,
  createNodeAt,
  setNodeParent,
  reorderSiblings,
  updateNode,
  deleteNode,
}: EditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  );

  // Layout dagre a partir dos nós (mapeados pro tipo de exibição). Recomputado
  // sempre que `nodes` muda (depois de uma action, a page re-renderiza com
  // dados novos). Posições XY não são persistidas — decisão da sub-fase 6.2.1.
  const { initialNodes, initialEdges } = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const viewNodes: CareerTreeNode[] = nodes.map((n) => ({
      id: n.id,
      parentId: n.parentId,
      title: n.name,
      xp: n.xpReward,
      state: "done",
      progress: 0,
    }));
    const layout = layoutCareerTree(viewNodes);
    return {
      initialNodes: layout.nodes
        .map((n): TrackEditFlowNode | null => {
          const original = byId.get(n.id);
          if (!original) return null;
          return {
            id: n.id,
            type: "track",
            position: { x: n.x, y: n.y },
            width: CAREER_NODE_WIDTH,
            height: CAREER_NODE_HEIGHT,
            data: {
              node: original,
              selected: n.id === selectedId,
            },
          };
        })
        .filter((n): n is TrackEditFlowNode => n !== null),
      initialEdges: layout.edges.map((e) => ({
        ...e,
        type: "smoothstep" as const,
      })),
    };
  }, [nodes, selectedId]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(initialNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sincroniza o estado do React Flow quando o layout recomputa (prop mudou).
  useEffect(() => {
    setFlowNodes(initialNodes);
    setFlowEdges(initialEdges);
  }, [initialNodes, initialEdges, setFlowNodes, setFlowEdges]);

  // Conectar source(handle inferior) → target define o pai. O React Flow já
  // adiciona a edge visualmente; persistimos no server e a revalidação traz
  // o layout recomputado. Em erro (ciclo), revertemos via toast.
  const onConnect = useCallback<OnConnect>(
    (connection) => {
      const parentId = connection.source;
      const childId = connection.target;
      if (!parentId || !childId || parentId === childId) return;
      startTransition(async () => {
        const result = await setNodeParent(childId, parentId);
        if (result?.error) toast.error(result.error);
        else toast.success("Nó reconectado.");
      });
      setFlowEdges((eds) => addEdge(connection, eds));
    },
    [setFlowEdges, setNodeParent],
  );

  // Ao soltar um nó arrastado: reordena os irmãos pelo eixo X. O dagre
  // recomputa as posições no próximo render, então o drag é efetivamente um
  // reorder — o nó "pula" para o lugar na árvore ao soltar.
  const onNodeDragStop = useCallback<OnNodeDrag>(
    (_evt, draggedNode) => {
      const dragged = nodes.find((n) => n.id === draggedNode.id);
      if (!dragged?.parentId) return; // raiz: dagre posiciona, sem reorder
      const siblings = flowNodes
        .map((fn) => nodes.find((n) => n.id === fn.id))
        .filter(
          (n): n is TrackNodeData => !!n && n.parentId === dragged.parentId,
        )
        .sort((a, b) => {
          const ax = flowNodes.find((fn) => fn.id === a.id)?.position.x ?? 0;
          const bx = flowNodes.find((fn) => fn.id === b.id)?.position.x ?? 0;
          return ax - bx;
        });
      const newOrder = siblings.findIndex((n) => n.id === dragged.id);
      if (newOrder < 0 || newOrder === dragged.sortOrder) return;
      startTransition(async () => {
        const result = await reorderSiblings(dragged.id, newOrder);
        if (result?.error) toast.error(result.error);
      });
    },
    [flowNodes, nodes, reorderSiblings],
  );

  const openNode = useCallback((node: TrackNodeData) => {
    setSelectedId(node.id);
    setSheetOpen(true);
    setUpdateError(null);
  }, []);

  // Cria nó e abre o painel para editá-lo em seguida.
  const handleCreate = useCallback(
    (parentId: string | null) => {
      startTransition(async () => {
        const result = await createNodeAt(trackId, parentId);
        if (!result) return;
        if ("error" in result) {
          if (result.error) toast.error(result.error);
          return;
        }
        toast.success("Nó criado — edite os detalhes.");
        setSelectedId(result.id);
        setSheetOpen(true);
        setUpdateError(null);
      });
    },
    [createNodeAt, trackId],
  );

  const onPaneDoubleClick = useCallback(() => {
    handleCreate(null);
  }, [handleCreate]);

  const onSubmitUpdate = useCallback(
    async (formData: FormData) => {
      if (!selectedNode) return;
      const result = await updateNode(selectedNode.id, formData);
      if (result?.error) {
        setUpdateError(result.error);
        return;
      }
      setSheetOpen(false);
      setUpdateError(null);
      toast.success("Nó salvo.");
    },
    [selectedNode, updateNode],
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => handleCreate(selectedNode ? selectedNode.id : null)}
          title={
            selectedNode
              ? `Adicionar filho de "${selectedNode.name}"`
              : "Adicionar nó raiz"
          }
        >
          <Plus className="size-4" />
          {selectedNode ? "Novo filho" : "Novo nó"}
        </Button>
        <span className="text-muted-foreground text-xs">
          Dica: arraste pelo handle para conectar (definir pai); duplo-clique no
          fundo cria nó raiz.
        </span>
      </div>
      {/* Mesmo motivo de career-tree.tsx: o MiniMap do React Flow deriva o
          viewBox de dimensões medidas, que o servidor não tem, e o SSR quebra
          a hidratação. Só o canvas espera montar; a barra acima já aparece. */}
      {!mounted ? (
        <output
          className="block h-[32rem] rounded-lg border bg-card"
          aria-busy="true"
          aria-label="Carregando o editor da trilha"
        />
      ) : (
        <div className="h-[32rem] rounded-lg border bg-card">
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            colorMode={resolvedTheme === "dark" ? "dark" : "light"}
            fitView
            nodesDraggable
            nodesConnectable
            elementsSelectable
            onNodeClick={(_e, n) => {
              const data = (n.data ?? {}) as TrackEditNodeData;
              if (data.node) openNode(data.node);
            }}
            onDoubleClick={(e) => {
              // Só dispara no fundo do canvas (classe do pane do React Flow),
              // não quando o duplo-clique acerta um nó.
              const target = e.target as HTMLElement;
              if (target.closest(".react-flow__node")) return;
              onPaneDoubleClick();
            }}
            minZoom={0.3}
            maxZoom={1.5}
          >
            <Background gap={24} />
            <Controls showInteractive={false} />
            <MiniMap
              pannable
              zoomable
              className="hidden! md:block!"
              nodeColor={() => "var(--muted-foreground)"}
              nodeStrokeColor="var(--border)"
              bgColor="var(--card)"
              maskColor="color-mix(in oklab, var(--muted) 55%, transparent)"
            />
          </ReactFlow>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
          {selectedNode ? (
            <form
              action={onSubmitUpdate}
              className="flex h-full flex-col gap-4"
            >
              <SheetHeader>
                <SheetTitle>Editar nó</SheetTitle>
                <SheetDescription>
                  Ajuste as propriedades do nó. Salvar revalida a árvore.
                </SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto px-4">
                <div className="flex flex-col gap-4">
                  <NodeFields
                    nodes={nodes}
                    subjects={subjects}
                    defaults={selectedNode}
                    excludeNodeId={selectedNode.id}
                  />
                </div>
              </div>
              {updateError ? (
                <p className="text-destructive px-4 text-sm">{updateError}</p>
              ) : null}
              <SheetFooter>
                <ConfirmButton
                  action={() => deleteNode(selectedNode.id)}
                  confirmMessage={`Excluir o nó "${selectedNode.name}"? Nós filhos também serão excluídos.`}
                  variant="ghost"
                >
                  Excluir
                </ConfirmButton>
                <SheetClose asChild>
                  <Button type="button" variant="outline">
                    Cancelar
                  </Button>
                </SheetClose>
                <Button type="submit">Salvar</Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
