"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockDashboardState = createMockDashboardState;
exports.createMockSnapshot = createMockSnapshot;
exports.getFeatureById = getFeatureById;
const capturedAtIso = "2024-05-20T14:32:18+08:00";
const featureBlocks = [
    {
        id: "config-system",
        label: "Config System",
        description: "Runtime configuration loading and environment export.",
        pathPatterns: ["src/abb_common/config/**"],
        moduleIds: ["runtime-config", "config-loader", "env-loader", "config-utils"],
        incomingEdges: 4,
        outgoingEdges: 6,
        changedFileCount: 2,
        riskLevel: "high"
    },
    {
        id: "operator-panel-startup",
        label: "Operator Panel Startup",
        description: "Panel launcher, startup flow, and process bootstrap.",
        pathPatterns: ["src/operator_panel/**"],
        moduleIds: ["operator-launcher", "operator-startup"],
        incomingEdges: 2,
        outgoingEdges: 4,
        changedFileCount: 1,
        riskLevel: "medium"
    },
    {
        id: "tests-config-scanner",
        label: "Tests / Config Scanner",
        description: "Changed configuration scanner and runtime config tests.",
        pathPatterns: ["tests/config/**"],
        moduleIds: ["test-runtime-config", "test-config-loader"],
        incomingEdges: 3,
        outgoingEdges: 1,
        changedFileCount: 1,
        riskLevel: "low"
    },
    {
        id: "launcher-subprocess-env",
        label: "Launcher / Subprocess Env",
        description: "Process manager and child environment handling.",
        pathPatterns: ["src/launch/**"],
        moduleIds: ["process-manager", "env-manager"],
        incomingEdges: 3,
        outgoingEdges: 5,
        changedFileCount: 0,
        riskLevel: "medium"
    },
    {
        id: "ros-launch-runtime",
        label: "ROS Launch / Runtime",
        description: "ROS launcher, node manager, and runtime execution.",
        pathPatterns: ["launch/**", "src/ros_runtime/**"],
        moduleIds: ["ros-launcher", "node-manager"],
        incomingEdges: 5,
        outgoingEdges: 2,
        changedFileCount: 0,
        riskLevel: "low"
    },
    {
        id: "motion-planning",
        label: "Motion Planning",
        description: "Motion builders, path generation, and trajectory utilities.",
        pathPatterns: ["src/abb_motion/**"],
        moduleIds: ["box-motion-builder", "movej-builder", "movel-builder", "path-generator", "pose-manager", "trajectory-utils", "ik-solver", "collision-checker"],
        incomingEdges: 7,
        outgoingEdges: 10,
        changedFileCount: 0,
        riskLevel: "medium"
    },
    {
        id: "gui-layer",
        label: "GUI Layer",
        description: "Main GUI, zone tabs, gripper tabs, and settings panels.",
        pathPatterns: ["src/gui/**"],
        moduleIds: ["main-gui", "motion-tab", "zones-tab", "settings-panel"],
        incomingEdges: 1,
        outgoingEdges: 8,
        changedFileCount: 0,
        riskLevel: "low"
    },
    {
        id: "task-runner",
        label: "Task Runner",
        description: "Box task runner, motion sequence orchestration, and job manager.",
        pathPatterns: ["src/task_runner/**"],
        moduleIds: ["box-task-runner", "motion-sequence", "job-manager"],
        incomingEdges: 3,
        outgoingEdges: 7,
        changedFileCount: 0,
        riskLevel: "medium"
    },
    {
        id: "safety-layer",
        label: "Safety Layer",
        description: "Zone checks, collision validation, IK limits, and hard stops.",
        pathPatterns: ["src/safety/**"],
        moduleIds: ["zone-check", "collision-checker", "ik-validation", "limit-check"],
        incomingEdges: 4,
        outgoingEdges: 3,
        changedFileCount: 0,
        riskLevel: "low"
    },
    {
        id: "robot-io-layer",
        label: "Robot I/O Layer",
        description: "RWS client, EGM client, RAPID interface, and TCP manager.",
        pathPatterns: ["src/abb_robot/**"],
        moduleIds: ["rws-client", "egm-client", "rapid-interface", "tcp-manager"],
        incomingEdges: 6,
        outgoingEdges: 2,
        changedFileCount: 0,
        riskLevel: "medium"
    },
    {
        id: "utils-common",
        label: "Utils / Common",
        description: "Shared logging, file utilities, math helpers, and message buses.",
        pathPatterns: ["src/abb_common/**"],
        moduleIds: ["logging-utils", "file-utils", "math-utils", "message-bus"],
        incomingEdges: 9,
        outgoingEdges: 1,
        changedFileCount: 0,
        riskLevel: "low"
    },
    {
        id: "abb-controller",
        label: "ABB Controller",
        description: "RobotWare, RAPID programs, and motion system integration.",
        pathPatterns: ["src/abb_controller/**"],
        moduleIds: ["robotware", "rapid-programs", "motion-system"],
        incomingEdges: 2,
        outgoingEdges: 1,
        changedFileCount: 0,
        riskLevel: "medium"
    }
];
const modules = [
    module("runtime-config", "runtime_config", "src/abb_common/config/runtime_config.py", "config-system", ["config-loader", "env-loader"], ["operator-launcher", "test-runtime-config"], false, false, false, "high"),
    module("config-loader", "config_loader", "src/abb_common/config/config_loader.py", "config-system", ["env-loader"], ["runtime-config", "test-config-loader"], false, false, false, "medium"),
    module("env-loader", "env_loader", "src/abb_common/config/env_loader.py", "config-system", [], ["runtime-config", "config-loader"], false, false, false, "medium"),
    module("config-utils", "config_utils", "src/abb_common/config/config_utils.py", "config-system", ["file-utils"], ["runtime-config"], false, false, false, "low"),
    module("operator-launcher", "launcher", "src/operator_panel/launcher.py", "operator-panel-startup", ["runtime-config", "process-manager"], ["operator-startup"], true, false, false, "medium"),
    module("operator-startup", "startup", "src/operator_panel/startup.py", "operator-panel-startup", ["operator-launcher"], ["main-gui"], true, false, false, "medium"),
    module("test-runtime-config", "test_runtime_config", "tests/config/test_runtime_config.py", "tests-config-scanner", ["runtime-config"], [], false, true, false, "low"),
    module("test-config-loader", "test_config_loader", "tests/config/test_config_loader.py", "tests-config-scanner", ["config-loader"], [], false, true, false, "low"),
    module("process-manager", "process_manager", "src/launch/process_manager.py", "launcher-subprocess-env", ["env-loader"], ["ros-launcher"], false, false, false, "medium"),
    module("env-manager", "env_manager", "src/launch/env_manager.py", "launcher-subprocess-env", ["env-loader"], ["process-manager"], false, false, false, "medium"),
    module("ros-launcher", "ros_launcher", "launch/ros_launcher.py", "ros-launch-runtime", ["process-manager", "node-manager"], [], true, false, false, "low"),
    module("node-manager", "node_manager", "src/ros_runtime/node_manager.py", "ros-launch-runtime", ["runtime-config"], ["ros-launcher"], false, false, false, "low"),
    module("box-motion-builder", "box_motion_builder", "src/abb_motion/box_motion_builder.py", "motion-planning", ["movej-builder", "movel-builder", "path-generator"], ["box-task-runner"], false, false, false, "medium"),
    module("movej-builder", "movej_builder", "src/abb_motion/movej_builder.py", "motion-planning", ["trajectory-utils", "ik-solver"], ["box-motion-builder"], false, false, false, "medium"),
    module("movel-builder", "movel_builder", "src/abb_motion/movel_builder.py", "motion-planning", ["trajectory-utils"], ["box-motion-builder"], false, false, false, "low"),
    module("path-generator", "path_generator", "src/abb_motion/path_generator.py", "motion-planning", ["pose-manager"], ["box-motion-builder"], false, false, false, "low"),
    module("pose-manager", "pose_manager", "src/abb_motion/pose_manager.py", "motion-planning", ["math-utils"], ["path-generator"], false, false, false, "low"),
    module("trajectory-utils", "trajectory_utils", "src/abb_motion/trajectory_utils.py", "motion-planning", ["math-utils"], ["movej-builder", "movel-builder"], false, false, false, "low"),
    module("ik-solver", "ik_solver", "src/abb_motion/ik_solver.py", "motion-planning", ["math-utils"], ["movej-builder"], false, false, false, "medium"),
    module("collision-checker", "collision_checker", "src/safety/collision_checker.py", "safety-layer", ["zone-check"], ["box-motion-builder"], false, false, false, "low"),
    module("main-gui", "main_gui", "src/gui/main_gui.py", "gui-layer", ["motion-tab", "zones-tab", "settings-panel"], [], true, false, false, "low"),
    module("motion-tab", "motion_tab", "src/gui/motion_tab.py", "gui-layer", ["box-motion-builder"], ["main-gui"], false, false, false, "low"),
    module("zones-tab", "zones_tab", "src/gui/zones_tab.py", "gui-layer", ["zone-check"], ["main-gui"], false, false, false, "low"),
    module("settings-panel", "settings", "src/gui/settings.py", "gui-layer", ["runtime-config"], ["main-gui"], false, false, false, "low"),
    module("box-task-runner", "box_task_runner", "src/task_runner/box_task_runner.py", "task-runner", ["box-motion-builder", "rws-client"], [], true, false, false, "medium"),
    module("motion-sequence", "motion_sequence", "src/task_runner/motion_sequence.py", "task-runner", ["box-motion-builder"], ["box-task-runner"], false, false, false, "medium"),
    module("job-manager", "job_manager", "src/task_runner/job_manager.py", "task-runner", ["motion-sequence"], ["box-task-runner"], false, false, false, "low"),
    module("zone-check", "zone_check", "src/safety/zone_check.py", "safety-layer", [], ["collision-checker", "zones-tab"], false, false, false, "low"),
    module("ik-validation", "ik_validation", "src/safety/ik_validation.py", "safety-layer", ["ik-solver"], ["limit-check"], false, false, false, "low"),
    module("limit-check", "limit_check", "src/safety/limit_check.py", "safety-layer", [], ["ik-validation"], false, false, false, "low"),
    module("rws-client", "rws_client", "src/abb_robot/rws_client.py", "robot-io-layer", ["runtime-config"], ["box-task-runner"], false, false, false, "medium"),
    module("egm-client", "egm_client", "src/abb_robot/egm_client.py", "robot-io-layer", ["runtime-config"], [], false, false, false, "medium"),
    module("rapid-interface", "rapid_interface", "src/abb_robot/rapid_interface.py", "robot-io-layer", ["rws-client"], [], false, false, false, "medium"),
    module("tcp-manager", "tcp_manager", "src/abb_robot/tcp_manager.py", "robot-io-layer", ["egm-client"], [], false, false, false, "low"),
    module("logging-utils", "logging", "src/abb_common/logging.py", "utils-common", [], ["main-gui"], false, false, false, "low"),
    module("file-utils", "file_utils", "src/abb_common/file_utils.py", "utils-common", [], ["config-utils"], false, false, false, "low"),
    module("math-utils", "math_utils", "src/abb_common/math_utils.py", "utils-common", [], ["pose-manager", "trajectory-utils"], false, false, false, "low"),
    module("message-bus", "message_bus", "src/abb_common/message_bus.py", "utils-common", [], ["main-gui"], false, false, false, "low"),
    module("robotware", "robotware", "src/abb_controller/robotware.py", "abb-controller", ["rapid-programs"], [], false, false, false, "medium"),
    module("rapid-programs", "rapid_programs", "src/abb_controller/rapid_programs.py", "abb-controller", ["motion-system"], ["robotware"], false, false, false, "medium"),
    module("motion-system", "motion_system", "src/abb_controller/motion_system.py", "abb-controller", ["rws-client"], ["rapid-programs"], false, false, false, "medium")
];
const dependencies = [
    edge("runtime-config", "config-loader"),
    edge("runtime-config", "env-loader"),
    edge("config-loader", "env-loader"),
    edge("config-utils", "file-utils"),
    edge("operator-launcher", "runtime-config"),
    edge("operator-launcher", "process-manager"),
    edge("operator-startup", "operator-launcher", "entrypoint"),
    edge("test-runtime-config", "runtime-config", "test"),
    edge("test-config-loader", "config-loader", "test"),
    edge("process-manager", "env-loader"),
    edge("env-manager", "env-loader"),
    edge("ros-launcher", "process-manager", "entrypoint"),
    edge("ros-launcher", "node-manager", "entrypoint"),
    edge("node-manager", "runtime-config"),
    edge("box-motion-builder", "movej-builder"),
    edge("box-motion-builder", "movel-builder"),
    edge("box-motion-builder", "path-generator"),
    edge("movej-builder", "trajectory-utils"),
    edge("movej-builder", "ik-solver"),
    edge("movel-builder", "trajectory-utils"),
    edge("path-generator", "pose-manager"),
    edge("pose-manager", "math-utils"),
    edge("collision-checker", "zone-check"),
    edge("main-gui", "motion-tab", "entrypoint"),
    edge("main-gui", "zones-tab", "entrypoint"),
    edge("main-gui", "settings-panel", "entrypoint"),
    edge("motion-tab", "box-motion-builder"),
    edge("zones-tab", "zone-check"),
    edge("settings-panel", "runtime-config"),
    edge("box-task-runner", "box-motion-builder"),
    edge("box-task-runner", "rws-client"),
    edge("motion-sequence", "box-motion-builder"),
    edge("job-manager", "motion-sequence"),
    edge("ik-validation", "ik-solver"),
    edge("rapid-interface", "rws-client"),
    edge("tcp-manager", "egm-client"),
    edge("robotware", "rapid-programs"),
    edge("rapid-programs", "motion-system"),
    edge("motion-system", "rws-client")
];
const changedFiles = [
    {
        path: "src/abb_common/config/runtime_config.py",
        status: "modified",
        featureId: "config-system",
        moduleId: "runtime-config",
        riskLevel: "high",
        reason: "Runtime config is imported by launcher and tests.",
        lastChangedIso: "2024-05-20T14:31:22+08:00"
    },
    {
        path: "src/operator_panel/launcher.py",
        status: "modified",
        featureId: "operator-panel-startup",
        moduleId: "operator-launcher",
        riskLevel: "medium",
        reason: "Startup path affects operator panel launch.",
        lastChangedIso: "2024-05-20T14:30:11+08:00"
    },
    {
        path: "src/abb_common/config/env_loader.py",
        status: "modified",
        featureId: "config-system",
        moduleId: "env-loader",
        riskLevel: "medium",
        reason: "Environment loader feeds subprocess launch.",
        lastChangedIso: "2024-05-20T14:29:48+08:00"
    },
    {
        path: "tests/config/test_runtime_config.py",
        status: "modified",
        featureId: "tests-config-scanner",
        moduleId: "test-runtime-config",
        riskLevel: "low",
        reason: "Changed targeted runtime config test.",
        lastChangedIso: "2024-05-20T14:28:15+08:00"
    }
];
const validations = [
    {
        id: "syntax",
        label: "Python Syntax Check",
        state: "passed",
        detail: "Changed Python files parse cleanly.",
        durationMs: 2100
    },
    {
        id: "compile",
        label: "Compile Check",
        state: "passed",
        detail: "Extension and mock analysis compile.",
        durationMs: 3400
    },
    {
        id: "changed-tests",
        label: "Unit Tests (Changed)",
        state: "passed",
        detail: "18 changed-area tests passed.",
        durationMs: 12300
    },
    {
        id: "full-tests",
        label: "Full Test Suite",
        state: "running",
        detail: "125 of 342 tests completed.",
        durationMs: 0
    },
    {
        id: "config-scanner",
        label: "Config Scanner",
        state: "passed",
        detail: "Config keys and env exports are consistent.",
        durationMs: 1800
    },
    {
        id: "style-checks",
        label: "Code Style (ruff)",
        state: "passed",
        detail: "No style regressions in changed files.",
        durationMs: 2700
    }
];
const baselineDiff = {
    baselineCapturedAtIso: "2024-05-15T09:00:00+08:00",
    currentCapturedAtIso: capturedAtIso,
    addedModules: modules.slice(0, 5),
    removedModules: modules.slice(36, 38),
    changedModules: modules.slice(0, 11),
    addedEdges: dependencies.slice(0, 23),
    removedEdges: dependencies.slice(23, 30),
    changedFeatures: featureBlocks.slice(0, 4),
    riskChanges: [
        {
            id: "config-risk-up",
            label: "Config System risk increased",
            level: "high",
            count: 1,
            detail: "Runtime config now feeds both launcher and ROS startup."
        },
        {
            id: "startup-risk",
            label: "Startup surface changed",
            level: "medium",
            count: 1,
            detail: "Operator panel launcher gained a subprocess environment path."
        }
    ]
};
function createMockDashboardState(mode = "liveChanges", selectedFeatureId = "motion-planning") {
    const snapshot = createMockSnapshot();
    const safeSelectedFeatureId = snapshot.featureBlocks.some((feature) => feature.id === selectedFeatureId)
        ? selectedFeatureId
        : "motion-planning";
    return {
        mode,
        workspace: {
            name: "ABB_ROS2",
            rootUri: "C:/Users/Junekim/Work/ABB_ROS2",
            isDirty: true,
            lastUpdatedIso: capturedAtIso,
            autoRefresh: true
        },
        snapshot,
        selectedFeatureId: safeSelectedFeatureId,
        baselineDiff,
        isMockData: true,
        isLoading: false
    };
}
function createMockSnapshot() {
    return {
        workspaceKey: "mock:ABB_ROS2",
        workspaceName: "ABB_ROS2",
        rootUri: "C:/Users/Junekim/Work/ABB_ROS2",
        capturedAtIso,
        git: {
            branch: "main",
            changedFileCount: changedFiles.length,
            ahead: 0,
            behind: 0
        },
        modules,
        dependencies,
        featureBlocks,
        changedFiles,
        impactedFeatures: [
            {
                featureId: "config-system",
                label: "Config System",
                moduleCount: 4,
                changedFileCount: 2,
                riskLevel: "high",
                reason: "Changed runtime config feeds startup and tests."
            },
            {
                featureId: "operator-panel-startup",
                label: "Operator Panel Startup",
                moduleCount: 2,
                changedFileCount: 1,
                riskLevel: "medium",
                reason: "Launcher imports changed config modules."
            },
            {
                featureId: "tests-config-scanner",
                label: "Tests / Config Scanner",
                moduleCount: 2,
                changedFileCount: 1,
                riskLevel: "low",
                reason: "Targeted tests are directly related."
            },
            {
                featureId: "launcher-subprocess-env",
                label: "Launcher / Subprocess Env",
                moduleCount: 2,
                changedFileCount: 0,
                riskLevel: "medium",
                reason: "Environment loader affects subprocess setup."
            },
            {
                featureId: "ros-launch-runtime",
                label: "ROS Launch / Runtime",
                moduleCount: 2,
                changedFileCount: 0,
                riskLevel: "low",
                reason: "Runtime launch consumes process manager state."
            }
        ],
        risks: [
            {
                id: "high",
                label: "High",
                level: "high",
                count: 1,
                detail: "Runtime config changes affect launcher startup."
            },
            {
                id: "medium",
                label: "Medium",
                level: "medium",
                count: 1,
                detail: "Subprocess environment behavior may shift."
            },
            {
                id: "low",
                label: "Low",
                level: "low",
                count: 1,
                detail: "Targeted tests cover direct config paths."
            }
        ],
        health: {
            totalPythonFiles: 73,
            totalModules: 38,
            totalClasses: 146,
            totalFunctions: 312,
            circularDependencyCount: 0,
            highRiskModuleCount: 3,
            orphanModuleCount: 2,
            estimatedTestCoverage: 68
        },
        validations
    };
}
function getFeatureById(featureId) {
    return featureBlocks.find((feature) => feature.id === featureId);
}
function module(id, name, path, featureId, imports, importedBy, isEntryPoint, isTest, isOrphan, riskLevel) {
    return {
        id,
        name,
        path,
        language: "python",
        packageName: path.split("/").slice(1, -1).join("."),
        featureId,
        imports,
        importedBy,
        isEntryPoint,
        isTest,
        isOrphan,
        riskLevel
    };
}
function edge(from, to, kind = "import", confidence = "high") {
    return {
        from,
        to,
        kind,
        confidence
    };
}
//# sourceMappingURL=mockDashboardState.js.map