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
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

export interface ChartConfig {
  id: string;
  type: "bar" | "line" | "pie";
  title: string;
  dataKey: string;
  xAxisKey: string;
}

interface DashboardProps {
  data: any[];
  configs: ChartConfig[];
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export function Dashboard({ data, configs }: DashboardProps) {
  if (!data || data.length === 0 || !configs || configs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500">
        No data or configuration available. Upload a dataset to generate insights.
      </div>
    );
  }

  // Limit data to prevent blurry/overcrowded charts
  const MAX_DATA_POINTS = 30;
  const chartData = data.slice(0, MAX_DATA_POINTS);
  const isTruncated = data.length > MAX_DATA_POINTS;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {configs.map((config) => (
        <div
          key={config.id}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col"
        >
          <div className="mb-4">
            <h3 className="text-lg font-medium text-zinc-100">{config.title}</h3>
            {isTruncated && (
              <p className="text-xs text-zinc-500 mt-1">
                Showing first {MAX_DATA_POINTS} of {data.length} records
              </p>
            )}
          </div>
          <div className="h-64 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              {config.type === "bar" ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey={config.xAxisKey} stroke="#a1a1aa" fontSize={13} tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis stroke="#a1a1aa" fontSize={13} tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", color: "#e4e4e7" }}
                    itemStyle={{ color: "#e4e4e7" }}
                    cursor={{ fill: "#27272a" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                  <Bar dataKey={config.dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              ) : config.type === "line" ? (
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey={config.xAxisKey} stroke="#a1a1aa" fontSize={13} tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis stroke="#a1a1aa" fontSize={13} tickLine={false} axisLine={false} tickMargin={8} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", color: "#e4e4e7" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                  <Line type="monotone" dataKey={config.dataKey} stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981", strokeWidth: 2, stroke: "#18181b" }} activeDot={{ r: 6, strokeWidth: 0 }} />
                </LineChart>
              ) : (
                <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px", color: "#e4e4e7" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                  <Pie
                    data={chartData}
                    dataKey={config.dataKey}
                    nameKey={config.xAxisKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={60}
                    paddingAngle={2}
                    fill="#8884d8"
                    label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                    stroke="none"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
}
