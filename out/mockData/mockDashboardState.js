"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockDashboardState = createMockDashboardState;
const capturedAtIso = "2026-05-18T14:32:18+08:00";
const featureBlocks = [
    feature("config-system", "Config System", "Runtime and launch configuration loading.", "high", 3, 2, 3),
    feature("operator-startup", "Operator Panel Startup", "Launcher and startup flow for the operator UI.", "medium", 2, 3, 2),
    feature("tests-config", "Tests / Config Scanner", "Regression checks around config and startup.", "low", 2, 1, 1),
    feature("launcher-env", "Launcher / Subprocess Env", "Process manager and exported environment.", "medium", 2, 3, 0),
    feature("ros-runtime", "ROS Launch / Runtime", "ROS launch helpers and node manager runtime.", "low", 2, 2, 0),
    feature("gui-layer", "GUI Layer", "Motion, zones, gripper, and status panels.", "medium", 5, 4, 0),
    feature("task-runner", "Task Runner", "Box tasks, sequence manager, and job manager.", "medium", 3, 4, 0),
    feature("motion-planning", "Motion Planning", "Box motion builder, MoveJ, MoveL, and path generation.", "medium", 5, 5, 0),
    feature("safety-layer", "Safety Layer", "Zone checks, collision checks, IK validation, and limit checks.", "high", 4, 5, 0),
    feature("robot-io", "Robot I/O Layer", "RWS, EGM, RAPID, and TCP manager boundaries.", "high", 4, 3, 0),
    feature("utils-common", "Utils / Common", "Logging, file utilities, math helpers, and module utilities.", "low", 4, 1, 0),
    feature("abb-controller", "ABB Controller", "RobotWare, RAPID, and motion system runtime.", "medium", 2, 1, 0)
];
const modules = [
    moduleNode("runtime_config", "runtime_config", "src/abb_common/config/runtime_config.py", "config-system", "high", ["config_loader"], ["launcher", "startup"]),
    moduleNode("config_loader", "config_loader", "src/abb_common/config/config_loader.py", "config-system", "high", ["env_loader"], ["runtime_config", "startup"]),
    moduleNode("env_loader", "env_loader", "src/abb_common/config/env_loader.py", "config-system", "medium", [], ["config_loader"]),
    moduleNode("launcher", "launcher", "src/operator_panel/launcher.py", "operator-startup", "medium", ["startup", "runtime_config"], ["ros_launcher"]),
    moduleNode("startup", "startup", "src/operator_panel/startup.py", "operator-startup", "medium", ["config_loader"], ["launcher"], true),
    moduleNode("test_config_loader", "test_config_loader", "tests/config/test_config_loader.py", "tests-config", "low", ["config_loader"], [], false, true),
    moduleNode("test_runtime_config", "test_runtime_config", "tests/config/test_runtime_config.py", "tests-config", "low", ["runtime_config"], [], false, true),
    moduleNode("ros_launcher", "ros_launcher", "launch/ros_launcher.py", "ros-runtime", "low", ["launcher"], ["node_manager"], true),
    moduleNode("node_manager", "node_manager", "src/launch/node_manager.py", "ros-runtime", "medium", ["process_manager"], ["ros_launcher"]),
    moduleNode("process_manager", "process_manager", "src/launch/process_manager.py", "launcher-env", "medium", ["env_manager"], ["node_manager"]),
    moduleNode("env_manager", "env_manager", "src/launch/env_manager.py", "launcher-env", "medium", ["env_loader"], ["process_manager"]),
    moduleNode("motion_tab", "motion_tab", "src/operator_ui/panels/motion_tab.py", "gui-layer", "medium", ["box_motion_builder"], []),
    moduleNode("zones_tab", "zones_tab", "src/operator_ui/panels/zones_tab.py", "gui-layer", "medium", ["collision_checker"], []),
    moduleNode("box_motion_builder", "box_motion_builder", "src/abb_motion/box_motion_builder.py", "motion-planning", "medium", ["movej_builder", "path_generator"], ["motion_tab"]),
    moduleNode("movel_builder", "movel_builder", "src/abb_motion/movel_builder.py", "motion-planning", "medium", ["pose_manager"], ["box_motion_builder"]),
    moduleNode("movej_builder", "movej_builder", "src/abb_motion/movej_builder.py", "motion-planning", "medium", ["pose_manager"], ["box_motion_builder"]),
    moduleNode("path_generator", "path_generator", "src/abb_motion/path_generator.py", "motion-planning", "medium", ["trajectory_utils"], ["box_motion_builder"]),
    moduleNode("pose_manager", "pose_manager", "src/abb_motion/pose_manager.py", "motion-planning", "medium", ["ik_solver"], ["movel_builder", "movej_builder"]),
    moduleNode("collision_checker", "collision_checker", "src/abb_safety/collision_checker.py", "safety-layer", "high", ["zone_checker"], ["zones_tab", "pose_manager"]),
    moduleNode("ik_solver", "ik_solver", "src/abb_safety/ik_solver.py", "safety-layer", "high", ["limit_check"], ["pose_manager"]),
    moduleNode("zone_checker", "zone_checker", "src/abb_safety/zone_checker.py", "safety-layer", "high", [], ["collision_checker"]),
    moduleNode("rws_client", "rws_client", "src/abb_robot/rws_client.py", "robot-io", "high", [], ["egm_client"]),
    moduleNode("egm_client", "egm_client", "src/abb_robot/egm_client.py", "robot-io", "high", ["tcp_manager"], ["rws_client"]),
    moduleNode("tcp_manager", "tcp_manager", "src/abb_robot/tcp_manager.py", "robot-io", "medium", [], ["egm_client"]),
    moduleNode("logging_utils", "logging_utils", "src/abb_common/logging_utils.py", "utils-common", "low", [], []),
    moduleNode("math_utils", "math_utils", "src/abb_common/math_utils.py", "utils-common", "low", [], ["trajectory_utils"]),
    moduleNode("trajectory_utils", "trajectory_utils", "src/abb_common/trajectory_utils.py", "utils-common", "low", ["math_utils"], ["path_generator"])
];
const dependencies = [
    edge("runtime_config", "config_loader"),
    edge("config_loader", "env_loader"),
    edge("launcher", "startup"),
    edge("launcher", "runtime_config"),
    edge("startup", "config_loader"),
    edge("test_config_loader", "config_loader", "test"),
    edge("test_runtime_config", "runtime_config", "test"),
    edge("ros_launcher", "launcher", "entrypoint"),
    edge("node_manager", "process_manager"),
    edge("process_manager", "env_manager"),
    edge("env_manager", "env_loader"),
    edge("motion_tab", "box_motion_builder"),
    edge("zones_tab", "collision_checker"),
    edge("box_motion_builder", "movej_builder"),
    edge("box_motion_builder", "path_generator"),
    edge("movel_builder", "pose_manager"),
    edge("movej_builder", "pose_manager"),
    edge("path_generator", "trajectory_utils"),
    edge("pose_manager", "ik_solver"),
    edge("collision_checker", "zone_checker"),
    edge("ik_solver", "collision_checker"),
    edge("egm_client", "tcp_manager"),
    edge("rws_client", "egm_client")
];
const changedFiles = [
    changed("src/abb_common/config/runtime_config.py", "modified", "config-system", "runtime_config", "high", "Runtime config affects startup behavior.", "14:31:22"),
    changed("src/operator_panel/launcher.py", "modified", "operator-startup", "launcher", "medium", "Launcher changes can alter subprocess startup.", "14:30:11"),
    changed("src/abb_common/config/env_loader.py", "modified", "config-system", "env_loader", "medium", "Environment loading feeds config and launch paths.", "14:29:48"),
    changed("src/abb_common/config/config_utils.py", "modified", "config-system", "config_loader", "medium", "Shared config helper imported by startup modules.", "14:29:02"),
    changed("tests/config/test_config_loader.py", "modified", "tests-config", "test_config_loader", "low", "Changed test coverage for config loading.", "14:28:33"),
    changed("tests/config/test_runtime_config.py", "modified", "tests-config", "test_runtime_config", "low", "Changed test coverage for runtime config.", "14:28:15")
];
const suggestedTests = [
    changed("tests/config/test_runtime_config.py", "modified", "tests-config", "test_runtime_config", "low", "Direct runtime config coverage."),
    changed("tests/config/test_config_loader.py", "modified", "tests-config", "test_config_loader", "low", "Direct config loader coverage."),
    changed("tests/operator_panel/test_launcher.py", "unknown", "operator-startup", "launcher", "medium", "Covers launcher startup path."),
    changed("tests/integration/test_startup_flow.py", "unknown", "operator-startup", "startup", "medium", "Covers end-to-end startup flow.")
];
const impactedFeatures = [
    impacted("config-system", "Config System", "high", "Config loader and runtime config changed.", 3, 3),
    impacted("operator-startup", "Operator Panel Startup", "medium", "Launcher depends on runtime config.", 1, 2),
    impacted("tests-config", "Tests / Config Scanner", "low", "Changed tests are local to config scanner.", 2, 2),
    impacted("launcher-env", "Launcher / Subprocess Env", "medium", "Environment export depends on env_loader.", 0, 2),
    impacted("ros-runtime", "ROS Launch / Runtime", "low", "Runtime launch path consumes operator launcher.", 0, 2)
];
const risks = [
    {
        id: "risk-config",
        label: "Config startup path",
        level: "high",
        reason: "runtime_config.py affects startup configuration and is imported by launcher modules."
    },
    {
        id: "risk-launcher",
        label: "Launcher flow",
        level: "medium",
        reason: "launcher.py can alter subprocess startup and environment propagation."
    },
    {
        id: "risk-tests",
        label: "Changed test coverage",
        level: "low",
        reason: "Config tests changed alongside implementation files."
    }
];
const validations = [
    validation("syntax", "Python Syntax Check", "passed", "2.1s"),
    validation("compile", "Compile Check", "passed", "3.4s"),
    validation("changed-tests", "Unit Tests (Changed)", "passed", "12.3s (18 tests)"),
    validation("full-tests", "Full Test Suite", "running", "125/342"),
    validation("config-scanner", "Config Scanner", "passed", "1.8s"),
    validation("style", "Code Style (ruff)", "passed", "2.7s")
];
const snapshot = {
    workspaceKey: "mock:abb_ros2",
    workspaceName: "ABB_ROS2",
    rootUri: "file:///home/jevons/ABB_ROS2",
    capturedAtIso,
    git: {
        branch: "main",
        commit: "mock",
        hasChanges: true
    },
    modules,
    dependencies,
    featureBlocks,
    changedFiles,
    impactedFeatures,
    risks,
    health: {
        circularDependencyCount: 0,
        highRiskModuleCount: 3,
        orphanModuleCount: 2,
        estimatedCoveragePercent: 68
    },
    validations
};
const baselineDiff = {
    baselineCapturedAtIso: "2026-05-15T09:00:00+08:00",
    currentCapturedAtIso: capturedAtIso,
    addedModules: modules.slice(0, 5),
    removedModules: modules.slice(5, 7),
    changedModules: modules.slice(7, 18),
    addedEdges: dependencies.slice(0, 23),
    removedEdges: dependencies.slice(0, 7),
    changedFeatures: featureBlocks.slice(0, 5),
    riskChanges: risks
};
const modeLabels = {
    liveChanges: "Live Changes",
    wholeArchitecture: "Whole Architecture",
    featureFocus: "Feature Focus",
    diffSinceBaseline: "Diff Since Baseline"
};
function createMockDashboardState(mode = "liveChanges", selectedFeatureId = "motion-planning") {
    return {
        mode,
        workspace: {
            name: "ABB_ROS2",
            rootUri: "file:///home/jevons/ABB_ROS2",
            lastUpdatedLabel: "2026-05-18 14:32:18",
            autoRefresh: true,
            statusLabel: "Watching"
        },
        snapshot,
        selectedFeatureId,
        baselineDiff,
        isMockData: true,
        isLoading: false,
        ui: {
            modeLabels,
            currentChangePath: ["Config System", "Operator Panel Startup", "Tests / Config Scanner"],
            liveImpactGraph: liveImpactGraph(),
            dependencyGraph: dependencyGraph(),
            wholeArchitectureGraph: wholeArchitectureGraph(),
            featureInternalGraph: featureInternalGraph(),
            baselineBeforeGraph: baselineBeforeGraph(),
            baselineAfterGraph: baselineAfterGraph(),
            overviewCards: overviewCards(),
            healthCards: healthCards(),
            diffSummaryCards: diffSummaryCards(),
            featureDetail: {
                selectedFeatureId,
                relatedModuleIds: ["box_motion_builder", "movel_builder", "movej_builder", "path_generator", "pose_manager", "trajectory_utils", "ik_solver", "collision_checker"],
                relatedExternalFeatures: ["gui-layer", "task-runner", "safety-layer", "robot-io"],
                relatedTests: [
                    changed("tests/motion/test_box_motion_builder.py", "unknown", "motion-planning", "box_motion_builder", "low", "Feature-level builder coverage."),
                    changed("tests/motion/test_movej_builder.py", "unknown", "motion-planning", "movej_builder", "low", "MoveJ builder coverage."),
                    changed("tests/motion/test_movel_builder.py", "unknown", "motion-planning", "movel_builder", "low", "MoveL builder coverage."),
                    changed("tests/motion/test_path_generator.py", "unknown", "motion-planning", "path_generator", "low", "Path generator coverage."),
                    changed("tests/motion/test_ik_solver.py", "unknown", "safety-layer", "ik_solver", "low", "IK and safety coupling coverage.")
                ]
            },
            suggestedTests,
            timeline: timeline(),
            topChanges: topChanges(),
            changedFiles,
            impactedFeatures,
            featureBlocks
        }
    };
}
function feature(id, label, description, riskLevel, incomingEdges, outgoingEdges, changedFileCount) {
    return {
        id,
        label,
        description,
        pathPatterns: [],
        moduleIds: [],
        incomingEdges,
        outgoingEdges,
        changedFileCount,
        riskLevel
    };
}
function moduleNode(id, name, path, featureId, riskLevel, imports, importedBy, isEntryPoint = false, isTest = false) {
    return {
        id,
        name,
        path,
        language: "python",
        featureId,
        imports,
        importedBy,
        isEntryPoint,
        isTest,
        isOrphan: importedBy.length === 0 && !isEntryPoint && !isTest,
        riskLevel
    };
}
function edge(from, to, kind = "import") {
    return {
        from,
        to,
        kind,
        confidence: "high"
    };
}
function changed(path, status, featureId, moduleId, riskLevel, reason, lastChangedIso) {
    return {
        path,
        status,
        featureId,
        moduleId,
        riskLevel,
        reason,
        lastChangedIso
    };
}
function impacted(featureId, label, riskLevel, reason, changedFileCount, impactedModuleCount) {
    return {
        featureId,
        label,
        riskLevel,
        reason,
        changedFileCount,
        impactedModuleCount
    };
}
function validation(id, label, state, detail) {
    return {
        id,
        label,
        state,
        detail
    };
}
function overviewCards() {
    return [
        { label: "Total Python Files", value: "73", tone: "info" },
        { label: "Total Modules", value: "38", tone: "info" },
        { label: "Total Classes", value: "146", tone: "info" },
        { label: "Total Functions", value: "312", tone: "info" }
    ];
}
function healthCards() {
    return [
        { label: "Circular Dependencies", value: "0", tone: "low", detail: "No cycles found" },
        { label: "High-Risk Modules", value: "3", tone: "medium", detail: "Config and robot I/O" },
        { label: "Orphan Modules", value: "2", tone: "medium", detail: "Review ownership" },
        { label: "Estimated Coverage", value: "68%", tone: "info", detail: "Mock estimate" }
    ];
}
function diffSummaryCards() {
    return [
        { label: "Added Modules", value: "5", tone: "low", detail: "25% up" },
        { label: "Removed Modules", value: "2", tone: "high", detail: "14% down" },
        { label: "Changed Modules", value: "11", tone: "medium", detail: "31% up" },
        { label: "Added Dependencies", value: "23", tone: "low", detail: "18% up" },
        { label: "Removed Dependencies", value: "7", tone: "high", detail: "12% down" }
    ];
}
function liveImpactGraph() {
    return {
        width: 1120,
        height: 360,
        nodes: [
            graphNode("config-system", "Config System", "runtime_config.py", 20, 70, 160, 92, "high", true, ["config_loader.py", "env_loader.py"]),
            graphNode("operator-startup", "Operator Panel Startup", "launcher.py", 270, 70, 170, 92, "medium", true, ["startup.py"]),
            graphNode("launcher-env", "Launcher / Subprocess Env", "process_manager.py", 530, 70, 180, 92, "medium", false, ["env_manager.py"]),
            graphNode("ros-runtime", "ROS Launch / Runtime", "ros_launcher.py", 800, 70, 180, 92, "low", false, ["node_manager.py"]),
            graphNode("tests-config", "Tests / Config Scanner", "test_config_loader.py", 210, 220, 170, 92, "low", true, ["test_runtime_config.py"])
        ],
        edges: [
            { from: "config-system", to: "operator-startup" },
            { from: "operator-startup", to: "launcher-env" },
            { from: "launcher-env", to: "ros-runtime" },
            { from: "config-system", to: "tests-config", kind: "dashed" },
            { from: "operator-startup", to: "tests-config", kind: "dashed" },
            { from: "ros-runtime", to: "tests-config", kind: "dashed" }
        ]
    };
}
function dependencyGraph() {
    return {
        width: 700,
        height: 330,
        nodes: [
            circleNode("runtime_config", "abb_common.config.runtime_config", 120, 150, "high"),
            circleNode("config_loader", "abb_common.config.config_loader", 120, 260, "medium"),
            circleNode("env_loader", "abb_common.config.env_loader", 340, 260, "medium"),
            circleNode("launcher", "operator_panel.launcher", 340, 60, "medium"),
            circleNode("ros_launcher", "launch.ros_launcher", 570, 150, "low"),
            circleNode("test_runtime", "tests.config.test_runtime_config", 570, 260, "low")
        ],
        edges: [
            { from: "runtime_config", to: "launcher" },
            { from: "config_loader", to: "runtime_config" },
            { from: "env_loader", to: "runtime_config" },
            { from: "env_loader", to: "launcher" },
            { from: "launcher", to: "ros_launcher" },
            { from: "test_runtime", to: "runtime_config" },
            { from: "config_loader", to: "env_loader" },
            { from: "launcher", to: "env_loader" }
        ]
    };
}
function wholeArchitectureGraph() {
    return {
        width: 1120,
        height: 430,
        nodes: [
            graphNode("gui-layer", "GUI Layer", "Motion Tab", 20, 70, 125, 120, "medium", false, ["Zones Tab", "Gripper Tab", "Status Panel"]),
            graphNode("task-runner", "Task Runner", "Box Task Runner", 245, 70, 145, 120, "medium", false, ["Motion Sequence", "Job Manager"]),
            graphNode("motion-planning", "Motion Planning", "Box Motion Builder", 475, 70, 160, 120, "medium", false, ["MoveJ Builder", "MoveL Builder", "Path Generator"]),
            graphNode("safety-layer", "Safety Layer", "Zone Check", 715, 70, 155, 120, "high", false, ["Collision Check", "IK Validation", "Limit Check"]),
            graphNode("robot-io", "Robot I/O Layer", "RWS Client", 935, 70, 145, 120, "high", false, ["EGM Client", "RAPID Interface", "TCP Manager"]),
            graphNode("abb-controller", "ABB Controller", "RobotWare", 980, 250, 130, 100, "medium", false, ["RAPID", "Motion System"]),
            graphNode("config-system", "Config System", "Runtime Config", 245, 265, 165, 112, "low", false, ["Launch Config", "Environment Export"]),
            graphNode("utils-common", "Utils / Common", "Logging", 535, 265, 155, 112, "low", false, ["File Utils", "Math Utils", "M08 Utils"])
        ],
        edges: [
            { from: "gui-layer", to: "task-runner" },
            { from: "task-runner", to: "motion-planning" },
            { from: "motion-planning", to: "safety-layer" },
            { from: "safety-layer", to: "robot-io" },
            { from: "robot-io", to: "abb-controller" },
            { from: "config-system", to: "task-runner" },
            { from: "config-system", to: "motion-planning" },
            { from: "utils-common", to: "motion-planning", kind: "dashed" },
            { from: "utils-common", to: "safety-layer", kind: "dashed" },
            { from: "robot-io", to: "utils-common", kind: "dashed" }
        ]
    };
}
function featureInternalGraph() {
    return {
        width: 640,
        height: 330,
        nodes: [
            circleNode("box_motion_builder", "box_motion_builder", 350, 45, "medium"),
            circleNode("movel_builder", "movel_builder", 210, 105, "medium"),
            circleNode("movej_builder", "movej_builder", 100, 170, "medium"),
            circleNode("path_generator", "path_generator", 240, 230, "medium"),
            circleNode("pose_manager", "pose_manager", 470, 170, "medium"),
            circleNode("trajectory_utils", "trajectory_utils", 45, 250, "low"),
            circleNode("ik_solver", "ik_solver", 330, 285, "high"),
            circleNode("collision_checker", "collision_checker", 560, 250, "high")
        ],
        edges: [
            { from: "movej_builder", to: "box_motion_builder" },
            { from: "movel_builder", to: "box_motion_builder" },
            { from: "path_generator", to: "box_motion_builder" },
            { from: "box_motion_builder", to: "pose_manager" },
            { from: "pose_manager", to: "collision_checker" },
            { from: "pose_manager", to: "ik_solver" },
            { from: "trajectory_utils", to: "path_generator" },
            { from: "ik_solver", to: "collision_checker" }
        ]
    };
}
function baselineBeforeGraph() {
    return diffGraph(false);
}
function baselineAfterGraph() {
    return diffGraph(true);
}
function diffGraph(after) {
    const added = after ? "low" : "medium";
    return {
        width: 420,
        height: 260,
        nodes: [
            circleNode("a", "", 55, 55, "medium"),
            circleNode("b", "", 140, 40, added),
            circleNode("c", "", 235, 65, after ? "high" : "medium"),
            circleNode("d", "", 335, 70, "low"),
            circleNode("e", "", 80, 150, "medium"),
            circleNode("f", "", 185, 165, after ? "low" : "medium"),
            circleNode("g", "", 295, 165, after ? "low" : "medium"),
            circleNode("h", "", 360, 210, after ? "high" : "medium")
        ],
        edges: [
            { from: "a", to: "b" },
            { from: "b", to: "c", kind: after ? "added" : "solid" },
            { from: "c", to: "d" },
            { from: "a", to: "e" },
            { from: "e", to: "f", kind: after ? "added" : "solid" },
            { from: "f", to: "g" },
            { from: "c", to: "g", kind: after ? "removed" : "solid" },
            { from: "g", to: "h", kind: after ? "added" : "solid" }
        ]
    };
}
function graphNode(id, label, subtitle, x, y, width, height, riskLevel, changed = false, detailLines = []) {
    return {
        id,
        label,
        subtitle,
        detailLines,
        x,
        y,
        width,
        height,
        riskLevel,
        changed
    };
}
function circleNode(id, label, x, y, riskLevel) {
    return {
        id,
        label,
        x,
        y,
        width: 34,
        height: 34,
        riskLevel
    };
}
function topChanges() {
    return [
        { path: "src/abb_common/config/runtime_config.py", status: "Changed", dependencyDelta: "+5 deps" },
        { path: "src/operator_panel/launcher.py", status: "Changed", dependencyDelta: "+3 deps" },
        { path: "src/abb_motion/box_motion_builder.py", status: "Changed", dependencyDelta: "+4 deps" },
        { path: "src/abb_safety/collision_checker.py", status: "Changed", dependencyDelta: "+2 deps" },
        { path: "src/abb_robot/egm_client.py", status: "Changed", dependencyDelta: "+3 deps" }
    ];
}
function timeline() {
    return [
        { label: "05-15", modules: 72, dependencies: 141, tests: 66 },
        { label: "05-16", modules: 75, dependencies: 148, tests: 67 },
        { label: "05-17", modules: 77, dependencies: 152, tests: 68 },
        { label: "05-18", modules: 81, dependencies: 164, tests: 69 },
        { label: "05-19", modules: 79, dependencies: 159, tests: 68 },
        { label: "05-20", modules: 84, dependencies: 171, tests: 70 }
    ];
}
//# sourceMappingURL=mockDashboardState.js.map