"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisEngine = void 0;
const mockDashboardState_1 = require("../mockData/mockDashboardState");
class AnalysisEngine {
    getMockState(mode, selectedFeatureId) {
        return (0, mockDashboardState_1.createMockDashboardState)(mode, selectedFeatureId);
    }
}
exports.AnalysisEngine = AnalysisEngine;
//# sourceMappingURL=analysisEngine.js.map