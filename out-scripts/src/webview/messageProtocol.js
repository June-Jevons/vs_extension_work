"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isWebviewToExtensionMessage = isWebviewToExtensionMessage;
const dashboardState_1 = require("./dashboardState");
function isWebviewToExtensionMessage(value) {
    if (!isRecord(value) || typeof value.type !== "string") {
        return false;
    }
    switch (value.type) {
        case "ready":
        case "captureBaseline":
        case "refresh":
        case "showDiffSinceBaseline":
        case "exportSnapshot":
            return true;
        case "setMode":
            return (0, dashboardState_1.isDashboardMode)(value.mode);
        case "selectFeature":
            return typeof value.featureId === "string" && value.featureId.length > 0 && value.featureId.length < 120;
        default:
            return false;
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
//# sourceMappingURL=messageProtocol.js.map