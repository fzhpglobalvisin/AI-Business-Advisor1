//D:\ai_business_advisor_v1\src\components\TableauCanvas.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { DynamicRechart } from './DynamicRechart';
import { parseTableauCopilotPrompt } from '@/lib/tableauCopilot';
import { Sparkles, MoveRight, Database, Type, Hash, ChevronRight, ChevronDown, Layers } from 'lucide-react';

interface TableauCanvasProps {
  data: any[];
}

export function TableauCanvas({ data }: TableauCanvasProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // 1. Extract fields dynamically
  const fields = useMemo(() => (data.length > 0 ? Object.keys(data[0]) : []), [data]);

  // Filter dimensions: Ignore raw IDs, links, and long text fields (reviews, user names) from being secondary dimensions
  const dimensions = useMemo(() => {
    return fields.filter((f) => {
      const isString = typeof data[0]?.[f] === 'string';
      const isIdOrCode = /id|_id|uuid|code|link|img/i.test(f);
      return isString && !isIdOrCode;
    });
  }, [fields, data]);

  // Filter valid hierarchy sub-dimensions (exclude freeform text like reviews or comma-separated user lists)
  const validSubDimensions = useMemo(() => {
    return dimensions.filter((d) => !/user|author|review|content|comment|desc|summary/i.test(d));
  }, [dimensions]);

  // Filter measures
  const measures = useMemo(() => {
    return fields.filter((f) => typeof data[0]?.[f] === 'number');
  }, [fields, data]);

  // Non-price measures (prioritizes metrics like discount, rating, quantity)
  const nonPriceMeasures = useMemo(() => {
    return measures.filter((m) => !/price|cost|amount|total|revenue|val/i.test(m));
  }, [measures]);

  const [chartSpec, setChartSpec] = useState<any>({
    type: 'bar',
    xAxisKey: '',
    dataKey: '',
    title: 'Hierarchical Business Analytics',
  });

  // Automatically select initial meaningful fields on load
  useEffect(() => {
    if (fields.length > 0) {
      const selectedDim = dimensions.length > 0 ? dimensions[0] : fields.find((f) => typeof data[0]?.[f] === 'string') || fields[0];
      const selectedMeasure = nonPriceMeasures.length > 0 ? nonPriceMeasures[0] : measures[0] || fields[1];

      setChartSpec((prev: any) => ({
        ...prev,
        xAxisKey: selectedDim,
        dataKey: selectedMeasure,
      }));
    }
  }, [dimensions, measures, nonPriceMeasures, fields]);

  // 2. Generate Hierarchical Data Tree (Parent Dimension -> Sub-Product / Item -> Measures)
  const hierarchicalData = useMemo(() => {
    if (!data || data.length === 0 || !chartSpec.xAxisKey || !chartSpec.dataKey) return [];

    const primaryDim = chartSpec.xAxisKey;
    // Fall back to safe hierarchy dimension to avoid dumping arrays of user names/reviews
    const secondaryDim =
      validSubDimensions.find((d) => d !== primaryDim) ||
      fields.find((f) => /product|item|title|name|model|brand/i.test(f)) ||
      'Product Name';

    const measureKey = chartSpec.dataKey;

    const tree: Record<string, { total: number; children: Record<string, number> }> = {};

    data.forEach((row) => {
      const parentVal = String(row[primaryDim] || 'Uncategorized');
      
      // Clean up child values: if field contains long concatenated text, trim or extract a title
      let rawChild = String(row[secondaryDim] || 'Item');
      if (rawChild.length > 60) {
        rawChild = rawChild.substring(0, 57) + '...';
      }
      const childVal = rawChild;

      const rawVal = row[measureKey];
      const val = typeof rawVal === 'number' && !isNaN(rawVal) ? rawVal : 0;

      if (!tree[parentVal]) {
        tree[parentVal] = { total: 0, children: {} };
      }
      tree[parentVal].total += val;

      if (!tree[parentVal].children[childVal]) {
        tree[parentVal].children[childVal] = 0;
      }
      tree[parentVal].children[childVal] += val;
    });

    return Object.entries(tree)
      .map(([name, node]) => ({
        name,
        total: Math.round(node.total),
        children: Object.entries(node.children)
          .map(([childName, childValue]) => ({
            name: childName,
            value: Math.round(childValue),
          }))
          .sort((a, b) => b.value - a.value),
      }))
      .sort((a, b) => b.total - a.total);
  }, [data, chartSpec.xAxisKey, chartSpec.dataKey, validSubDimensions, fields]);

  // Aggregated flat dataset for visual Recharts rendering
  const chartData = useMemo(() => {
    return hierarchicalData.slice(0, 8).map((item) => ({
      [chartSpec.xAxisKey]: item.name,
      [chartSpec.dataKey]: item.total,
    }));
  }, [hierarchicalData, chartSpec.xAxisKey, chartSpec.dataKey]);

  const toggleExpand = (key: string) => {
    setExpandedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAiPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true);
    try {
      const spec = await parseTableauCopilotPrompt(prompt, data);
      setChartSpec(spec);
    } catch (err) {
      console.error('AI Mapping failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 p-4 border border-slate-800 rounded-xl bg-slate-900 text-white">
      <div className="grid grid-cols-12 gap-6 w-full">
        
        {/* Column Shelf / Fields Sidebar */}
        <div className="col-span-12 lg:col-span-3 p-4 border border-slate-800 bg-slate-950/60 rounded-xl flex flex-col justify-between">
          <div>
            <h3 className="font-semibold text-slate-300 flex items-center gap-2 mb-4 text-sm">
              <Database className="w-4 h-4 text-emerald-400" /> Column Shelf (Fields)
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Dimensions</p>
                <div className="flex flex-col gap-1.5">
                  {dimensions.map((dim) => (
                    <button
                      key={dim}
                      onClick={() => setChartSpec((prev: any) => ({ ...prev, xAxisKey: dim }))}
                      className={`w-full text-left p-2 text-xs rounded-lg flex items-center gap-2 border transition cursor-pointer ${
                        chartSpec.xAxisKey === dim
                          ? 'bg-blue-600 border-blue-400 text-white font-medium shadow-md shadow-blue-500/20'
                          : 'bg-blue-950/30 border-blue-800/40 text-blue-300 hover:bg-blue-900/40'
                      }`}
                    >
                      <Type className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">{dim}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Measures</p>
                <div className="flex flex-col gap-1.5">
                  {measures.map((measure) => (
                    <button
                      key={measure}
                      onClick={() => setChartSpec((prev: any) => ({ ...prev, dataKey: measure }))}
                      className={`w-full text-left p-2 text-xs rounded-lg flex items-center gap-2 border transition cursor-pointer ${
                        chartSpec.dataKey === measure
                          ? 'bg-emerald-600 border-emerald-400 text-white font-medium shadow-md shadow-emerald-500/20'
                          : 'bg-emerald-950/30 border-emerald-800/40 text-emerald-300 hover:bg-emerald-900/40'
                      }`}
                    >
                      <Hash className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{measure}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Canvas & Drill-Down Analysis Section */}
        <div className="col-span-12 lg:col-span-9 flex flex-col gap-6">
          
          {/* Main Visual Chart Display */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col min-h-[380px]">
            <div className="w-full grow flex items-center justify-center">
              {loading ? (
                <div className="text-slate-400 animate-pulse text-sm">AI Visualizer generating chart...</div>
              ) : chartSpec.xAxisKey && chartSpec.dataKey ? (
                <DynamicRechart spec={chartSpec} data={chartData} />
              ) : (
                <div className="text-slate-500 text-sm">Select fields from the column shelf</div>
              )}
            </div>

            {/* AI Prompt Bar */}
            <form onSubmit={handleAiPrompt} className="mt-4 flex gap-2">
              <div className="relative grow">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='AI Prompt Input: e.g. "Show top categories by discount percentage as pie chart"'
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
                <Sparkles className="w-4 h-4 absolute left-3 top-3 text-blue-400" />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm flex items-center gap-2 transition cursor-pointer shrink-0"
              >
                Build <MoveRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Drill-Down Hierarchical Analysis Drawer */}
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" /> Hierarchical Breakdown ({chartSpec.xAxisKey || 'Category'})
            </h4>

            <div className="space-y-2">
              {hierarchicalData.map((node) => {
                const isExpanded = !!expandedKeys[node.name];
                return (
                  <div key={node.name} className="border border-slate-800 rounded-lg bg-slate-900/60 overflow-hidden">
                    <button
                      onClick={() => toggleExpand(node.name)}
                      className="w-full flex items-center justify-between p-3 text-sm text-left hover:bg-slate-800/50 transition cursor-pointer"
                    >
                      <div className="flex items-center gap-2 truncate pr-4">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="font-medium text-slate-200 truncate">{node.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-md shrink-0">
                        {chartSpec.dataKey}: {node.total.toLocaleString()}
                      </span>
                    </button>

                    {isExpanded && (
                      <div className="bg-slate-950/80 border-t border-slate-800 p-3 space-y-1.5 pl-9">
                        {node.children.slice(0, 8).map((child, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-800/40 last:border-0 gap-4">
                            <span className="text-slate-400 truncate flex-1">{child.name}</span>
                            <span className="font-mono text-slate-300 shrink-0">{child.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}