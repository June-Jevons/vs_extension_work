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
import {
  getAvailableGraphLayoutModeOptions,
  getDefaultGraphLayoutMode,
  GraphLayoutMode,
  layoutGraphWithElk
} from "../webview/elkLayout";
import { GraphNodeKind, GraphSemanticEdgeKind, GraphViewEdge, GraphViewModel, GraphViewNode } from "../webview/graphViewModel";
import { getCachedLayout, storeCachedLayout } from "./layoutCache";

interface GraphCanvasProps {
  view: GraphViewModel;
  testId: string;
}

type FlowNodeData = {
  graphNode: GraphViewNode;
};

type FlowNode = Node<FlowNodeData>;

interface LegendItem<T extends string> {
  id: T;
  label: string;
  detail: string;
}

const nodeTypes = {
  system: GraphNodeCard,
  feature: GraphNodeCard,
  layer: GraphNodeCard,
  package: GraphNodeCard,
  launch: GraphNodeCard,
  node: GraphNodeCard,
  topic: GraphNodeCard,
  entrypoint: GraphNodeCard,
  orchestrator: GraphNodeCard,
  service: GraphNodeCard,
  adapter: GraphNodeCard,
  config: GraphNodeCard,
  data: GraphNodeCard,
  action: GraphNodeCard,
  module: GraphNodeCard,
  summary: GraphNodeCard
};

