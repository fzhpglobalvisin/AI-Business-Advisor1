import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ScatterChart,
  Scatter,
  AreaChart,
  Area,
} from "recharts";

interface DashboardProps {
  data: any[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

function analyzeColumns(data: any[]) {
  if (!data || data.length === 0) return { numeric: [] as string[], categorical: [] as string[] };
  
  const keys = Object.keys(data[0]);
  const analysis = { numeric: [] as string[], categorical: [] as string[] };
  
  keys.forEach(key => {
    const values = data.map(row => row[key]).filter(v => v !== null && v !== undefined);
    const isNumeric = values.every(v => !isNaN(parseFloat(String(v))) && isFinite(Number(v)));
    if (isNumeric && new Set(values).size > 2) {
      analysis.numeric.push(key);
    } else {
      analysis.categorical.push(key);
    }
  });
  
  return analysis;
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
    .map(([name, value]) => ({ name, value }));
}

function createHistogramData(data: any[], numericKey: string) {
  const values = data.map(row => parseFloat(row[numericKey])).filter(v => !isNaN(v));
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const bucketCount = Math.min(10, Math.ceil(Math.sqrt(values.length)));
  const bucketSize = range / bucketCount || 1;
  const buckets = Array(bucketCount).fill(0).map((_, i) => ({ range: `${(min + i * bucketSize).toFixed(1)}`, count: 0 }));
  values.forEach(v => {
    const idx = Math.min(Math.floor((v - min) / bucketSize), bucketCount - 1);
    buckets[idx].count++;
  });
  return buckets;
}

export function Dashboard({ data }: DashboardProps) {
  const { numeric, categorical } = analyzeColumns(data);
  
  const chartConfigs = useMemo(() => {
    if (!data || data.length === 0 || numeric.length === 0) return [];
    
    const configs = [];
    const numKey = numeric[0];
    const catKey = categorical[0];
    
    // Pie chart
    if (catKey) {
      configs.push({ id: 'pie', type: 'pie' as const, title: `${numKey} by ${catKey}`, data: aggregateData(data, catKey, numKey, 8) });
    }
    
    // Bar chart
    if (catKey) {
      configs.push({ id: 'bar', type: 'bar' as const, title: `${numKey} by ${catKey}`, data: aggregateData(data, catKey, numKey, 12) });
    }
    
    // Line chart
    configs.push({ id: 'line', type: 'line' as const, title: `${numKey} Trend`, data: data.slice(0, 30).map((r, i) => ({ ...r, index: i + 1 })) });
    
    // Area chart
    configs.push({ id: 'area', type: 'area' as const, title: `${numKey} Area`, data: data.slice(0, 30).map((r, i) => ({ ...r, index: i + 1 })) });
    
    // Histogram
    configs.push({ id: 'histogram', type: 'histogram' as const, title: `${numKey} Distribution`, data: createHistogramData(data, numKey) });
    
    // Scatter (if 2 numeric)
    if (numeric.length >= 2) {
      configs.push({ id: 'scatter', type: 'scatter' as const, title: `${numeric[0]} vs ${numeric[1]}`, data: data.slice(0, 50) });
    }
    
    return configs;
  }, [data, numeric, categorical]);

  if (!data || data.length === 0 || numeric.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 p-8 text-center">
        <div>
          <p className="mb-2">Upload a dataset with numeric columns to view charts</p>
          <p className="text-sm text-zinc-600">Charts: Pie, Bar, Line, Area, Histogram, Scatter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {chartConfigs.map((config) => (
        <div key={config.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-zinc-100">{config.title}</h3>
            <p className="text-xs text-zinc-500 mt-1">{config.type.toUpperCase()} • {data.length} records</p>
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              {config.type === 'bar' ? (
                <BarChart data={config.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="name" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} interval={0} tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }} />
                  <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : config.type === 'line' ? (
                <LineChart data={config.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="index" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey={numeric[0]} stroke="#10b981" strokeWidth={3} dot={false} />
                </LineChart>
              ) : config.type === 'area' ? (
                <AreaChart data={config.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="index" stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }} />
                  <Area type="monotone" dataKey={numeric[0]} stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} strokeWidth={2} />
                </AreaChart>
              ) : config.type === 'pie' ? (
                <PieChart>
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }} />
                  <Pie data={config.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={2} label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''} labelLine={false}>
                    {config.data.map((_: any, i: number) => <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              ) : config.type === 'histogram' ? (
                <BarChart data={config.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey="range" stroke="#a1a1aa" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : config.type === 'scatter' ? (
                <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" />
                  <XAxis type="number" dataKey={numeric[1]} stroke="#a1a1aa" fontSize={11} name={numeric[1]} />
                  <YAxis type="number" dataKey={numeric[0]} stroke="#a1a1aa" fontSize={11} name={numeric[0]} />
                  <Tooltip contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }} cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter name="Data" data={config.data} fill="#ec4899" />
                </ScatterChart>
              ) : null}
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
