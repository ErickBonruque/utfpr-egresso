"use client";

import {
  Background,
  Controls,
  Handle,
  MiniMap,
  type Node,
  type NodeProps,
  Position,
  ReactFlow,
} from "@xyflow/react";
import { Lock } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import { GamIcon } from "@/components/gam-icon";
import {
  CAREER_NODE_HEIGHT,
  CAREER_NODE_WIDTH,
  type CareerTreeNode,
  layoutCareerTree,
} from "@/lib/career-tree";
import { cn } from "@/lib/utils";

import "@xyflow/react/dist/style.css";

type CareerFlowNode = Node<{ node: CareerTreeNode }, "career">;

/// Nó custom do React Flow: um card do design system em 3 estados
/// (concluído/amarelo, em progresso/outline+barra, bloqueado/tracejado).
function CareerNodeView({ data }: NodeProps<CareerFlowNode>) {
  const { node } = data;
  const locked = node.state === "locked";

  return (
    <div
      style={{ width: CAREER_NODE_WIDTH, minHeight: CAREER_NODE_HEIGHT }}
      className={cn(
        "flex flex-col gap-1 rounded-lg border bg-card p-2.5 text-card-foreground shadow-sm",
        node.state === "done" && "border-brand",
        locked && "border-dashed opacity-60",
      )}
    >
      <Handle type="target" position={Position.Top} className="invisible!" />
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-md border",
          node.state === "done"
            ? "border-transparent bg-brand text-brand-foreground"
            : "bg-muted text-muted-foreground",
        )}
      >
        {locked ? (
          <Lock className="size-3" aria-hidden />
        ) : (
          <GamIcon name={node.icon} className="size-3" />
        )}
      </span>
      <p className="font-medium text-xs leading-tight">{node.title}</p>
      <p className="text-[10px] text-muted-foreground tabular-nums">
        {locked
          ? (node.subtitle ?? "requisitos pendentes")
          : `${node.progress}% · ${node.xp} XP`}
      </p>
      {node.state === "in-progress" && (
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-brand"
            style={{ width: `${node.progress}%` }}
          />
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="invisible!" />
    </div>
  );
}

const nodeTypes = { career: CareerNodeView };

/// Árvore de carreiras (React Flow + dagre — decisão da Fase 5). Layout
/// automático a partir dos nós configurados no admin; pan/zoom/pinch
/// nativos. Clique no nó → onSelect (painel lateral / bottom-sheet fica a
/// cargo da tela, ver /styleguide).
export function CareerTree({
  nodes,
  onSelect,
  className,
}: {
  nodes: CareerTreeNode[];
  onSelect?: (node: CareerTreeNode) => void;
  className?: string;
}) {
  const { resolvedTheme } = useTheme();

  const { flowNodes, flowEdges } = useMemo(() => {
    const layout = layoutCareerTree(nodes);
    return {
      flowNodes: layout.nodes.map(
        (n): CareerFlowNode => ({
          id: n.id,
          type: "career",
          position: { x: n.x, y: n.y },
          data: { node: n },
        }),
      ),
      flowEdges: layout.edges.map((e) => ({
        ...e,
        type: "smoothstep" as const,
      })),
    };
  }, [nodes]);

  return (
    <div className={cn("h-[28rem] rounded-lg border bg-card", className)}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        colorMode={resolvedTheme === "dark" ? "dark" : "light"}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_e, n) => onSelect?.(n.data.node)}
        minZoom={0.3}
        maxZoom={1.5}
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable className="hidden! md:block!" />
      </ReactFlow>
    </div>
  );
}
