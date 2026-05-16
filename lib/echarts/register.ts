/**
 * ECharts modular bundle — chỉ đăng ký chart/component dùng trong dashboard.
 * theo pattern chuẩn của thư viện Apache ECharts.
 */
import * as echarts from "echarts/core"; // Core của đồ thị
import { BarChart, LineChart, PieChart } from "echarts/charts"; // Các loại đồ thị
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent
} from "echarts/components"; // Các component của đồ thị
import { LabelLayout, UniversalTransition } from "echarts/features";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  GraphicComponent,
  CanvasRenderer,
  LabelLayout,
  UniversalTransition
]);

export { echarts };
