// src/components/Dashboard.tsx
import { useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Pie, Doughnut, Scatter } from "react-chartjs-2";
import { FieldMapping } from "@/lib/storage";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface ChartConfig {
  id: string;
  dataKey: string;
  type: string;
  title: string;
  xAxisKey?: string;
  yAxisKey?: string;
  color?: string;
}

interface DashboardProps {
  data: any[];
  mapping?: FieldMapping;
}

interface ColumnInfo {
  name: string;
  type: "numeric" | "categorical";
  uniqueValues: number;
}

function analyzeData(data: any[]): { columns: ColumnInfo[]; numeric: string[]; categorical: string[] } {
  if (!data || data.length === 0) return { columns: [], numeric: [], categorical: [] };

  const keys = Object.keys(data[0]);
  const numeric: string[] = [];
  const categorical: string[] = [];
  const columns: ColumnInfo[] = [];

  keys.forEach(key => {
    const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined && v !== "");
    const uniqueValues = new Set(values).size;
    
    const isNumeric = values.every(v => {
      const num = parseFloat(String(v));
      return !isNaN(num) && isFinite(num);
    });

    const type = isNumeric && uniqueValues > 2 ? "numeric" : "categorical";
    
    columns.push({ name: key, type, uniqueValues });
    if (isNumeric && uniqueValues > 2) numeric.push(key);
    else categorical.push(key);
  });

  return { columns, numeric, categorical };
}