export function GraphCanvas({ view, testId }: GraphCanvasProps): React.JSX.Element {
  const layoutOptions = useMemo(() => getAvailableGraphLayoutModeOptions(view), [view]);
  const defaultLayoutMode = useMemo(() => getDefaultGraphLayoutMode(view), [view]);
  const [layoutMode, setLayoutMode] = useState<GraphLayoutMode>(defaultLayoutMode);
  const effectiveLayoutMode = layoutOptions.some((option) => option.id === layoutMode) ? layoutMode : defaultLayoutMode;

  useEffect(() => {
    setLayoutMode((current) => layoutOptions.some((option) => option.id === current) ? current : defaultLayoutMode);
  }, [defaultLayoutMode, layoutOptions]);

  return (
    <section className="graph-card" data-testid={testId}>
      <div className="graph-card-header">
        <div className="graph-card-title">
          <h2>{view.title}</h2>
          <p>{view.description}</p>
        </div>
        <div className="graph-card-actions">
          <label className="graph-layout-control">
            <span className="graph-layout-label">Layout</span>
            <select
              aria-label={`${view.title} layout`}
              data-testid="graph-layout-mode"
              value={effectiveLayoutMode}
              onChange={(event) => setLayoutMode(event.target.value as GraphLayoutMode)}
            >
              {layoutOptions.map((option) => (
                <option key={option.id} value={option.id} title={option.detail}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <span className="graph-stat-pill">{view.nodes.length} nodes / {view.edges.length} edges</span>
        </div>
      </div>
      <ReactFlowProvider>
        <LaidOutGraph view={view} layoutMode={effectiveLayoutMode} />
      </ReactFlowProvider>
    </section>
  );
}

function LaidOutGraph({ view, layoutMode }: { view: GraphViewModel; layoutMode: GraphLayoutMode }): React.JSX.Element {
  const [layout, setLayout] = useState<GraphViewModel | undefined>(() => getCachedLayout(view, layoutMode));
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedLayout(view, layoutMode);
    if (cached) {
      setLayout(cached);
      setError(undefined);
      return;
    }

    setLayout(undefined);
    setError(undefined);
    void layoutGraphWithElk(view, layoutMode)
      .then((result) => {
        if (cancelled) {
          return;
        }
        storeCachedLayout(result, layoutMode);
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
  }, [view, layoutMode]);

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
        fitViewOptions={{ padding: 0.18 }}
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
      <GraphLegend view={view} />
    </div>
  );
}

function GraphLegend({ view }: { view: GraphViewModel }): React.JSX.Element {
  const nodeKinds = new Set(view.nodes.map((node) => node.kind));
  const edgeKinds = new Set(view.edges.map((edge) => edge.semanticKind).filter((kind): kind is GraphSemanticEdgeKind => Boolean(kind)));
  const visibleBlockItems = blockLegendItems.filter((item) => nodeKinds.has(item.id));
  const visibleEdgeItems = edgeLegendItems.filter((item) => edgeKinds.has(item.id));

  return (
    <aside className="graph-legend" data-testid="graph-legend" aria-label="Graph legend">
      <strong>Legend</strong>
      {visibleBlockItems.length > 0 ? (
        <div className="graph-legend-group">
          <span>Blocks</span>
          {visibleBlockItems.map((item) => (
            <div className="graph-legend-row" key={item.id} title={item.detail}>
              <i className={`graph-legend-swatch graph-legend-node-${item.id}`} />
              <b>{item.label}</b>
            </div>
          ))}
        </div>
      ) : null}
      <div className="graph-legend-group">
        <span>Outline</span>
        {riskLegendItems.map((item) => (
          <div className="graph-legend-row" key={item.id} title={item.detail}>
            <i className={`graph-legend-swatch graph-legend-risk-${item.id}`} />
            <b>{item.label}</b>
          </div>
        ))}
      </div>
      {visibleEdgeItems.length > 0 ? (
        <div className="graph-legend-group">
          <span>Lines</span>
          {visibleEdgeItems.map((item) => (
            <div className="graph-legend-row" key={item.id} title={item.detail}>
              <i className={`graph-legend-line graph-legend-edge-${item.id}`} />
              <b>{item.label}</b>
            </div>
          ))}
        </div>
      ) : null}
    </aside>
  );
}

function GraphNodeCard({ data }: NodeProps<FlowNode>): React.JSX.Element {
  const node = data.graphNode;
  const metrics = [
    typeof node.moduleCount === "number" ? `${node.moduleCount} modules` : undefined,
    typeof node.changedFileCount === "number" && node.changedFileCount > 0 ? `${node.changedFileCount} changed` : undefined,
    node.riskLevel ? `${node.riskLevel} risk` : undefined
  ].filter((item): item is string => Boolean(item));
  return (
    <div className={`graph-node graph-node-${node.kind} risk-${node.riskLevel ?? "none"}`}>
      <Handle className="graph-handle" type="target" position={Position.Left} />
      <strong>{node.label}</strong>
      {node.role ? <em>{node.role}</em> : null}
      <span>{node.detail}</span>
      {metrics.length > 0 ? <small>{metrics.join(" / ")}</small> : <small>{node.kind}</small>}
      {node.badges && node.badges.length > 0 ? (
        <div className="graph-node-badges">
          {node.badges.slice(0, 3).map((badge) => (
            <b key={badge}>{badge}</b>
          ))}
        </div>
      ) : null}
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
    style: {
      width: node.width,
      height: node.height
    },
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
      stroke: getEdgeColor(edge.semanticKind),
      strokeWidth: edge.confidence === "low" ? 1.2 : 1.7,
      strokeDasharray: edge.confidence === "low" ? "6 5" : undefined
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

function getEdgeColor(kind: GraphViewEdge["semanticKind"]): string {
  switch (kind) {
    case "starts":
    case "flows":
      return "#86b7ff";
    case "calls":
    case "uses":
    case "imports":
      return "#90a9ba";
    case "configures":
      return "#a6d98c";
    case "publishes":
    case "subscribes":
      return "#d7a4ff";
    case "launches":
    case "commandFlow":
      return "#72d6c9";
    case "callsService":
    case "offersService":
    case "usesAction":
      return "#ffae7a";
    case "usesConfig":
      return "#a6d98c";
    case "validates":
      return "#f2c56d";
    case "contains":
      return "#6e8393";
    default:
      return "#90a9ba";
  }
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

const blockLegendItems: Array<LegendItem<GraphNodeKind>> = [
  { id: "system", label: "System", detail: "Workspace-level runtime system" },
  { id: "layer", label: "Layer", detail: "Architecture layer or lane" },
  { id: "feature", label: "Feature", detail: "Runtime feature block" },
  { id: "package", label: "Package", detail: "ROS2 package or dependency" },
  { id: "launch", label: "Launch", detail: "ROS2 launch entrypoint" },
  { id: "node", label: "Node", detail: "ROS2 node" },
  { id: "topic", label: "Topic", detail: "ROS topic" },
  { id: "entrypoint", label: "Entry", detail: "Runtime input or entrypoint" },
  { id: "orchestrator", label: "Orchestrator", detail: "Coordination or sequencing node" },
  { id: "service", label: "Service", detail: "Processing, safety, or support step" },
  { id: "adapter", label: "Adapter", detail: "External controller or bridge boundary" },
  { id: "config", label: "Config", detail: "Runtime configuration dependency" },
  { id: "data", label: "Data", detail: "Data, state, or output node" },
  { id: "action", label: "Action", detail: "ROS action" },
  { id: "module", label: "Module", detail: "Individual runtime module" },
  { id: "summary", label: "Summary", detail: "Diagnostic or unclassified summary" }
];

const riskLegendItems: Array<LegendItem<"high" | "medium" | "low" | "semantic">> = [
  { id: "high", label: "High risk", detail: "High-risk runtime surface" },
  { id: "medium", label: "Medium risk", detail: "Medium-risk runtime surface" },
  { id: "low", label: "Low risk", detail: "Low-risk runtime surface" },
  { id: "semantic", label: "Role outline", detail: "Used when no risk level is assigned" }
];

const edgeLegendItems: Array<LegendItem<GraphSemanticEdgeKind>> = [
  { id: "flows", label: "Flow", detail: "Operation or data flow" },
  { id: "starts", label: "Starts", detail: "Starts a flow" },
  { id: "calls", label: "Calls", detail: "Calls another runtime feature" },
  { id: "uses", label: "Uses", detail: "Uses another runtime feature" },
  { id: "imports", label: "Imports", detail: "Inferred from import edges" },
  { id: "launches", label: "Launches", detail: "Launch file starts a node" },
  { id: "configures", label: "Configures", detail: "Configuration dependency" },
  { id: "publishes", label: "Publishes", detail: "Publishes output or command" },
  { id: "subscribes", label: "Subscribes", detail: "Consumes published runtime state" },
  { id: "callsService", label: "Calls Service", detail: "Calls a ROS service" },
  { id: "offersService", label: "Offers Service", detail: "Provides a ROS service" },
  { id: "usesAction", label: "Uses Action", detail: "Uses a ROS action" },
  { id: "usesConfig", label: "Uses Config", detail: "Uses a config file or parameter set" },
  { id: "commandFlow", label: "Command Flow", detail: "Command flow inferred from runtime facts" },
  { id: "validates", label: "Validates", detail: "Safety or validation relation" },
  { id: "contains", label: "Contains", detail: "Hierarchy or grouping relation" }
];
