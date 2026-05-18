import { DashboardMode, DashboardState } from "../webview/dashboardState";
import { createMockDashboardState } from "../mockData/mockDashboardState";

export class AnalysisEngine {
  public getMockState(mode: DashboardMode, selectedFeatureId?: string): DashboardState {
    return createMockDashboardState(mode, selectedFeatureId);
  }
}
