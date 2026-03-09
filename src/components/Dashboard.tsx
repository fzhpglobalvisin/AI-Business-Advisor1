import { useMemo, useState, useRef, useEffect } from "react";
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

interface DashboardProps {
  data: any[];
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

function aggregateData(data: any[], groupBy: string, valueKey: string, limit: number = 10) {
  const grouped: Record<string, number> = {};
  data.forEach(row => {
    const key = String(row[groupBy] || "Unknown");
    const value = parseFloat(row[valueKey]) || 0;
    grouped[key] = (grouped[key] || 0) + value;
  });
  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function createHistogramData(data: any[], column: string) {
  const values = data.map(row => parseFloat(row[column])).filter(v => !isNaN(v));
  if (values.length === 0) return { labels: [], data: [] };
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
  const binSize = (max - min) / binCount || 1;
  
  const bins = Array(binCount).fill(0).map((_, i) => ({
    label: `${(min + i * binSize).toFixed(1)}`,
    value: 0
  }));
  
  values.forEach(v => {
    const binIndex = Math.min(Math.floor((v - min) / binSize), binCount - 1);
    bins[binIndex].value++;
  });
  
  return { labels: bins.map(b => b.label), data: bins.map(b => b.value) };
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

export function Dashboard({ data }: DashboardProps) {
  const [chartType, setChartType] = useState<string>("all");
  
  const { columns, numeric, categorical } = useMemo(() => analyzeData(data), [data]);

  const charts = useMemo(() => {
    if (!data.length || numeric.length === 0) return [];

    const result = [];
    const numCol = numeric[0];
    const catCol = categorical[0] || "index";
    const numCol2 = numeric[1];

    // 1. Histogram (Bar chart with binned data)
    const histData = createHistogramData(data, numCol);
    if (histData.labels.length > 0) {
      result.push({
        id: "histogram",
        title: `Histogram: ${numCol}`,
        chart: (
          <Bar
            data={{
              labels: histData.labels,
              datasets: [{
                label: "Count",
                data: histData.data,
                backgroundColor: "rgba(139, 92, 246, 0.8)",
                borderColor: "rgba(139, 92, 246, 1)",
                borderWidth: 1,
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
    }

    // 2. Pie Chart
    if (catCol && catCol !== numCol) {
      const pieData = aggregateData(data, catCol, numCol, 8);
      if (pieData.length > 0) {
        result.push({
          id: "pie",
          title: `Pie: ${numCol} by ${catCol}`,
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

    // 3. Bar Chart
    if (catCol) {
      const barData = aggregateData(data, catCol, numCol, 12);
      if (barData.length > 0) {
        result.push({
          id: "bar",
          title: `Bar: ${numCol} by ${catCol}`,
          chart: (
            <Bar
              data={{
                labels: barData.map(d => d.label),
                datasets: [{
                  label: numCol,
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
                  y: { grid: { color: "#3f3f46" }, ticks: { color: "#a1a1aa" } }
                }
              }}
            />
          )
        });
      }
    }

    // 4. Line Chart
    const lineData = data.slice(0, 50);
    result.push({
      id: "line",
      title: `Line: ${numCol} Trend`,
      chart: (
        <Line
          data={{
            labels: lineData.map((_, i) => i + 1),
            datasets: [{
              label: numCol,
              data: lineData.map(d => d[numCol]),
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

    // 5. Doughnut Chart
    if (catCol) {
      const doughnutData = aggregateData(data, catCol, numCol, 6);
      if (doughnutData.length > 0) {
        result.push({
          id: "doughnut",
          title: `Doughnut: ${numCol} by ${catCol}`,
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

    // 6. Scatter Plot
    if (numCol2) {
      result.push({
        id: "scatter",
        title: `Scatter: ${numCol} vs ${numCol2}`,
        chart: (
          <Scatter
            data={{
              datasets: [{
                label: `${numCol} vs ${numCol2}`,
                data: data.slice(0, 50).map(d => ({ x: d[numCol], y: d[numCol2] })),
                backgroundColor: "rgba(236, 72, 153, 0.8)",
                pointRadius: 6,
                pointHoverRadius: 8,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { grid: { color: "#3f3f46" }, ticks: { color: "#a1a1aa" }, title: { display: true, text: numCol, color: "#a1a1aa" } },
                y: { grid: { color: "#3f3f46" }, ticks: { color: "#a1a1aa" }, title: { display: true, text: numCol2, color: "#a1a1aa" } }
              }
            }}
          />
        )
      });
    }

    return result;
  }, [data, numeric, categorical]);

  const filteredCharts = chartType === "all" 
    ? charts 
    : charts.filter(c => c.id === chartType);

  if (!data.length || numeric.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 p-8 text-center">
        <div>
          <p className="mb-2">Upload a dataset with numeric columns to view charts</p>
          <p className="text-sm text-zinc-600">Charts: Histogram, Pie, Bar, Line, Doughnut, Scatter</p>
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
            {chart.title.split(":")[0]}
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
