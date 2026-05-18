"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardModes = void 0;
exports.isDashboardMode = isDashboardMode;
exports.getModeLabel = getModeLabel;
exports.dashboardModes = [
    "liveChanges",
    "wholeArchitecture",
    "featureFocus",
    "diffSinceBaseline"
];
function isDashboardMode(value) {
    return typeof value === "string" && exports.dashboardModes.includes(value);
}
function getModeLabel(mode) {
    switch (mode) {
        case "liveChanges":
            return "Live Changes";
        case "wholeArchitecture":
            return "Whole Architecture";
        case "featureFocus":
            return "Feature Focus";
        case "diffSinceBaseline":
            return "Diff Since Baseline";
    }
}
//# sourceMappingURL=dashboardState.js.map