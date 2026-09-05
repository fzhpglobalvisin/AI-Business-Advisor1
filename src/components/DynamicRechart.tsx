import React from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line, PieChart, Pie,
  Cell, XAxis, YAxis, Tooltip, CartesianGrid, Legend
} from 'recharts';

interface Spec {
  type: 'bar' | 'line' | 'pie';
  xAxisKey: string;
  dataKey: string;
  title?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export function DynamicRechart({ spec, data }: { spec: Spec; data: any[] }) {
  return (
    <div className="w-full h-80 flex flex-col items-center">
      {spec.title && <h4 className="text-sm font-semibold mb-2 text-slate-300">{spec.title}</h4>}
      <ResponsiveContainer width="100%" height="100%">
        {spec.type === 'line' ? (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={spec.xAxisKey} stroke="#94A3B8" />
            <YAxis stroke="#94A3B8" />
            <Tooltip />
            <Line type="monotone" dataKey={spec.dataKey} stroke="#3B82F6" strokeWidth={2} />
          </LineChart>
        ) : spec.type === 'pie' ? (
          <PieChart>
            <Pie data={data} dataKey={spec.dataKey} nameKey={spec.xAxisKey} cx="50%" cy="50%" outerRadius={80} label>
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        ) : (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey={spec.xAxisKey} stroke="#94A3B8" />
            <YAxis stroke="#94A3B8" />
            <Tooltip />
            <Bar dataKey={spec.dataKey} fill="#3B82F6" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}