function aggregateData(
  data: any[], 
  groupBy: string, 
  valueKey: string, 
  aggregation: string = "SUM",
  limit: number = 10
) {
  const grouped: Record<string, { sum: number; count: number; max: number; min: number }> = {};
  let totalSum = 0;
  
  data.forEach(row => {
    const key = String(row[groupBy] ?? "Unknown");
    const val = parseFloat(row[valueKey]);
    const num = isNaN(val) ? 0 : val;

    if (!grouped[key]) {
      grouped[key] = { sum: 0, count: 0, max: num, min: num };
    }

    grouped[key].sum += num;
    grouped[key].count += 1;
    grouped[key].max = Math.max(grouped[key].max, num);
    grouped[key].min = Math.min(grouped[key].min, num);
    totalSum += num;
  });

  return Object.entries(grouped)
    .map(([label, stats]) => {
      let finalVal = stats.sum;
      if (aggregation === "AVG") finalVal = stats.count > 0 ? stats.sum / stats.count : 0;
      if (aggregation === "COUNT") finalVal = stats.count;
      if (aggregation === "MAX") finalVal = stats.max;
      if (aggregation === "MIN") finalVal = stats.min;
      if (aggregation === "PERCENT" || aggregation === "%") {
        finalVal = totalSum > 0 ? (stats.sum / totalSum) * 100 : 0;
      }

      return { label, value: Number(finalVal.toFixed(2)) };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
}

// Calculate Pearson Correlation Coefficient (-1 to +1)
function calculateCorrelation(data: any[], xKey: string, yKey: string) {
  const pairs = data
    .map(d => ({ x: parseFloat(d[xKey]), y: parseFloat(d[yKey]) }))
    .filter(p => !isNaN(p.x) && !isNaN(p.y));

  if (pairs.length === 0) return { score: 0, text: "No data" };

  const n = pairs.length;
  const sumX = pairs.reduce((acc, p) => acc + p.x, 0);
  const sumY = pairs.reduce((acc, p) => acc + p.y, 0);
  const sumX2 = pairs.reduce((acc, p) => acc + p.x * p.x, 0);
  const sumY2 = pairs.reduce((acc, p) => acc + p.y * p.y, 0);
  const sumXY = pairs.reduce((acc, p) => acc + p.x * p.y, 0);

  const num = n * sumXY - sumX * sumY;
  const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (den === 0) return { score: 0, text: "No Correlation" };

  const r = Number((num / den).toFixed(2));
  let text = "Weak / No Correlation";
  if (r > 0.7) text = "Strong Positive Relationship";
  else if (r > 0.3) text = "Moderate Positive Relationship";
  else if (r < -0.7) text = "Strong Negative Relationship";
  else if (r < -0.3) text = "Moderate Negative Relationship";

  return { score: r, text };
}

const COLORS = [
  "rgba(59, 130, 246, 0.8)",
  "rgba(16, 185, 129, 0.8)",
  "rgba(245, 158, 11, 0.8)",
  "rgba(239, 68, 68, 0.8)",
  "rgba(139, 92, 246, 0.8)",
  "rgba(236, 72, 153, 0.8)",
  "rgba(6, 182, 212, 0.8)",
  "rgba(132, 204, 22, 0.8)",
];

export function Dashboard({ data, mapping }: DashboardProps) {
  const [chartType, setChartType] = useState<string>("all");
  
  const { numeric, categorical } = useMemo(() => analyzeData(data), [data]);

  const charts = useMemo(() => {
    if (!data.length) return [];

    const numCol = mapping?.primaryMeasure || mapping?.measures?.[0] || numeric[0];
    const catCol = mapping?.primaryDimension || mapping?.dimensions?.[0] || categorical[0];
    const agg = mapping?.aggregation || "SUM";
    const numCol2 = mapping?.measures?.find(m => m !== numCol) || numeric[1];

    if (!numCol) return [];

    const result = [];
    const isPercent = agg === "PERCENT" || agg === "%";

    // 1. Pie Chart
    if (catCol && catCol !== numCol) {
      const pieData = aggregateData(data, catCol, numCol, agg, 8);
      if (pieData.length > 0) {
        result.push({
          id: "pie",
          title: `Pie: ${numCol} (${agg}${isPercent ? " %" : ""}) by ${catCol}`,
          chart: (
            <Pie
              data={{
                labels: pieData.map(d => d.label),
                datasets: [{
                  data: pieData.map(d => d.value),
                  backgroundColor: COLORS,
                  borderColor: "#18181b",
                  borderWidth: 2,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "right", labels: { color: "#a1a1aa" } } }
              }}
            />
          )
        });
      }
    }

    // 2. Bar Chart
    if (catCol) {
      const barData = aggregateData(data, catCol, numCol, agg, 12);
      if (barData.length > 0) {
        result.push({
          id: "bar",
          title: `Bar: ${numCol} (${agg}${isPercent ? " %" : ""}) by ${catCol}`,
          chart: (
            <Bar
              data={{
                labels: barData.map(d => d.label),
                datasets: [{
                  label: `${numCol} (${agg})`,
                  data: barData.map(d => d.value),
                  backgroundColor: "rgba(59, 130, 246, 0.8)",
                  borderColor: "rgba(59, 130, 246, 1)",
                  borderWidth: 1,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "x",
                plugins: { legend: { display: false } },
                scales: {
                  x: { grid: { color: "#3f3f46" }, ticks: { color: "#a1a1aa" } },
                  y: { 
                    grid: { color: "#3f3f46" }, 
                    ticks: { 
                      color: "#a1a1aa",
                      callback: (v) => isPercent ? `${v}%` : v
                    } 
                  }
                }
              }}
            />
          )
        });
      }
    }

    // 3. Line Chart
    const lineData = data.slice(0, 50);
    result.push({
      id: "line",
      title: `Line: ${numCol} Trend`,
      chart: (
        <Line
          data={{
            labels: catCol 
            ? lineData.map(d => String(d[catCol] ?? "")) 
            : lineData.map((_, i) => String(i + 1)),
            datasets: [{
              label: numCol,
              data: lineData.map(d => parseFloat(d[numCol]) || 0),
              borderColor: "rgba(16, 185, 129, 1)",
              backgroundColor: "rgba(16, 185, 129, 0.1)",
              fill: true,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: "rgba(16, 185, 129, 1)",
            }]
          }}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              x: { grid: { color: "#3f3f46" }, ticks: { color: "#a1a1aa" } },
              y: { grid: { color: "#3f3f46" }, ticks: { color: "#a1a1aa" } }
            }
          }}
        />
      )
    });

    // 4. Doughnut Chart
    if (catCol) {
      const doughnutData = aggregateData(data, catCol, numCol, agg, 6);
      if (doughnutData.length > 0) {
        result.push({
          id: "doughnut",
          title: `Doughnut: ${numCol} (${agg}${isPercent ? " %" : ""}) by ${catCol}`,
          chart: (
            <Doughnut
              data={{
                labels: doughnutData.map(d => d.label),
                datasets: [{
                  data: doughnutData.map(d => d.value),
                  backgroundColor: COLORS,
                  borderColor: "#18181b",
                  borderWidth: 2,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "right", labels: { color: "#a1a1aa" } } }
              }}
            />
          )
        });
      }
    }

    // 5. Scatter Correlation Plot with Insights Banner
    if (numCol2) {
      const correlation = calculateCorrelation(data, numCol, numCol2);
      result.push({
        id: "scatter",
        title: `Correlation Analysis: ${numCol} vs ${numCol2}`,
        chart: (
          <div className="flex flex-col h-full space-y-2">
            <div className="bg-zinc-950 p-2 rounded-lg border border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400">Correlation Coefficient (r): <strong className="text-emerald-400">{correlation.score}</strong></span>
              <span className="text-zinc-300 font-medium px-2 py-0.5 rounded bg-zinc-800">{correlation.text}</span>
            </div>
            <div className="flex-1 min-h-0">
              <Scatter
                data={{
                  datasets: [{
                    label: `${numCol} vs ${numCol2}`,
                    data: data.slice(0, 100).map(d => ({
                      x: parseFloat(d[numCol]) || 0,
                      y: parseFloat(d[numCol2]) || 0
                    })),
                    backgroundColor: "rgba(236, 72, 153, 0.8)",
                    pointRadius: 5,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { 
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${numCol}: ${ctx.parsed.x}, ${numCol2}: ${ctx.parsed.y}`
                      }
                    }
                  },
                  scales: {
                    x: { grid: { color: "#3f3f46" }, ticks: { color: "#a1a1aa" }, title: { display: true, text: numCol, color: "#a1a1aa" } },
                    y: { grid: { color: "#3f3f46" }, ticks: { color: "#a1a1aa" }, title: { display: true, text: numCol2, color: "#a1a1aa" } }
                  }
                }}
              />
            </div>
          </div>
        )
      });
    }

    return result;
  }, [data, numeric, categorical, mapping]);

  const filteredCharts = chartType === "all" 
    ? charts 
    : charts.filter(c => c.id === chartType);

  if (!data.length || (numeric.length === 0 && !mapping?.measures?.length && !mapping?.primaryMeasure)) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 p-8 text-center">
        <div>
          <p className="mb-2">Upload a dataset with numeric columns to view charts</p>
          <p className="text-sm text-zinc-600">Charts: Pie, Bar, Line, Doughnut, Scatter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {/* Chart Type Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setChartType("all")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            chartType === "all" ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
          }`}
        >
          All Charts
        </button>
        {charts.map(chart => (
          <button
            key={chart.id}
            onClick={() => setChartType(chart.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              chartType === chart.id ? "bg-emerald-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
            }`}
          >
            {chart.id.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCharts.map(chart => (
          <div key={chart.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">{chart.title}</h3>
            <div className="h-64">
              {chart.chart}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}