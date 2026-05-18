"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskRank = riskRank;
function riskRank(level) {
    switch (level) {
        case "high":
            return 3;
        case "medium":
            return 2;
        case "low":
            return 1;
    }
}
//# sourceMappingURL=riskScorer.js.map