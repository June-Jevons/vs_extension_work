"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboardModes = void 0;
exports.isDashboardMode = isDashboardMode;
exports.dashboardModes = [
    "liveChanges",
    "wholeArchitecture",
    "featureFocus",
    "diffSinceBaseline"
];
function isDashboardMode(value) {
    return typeof value === "string" && exports.dashboardModes.includes(value);
}
//# sourceMappingURL=dashboardState.js.map