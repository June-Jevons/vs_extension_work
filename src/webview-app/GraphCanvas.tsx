import React, { useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  NodeProps,
  Position,
  ReactFlow,
  ReactFlowProvider
} from "@xyflow/react";
import { layoutGraphWithElk } from "../webview/elkLayout";
import { GraphViewModel, GraphViewNode } from "../webview/graphViewModel";
import { getCachedLayout, storeCachedLayout } from "./layoutCache";

interface GraphCanvasProps {
  view: GraphViewModel;
  testId: string;
}

type FlowNodeData = {
  graphNode: GraphViewNode;
};

type FlowNode = Node<FlowNodeData>;

const nodeTypes = {
  feature: GraphNodeCard,
  module: GraphNodeCard,
  summary: GraphNodeCard
};

export function GraphCanvas({ view, testId }: GraphCanvasProps): React.JSX.Element {
  return (
    <section className="graph-card" data-testid={testId}>
      <div className="graph-card-header">
        <div>
          <h2>{view.title}</h2>
          <p>{view.description}</p>
        </div>
        <span>{view.nodes.length} nodes / {view.edges.length} edges</span>
      </div>
      <ReactFlowProvider>
        <LaidOutGraph view={view} />
      </ReactFlowProvider>
    </section>
  );
}

function LaidOutGraph({ view }: { view: GraphViewModel }): React.JSX.Element {
  const [layout, setLayout] = useState<GraphViewModel | undefined>(() => getCachedLayout(view));
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedLayout(view);
    if (cached) {
      setLayout(cached);
      setError(undefined);
      return;
    }

    setLayout(undefined);
    setError(undefined);
    void layoutGraphWithElk(view)
      .then((result) => {
        if (cancelled) {
          return;
        }
        storeCachedLayout(result);
        setLayout(result);
      })
      .catch((reason: unknown) => {
        if (cancelled) {
          return;
        }
        setError(reason instanceof Error ? reason.message : "ELK layout failed.");
      });

    return () => {
      cancelled = true;
    };
  }, [view]);

  const nodes = useMemo(() => layout ? toFlowNodes(layout) : [], [layout]);
  const edges = useMemo(() => layout ? toFlowEdges(layout) : [], [layout]);

  if (error) {
    return (
      <div className="graph-error" data-testid="graph-layout-error">
        <strong>Graph layout unavailable</strong>
        <span>{error}</span>
      </div>
    );
  }

  if (!layout) {
    return <div className="graph-loading" data-testid="graph-layout-loading">Running ELK layout...</div>;
  }

  return (
    <div className="react-flow-frame" data-testid="react-flow-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={1.8}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#30404d" gap={22} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(node) => getRiskColor((node.data as FlowNodeData).graphNode.riskLevel)}
          maskColor="rgba(15, 22, 29, 0.72)"
        />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

function GraphNodeCard({ data }: NodeProps<FlowNode>): React.JSX.Element {
  const node = data.graphNode;
  return (
    <div className={`graph-node graph-node-${node.kind} risk-${node.riskLevel ?? "none"}`}>
      <Handle className="graph-handle" type="target" position={Position.Left} />
      <strong>{node.label}</strong>
      <span>{node.detail}</span>
      <small>{node.kind}{node.riskLevel ? ` / ${node.riskLevel}` : ""}</small>
      <Handle className="graph-handle" type="source" position={Position.Right} />
    </div>
  );
}

function toFlowNodes(view: GraphViewModel): FlowNode[] {
  return view.nodes.map((node) => ({
    id: node.id,
    type: node.kind,
    position: {
      x: node.x ?? 0,
      y: node.y ?? 0
    },
    data: {
      graphNode: node
    },
    width: node.width,
    height: node.height,
    draggable: false
  }));
}

function toFlowEdges(view: GraphViewModel): Edge[] {
  return view.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    type: "smoothstep",
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: "#90a9ba"
    },
    style: {
      stroke: edge.kind === "test" ? "#8fd6a4" : "#90a9ba",
      strokeWidth: 1.7
    },
    labelStyle: {
      fill: "#c9d6e2",
      fontSize: 11
    },
    labelBgStyle: {
      fill: "#101820"
    }
  }));
}

function getRiskColor(riskLevel: GraphViewNode["riskLevel"]): string {
  switch (riskLevel) {
    case "high":
      return "#f26d6d";
    case "medium":
      return "#f2c56d";
    case "low":
      return "#75d79d";
    default:
      return "#8fa9bc";
  }
}
