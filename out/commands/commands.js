"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeOpenDashboardArg = normalizeOpenDashboardArg;
function normalizeOpenDashboardArg(value) {
    if (typeof value === "string") {
        return { mode: value };
    }
    if (value && typeof value === "object" && "mode" in value) {
        return value;
    }
    return {};
}
//# sourceMappingURL=commands.js.map