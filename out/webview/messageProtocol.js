"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWebviewToExtensionMessage = isWebviewToExtensionMessage;
const dashboardState_1 = require("./dashboardState");
function isWebviewToExtensionMessage(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const candidate = value;
    switch (candidate.type) {
        case "ready":
        case "captureBaseline":
        case "refresh":
        case "showDiffSinceBaseline":
        case "exportSnapshot":
            return true;
        case "setMode":
            return (0, dashboardState_1.isDashboardMode)(candidate.mode);
        case "selectFeature":
            return typeof candidate.featureId === "string" && candidate.featureId.length > 0;
        default:
            return false;
    }
}
//# sourceMappingURL=messageProtocol.js.map