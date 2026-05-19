export type SemanticFlowRole =
  | "entrypoint"
  | "orchestrator"
  | "service"
  | "adapter"
  | "config"
  | "data"
  | "safety"
  | "output";

export interface SemanticFeatureDefinition {
  featureId: string;
  layer: string;
  role: string;
  inputs: string[];
  outputs: string[];
  flowSteps: SemanticFlowStep[];
}

export interface SemanticFlowStep {
  id: string;
  label: string;
  role: SemanticFlowRole;
  description: string;
  pathHints: string[];
  importHints: string[];
}

const definitions: SemanticFeatureDefinition[] = [
  {
    featureId: "gui-layer",
    layer: "Interface / GUI",
    role: "Operator-facing views collect commands and surface runtime status.",
    inputs: ["Operator action", "Runtime status"],
    outputs: ["Backend command", "Diagnostics display"],
    flowSteps: [
      step("operator-entry", "Operator Entry", "entrypoint", "Launcher, main window, or panel entrypoint receives the operator action.", ["gui", "main", "launcher", "operator"], ["runtime", "config"]),
      step("view-composition", "View / Tab Composition", "service", "Panels, tabs, and widgets compose the feature-specific workflow.", ["view", "tab", "panel", "widget"], ["motion", "zone", "settings"]),
      step("command-dispatch", "Backend Dispatch", "orchestrator", "User intent is converted into backend runtime commands.", ["dispatch", "command", "action"], ["task", "motion", "runner"]),
      step("status-display", "Status / Diagnostics Display", "output", "Runtime feedback is rendered back to the operator.", ["status", "diagnostic", "feedback"], ["state", "logging"])
    ]
  },
  {
    featureId: "task-runner",
    layer: "Orchestration",
    role: "Sequences jobs and coordinates planning, safety, and robot I/O.",
    inputs: ["User command", "Job definition"],
    outputs: ["Runtime sequence", "Robot command request"],
    flowSteps: [
      step("task-request", "Task Request", "entrypoint", "A job or sequence request enters the runner.", ["task", "runner", "job"], ["gui", "request"]),
      step("sequence-orchestration", "Sequence Orchestration", "orchestrator", "Runner logic orders steps and coordinates dependent services.", ["sequence", "orchestrator", "runner"], ["motion", "safety"]),
      step("planning-call", "Planning Call", "service", "Motion planning is requested for the current job step.", ["motion", "plan"], ["motion", "trajectory"]),
      step("robot-command", "Robot Command Dispatch", "output", "Validated commands are sent toward robot I/O.", ["command", "dispatch"], ["rws", "egm", "robot"])
    ]
  },
  {
    featureId: "motion-planning",
    layer: "Planning",
    role: "Builds robot motion requests from poses, paths, trajectories, and constraints.",
    inputs: ["Task request", "Pose/path data"],
    outputs: ["Validated robot motion command"],
    flowSteps: [
      step("request-source", "Request Source", "entrypoint", "A GUI or task runner asks for motion generation.", ["motion", "request", "builder"], ["task", "gui"]),
      step("motion-builder", "Motion Builder", "orchestrator", "Motion builders choose MoveJ, MoveL, or task-specific motion strategy.", ["motion", "movej", "movel", "builder"], ["trajectory", "pose"]),
      step("path-trajectory", "Pose / Path / Trajectory", "service", "Geometry helpers prepare poses, paths, and trajectory data.", ["pose", "path", "trajectory"], ["math", "transform"]),
      step("ik-validation", "IK / Validation", "safety", "Kinematic and safety validation constrain the command before output.", ["ik", "validation", "collision", "limit"], ["safety", "zone"]),
      step("robot-command-output", "Robot Command Output", "output", "The planned movement is emitted as a robot command target.", ["command", "output"], ["robot", "rws", "rapid"])
    ]
  },
  {
    featureId: "safety-layer",
    layer: "Safety",
    role: "Validates limits, zones, collisions, and guarded runtime constraints.",
    inputs: ["Motion candidate", "Runtime state"],
    outputs: ["Safety decision", "Validated command"],
    flowSteps: [
      step("safety-input", "Motion Candidate", "entrypoint", "A planned motion or runtime request enters safety validation.", ["safety", "validation"], ["motion", "task"]),
      step("zone-limit-check", "Zone / Limit Check", "safety", "Zones, limits, and guards reject unsafe requests.", ["zone", "limit", "guard"], ["config", "pose"]),
      step("collision-validation", "Collision Validation", "safety", "Collision checks and IK constraints validate the movement.", ["collision", "ik"], ["trajectory", "path"]),
      step("safety-output", "Safety Decision", "output", "The layer publishes whether the request can proceed.", ["decision", "validated"], ["robot", "runner"])
    ]
  },
  {
    featureId: "robot-io-layer",
    layer: "Robot I/O",
    role: "Adapts validated commands to controller, RWS, EGM, RAPID, and TCP communication.",
    inputs: ["Validated command", "Controller config"],
    outputs: ["Controller command", "Robot feedback"],
    flowSteps: [
      step("command-input", "Command Input", "entrypoint", "A validated command enters the robot I/O boundary.", ["command", "robot"], ["motion", "runner"]),
      step("client-adapter", "Client Adapter", "adapter", "Client modules adapt internal commands to controller APIs.", ["client", "adapter", "controller"], ["config"]),
      step("controller-protocol", "RWS / EGM / RAPID", "adapter", "Protocol-specific modules communicate with the robot controller.", ["rws", "egm", "rapid"], ["robotware", "controller"]),
      step("controller-communication", "Controller Communication", "service", "The runtime sends commands and receives controller responses.", ["communication", "controller"], ["state", "feedback"]),
      step("feedback-state", "Feedback / TCP / State", "output", "Robot state, TCP, and feedback are returned to the runtime.", ["feedback", "tcp", "state"], ["diagnostic"])
    ]
  },
  {
    featureId: "config-system",
    layer: "Config / Common",
    role: "Loads settings, environment, YAML/TOML data, and runtime configuration.",
    inputs: ["Configuration files", "Environment"],
    outputs: ["Runtime settings"],
    flowSteps: [
      step("config-source", "Config Source", "entrypoint", "Runtime configuration starts from files or environment.", ["config", "settings", "env"], ["yaml", "toml"]),
      step("config-loader", "Config Loader", "config", "Loader modules parse and normalize configuration values.", ["loader", "config"], ["yaml", "toml", "json"]),
      step("runtime-settings", "Runtime Settings", "data", "Configuration is exposed as typed runtime settings.", ["runtime", "settings"], ["env"]),
      step("config-output", "Configured Runtime", "output", "Runtime services consume the resulting settings.", ["configured", "runtime"], ["robot", "gui", "runner"])
    ]
  },
  {
    featureId: "ros-bridge-runtime",
    layer: "Runtime / ROS",
    role: "Connects launch, ROS nodes, bridges, visualization, and runtime processes.",
    inputs: ["Launch request", "Runtime config"],
    outputs: ["Running node graph", "Diagnostics"],
    flowSteps: [
      step("runtime-entry", "Runtime Entry", "entrypoint", "Launch or startup modules begin the runtime process.", ["launch", "launcher", "startup"], ["config"]),
      step("node-management", "Node Management", "orchestrator", "Node managers and bridge code coordinate runtime services.", ["node", "bridge", "runtime"], ["ros"]),
      step("runtime-service", "Runtime Service", "service", "Runtime modules publish state and consume robot I/O.", ["runtime", "platform"], ["robot", "state"]),
      step("diagnostics-output", "Feedback / Diagnostics", "output", "ROS and visualization status are surfaced as diagnostics.", ["diagnostic", "visualization", "rviz"], ["feedback"])
    ]
  },
  {
    featureId: "utils-common",
    layer: "Config / Common",
    role: "Provides shared logging, math, transform, file, and helper services.",
    inputs: ["Runtime request"],
    outputs: ["Shared helper result"],
    flowSteps: [
      step("utility-request", "Utility Request", "entrypoint", "Runtime modules call shared support code.", ["utils", "common", "helper"], ["runtime"]),
      step("helper-service", "Helper Service", "service", "Shared helpers perform reusable work.", ["helper", "logging", "file"], ["math", "transform"]),
      step("shared-data", "Shared Data / Transform", "data", "Common data, transforms, or logging output is returned.", ["math", "transform", "logging"], ["state"])
    ]
  },
  {
    featureId: "unmapped-unknown",
    layer: "Runtime / Other",
    role: "Runtime modules that need explicit classification.",
    inputs: ["Runtime import context"],
    outputs: ["Unclassified runtime support"],
    flowSteps: [
      step("unclassified-runtime", "Supporting / Unclassified Runtime Modules", "service", "Runtime modules are visible but do not yet match a semantic role.", [], [])
    ]
  }
];

export function getSemanticFeatureDefinition(featureId: string | undefined): SemanticFeatureDefinition | undefined {
  return definitions.find((definition) => definition.featureId === featureId);
}

export function getSemanticFeatureDefinitions(): SemanticFeatureDefinition[] {
  return [...definitions];
}

function step(
  id: string,
  label: string,
  role: SemanticFlowRole,
  description: string,
  pathHints: string[],
  importHints: string[]
): SemanticFlowStep {
  return {
    id,
    label,
    role,
    description,
    pathHints,
    importHints
  };
}
