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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {configs.map((config) => (
        <div
          key={config.id}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 shadow-xl"
        >
          <h3 className="text-lg font-medium text-zinc-100 mb-4">{config.title}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {config.type === "bar" ? (
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey={config.xAxisKey} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />
                  <Bar dataKey={config.dataKey} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : config.type === "line" ? (
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                  <XAxis dataKey={config.xAxisKey} stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />
                  <Line type="monotone" dataKey={config.dataKey} stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
                </LineChart>
              ) : (
                <PieChart>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", borderColor: "#27272a", borderRadius: "8px" }}
                    itemStyle={{ color: "#e4e4e7" }}
                  />
                  <Legend wrapperStyle={{ paddingTop: "10px" }} />
                  <Pie
                    data={data}
                    dataKey={config.dataKey}
                    nameKey={config.xAxisKey}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {data.map((_, index) => (
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
