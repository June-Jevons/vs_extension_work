"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("assert"));
const mockDashboardState_1 = require("../../src/mockData/mockDashboardState");
const dashboardState_1 = require("../../src/webview/dashboardState");
for (const mode of dashboardState_1.dashboardModes) {
    const state = (0, mockDashboardState_1.createMockDashboardState)(mode);
    assert.strictEqual(state.mode, mode);
    assert.strictEqual(state.isMockData, true);
    assert.ok(state.ui.changedFiles.length >= 6);
    assert.ok(state.ui.featureBlocks.length >= 8);
    assert.ok(state.ui.liveImpactGraph.nodes.length >= 5);
}
const featureState = (0, mockDashboardState_1.createMockDashboardState)("featureFocus", "motion-planning");
assert.strictEqual(featureState.selectedFeatureId, "motion-planning");
assert.ok(featureState.ui.featureDetail.relatedTests.length >= 4);
const diffState = (0, mockDashboardState_1.createMockDashboardState)("diffSinceBaseline");
assert.ok(diffState.baselineDiff);
assert.strictEqual(diffState.ui.diffSummaryCards.length, 5);
console.log("Mock dashboard state tests passed.");
//# sourceMappingURL=extension.test.js.map