// src/components/MappingControlBar.tsx
import React, { useState } from "react";
import { SlidersHorizontal, RotateCcw, Play, CheckCircle2 } from "lucide-react";
import { FieldMapping } from "@/lib/storage";

interface Props {
  mapping: FieldMapping;
  allColumns: string[];
  onMappingChange: (updated: FieldMapping) => void;
  onGenerate: () => void;
  onReset: () => void;
}

export const MappingControlBar: React.FC<Props> = ({
  mapping,
  allColumns,
  onMappingChange,
  onGenerate,
  onReset,
}) => {
  const [showFeedback, setShowFeedback] = useState(false);

  const dimensions = mapping.dimensions || [];
  const measures = mapping.measures || [];
  const ignoredFields = mapping.ignoredFields || mapping.excludedFields || [];

  const handleMoveField = (column: string, target: "dimensions" | "measures" | "ignoredFields") => {
    const nextDimensions = dimensions.filter((c) => c !== column);
    const nextMeasures = measures.filter((c) => c !== column);
    const nextIgnored = ignoredFields.filter((c) => c !== column);

    if (target === "dimensions") nextDimensions.push(column);
    if (target === "measures") nextMeasures.push(column);
    if (target === "ignoredFields") nextIgnored.push(column);

    onMappingChange({
      ...mapping,
      dimensions: nextDimensions,
      measures: nextMeasures,
      ignoredFields: nextIgnored,
      selectedDimension: target === "dimensions" ? column : mapping.selectedDimension,
      selectedMeasure: target === "measures" ? column : mapping.selectedMeasure,
    });
  };

  const handleGenerateClick = () => {
    onGenerate();
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 3000);
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 mb-4 space-y-4 text-xs text-zinc-200 backdrop-blur-md relative">
      {/* Alert Notification Toast */}
      {showFeedback && (
        <div className="absolute -top-3 right-4 bg-emerald-500 text-zinc-950 font-semibold px-3 py-1 rounded-full shadow-lg flex items-center space-x-1.5 animate-bounce z-10">
          <CheckCircle2 className="w-4 h-4" />
          <span>Dashboard updated successfully!</span>
        </div>
      )}

      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-sm">Dimension & Measure Mapping</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onReset}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Mapping</span>
          </button>
          <button
            onClick={handleGenerateClick}
            className="flex items-center space-x-1 px-3 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-medium shadow-md shadow-emerald-500/20 transition-all active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Generate Dashboard</span>
          </button>
        </div>
      </div>

      {/* Field Categorization Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Dimensions */}
        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
          <span className="font-medium text-emerald-400 block mb-2">Dimensions (Categories)</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {dimensions.map((col) => (
              <span
                key={col}
                className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center space-x-1.5"
              >
                <span>{col}</span>
                <div className="flex items-center space-x-1 ml-1 border-l border-emerald-500/30 pl-1">
                  <button
                    onClick={() => handleMoveField(col, "measures")}
                    title="Move to Measures"
                    className="hover:text-white"
                  >
                    →
                  </button>
                  <button
                    onClick={() => handleMoveField(col, "ignoredFields")}
                    title="Exclude Field"
                    className="hover:text-red-400 font-bold"
                  >
                    ×
                  </button>
                </div>
              </span>
            ))}
          </div>
        </div>

        {/* Measures */}
        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
          <span className="font-medium text-blue-400 block mb-2">Measures (Numerical Values)</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {measures.map((col) => (
              <span
                key={col}
                className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded flex items-center space-x-1.5"
              >
                <span>{col}</span>
                <div className="flex items-center space-x-1 ml-1 border-l border-blue-500/30 pl-1">
                  <button
                    onClick={() => handleMoveField(col, "dimensions")}
                    title="Move to Dimensions"
                    className="hover:text-white"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => handleMoveField(col, "ignoredFields")}
                    title="Exclude Field"
                    className="hover:text-red-400 font-bold"
                  >
                    ×
                  </button>
                </div>
              </span>
            ))}
          </div>
        </div>

        {/* Excluded Fields (IDs & Dates) */}
        <div className="bg-zinc-950/60 p-2.5 rounded-lg border border-zinc-800/80">
          <span className="font-medium text-zinc-400 block mb-2">Excluded Fields (IDs / Dates)</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
            {ignoredFields.map((col) => (
              <span
                key={col}
                className="bg-zinc-800 text-zinc-400 border border-zinc-700 px-2 py-0.5 rounded flex items-center space-x-1.5"
              >
                <span>{col}</span>
                <div className="flex items-center space-x-1 ml-1 border-l border-zinc-700 pl-1">
                  <button
                    onClick={() => handleMoveField(col, "dimensions")}
                    title="Include as Dimension"
                    className="hover:text-emerald-400"
                  >
                    +Dim
                  </button>
                  <button
                    onClick={() => handleMoveField(col, "measures")}
                    title="Include as Measure"
                    className="hover:text-blue-400"
                  >
                    +Meas
                  </button>
                </div>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Axis Pickers */}
      <div className="flex flex-wrap items-center gap-4 pt-1 border-t border-zinc-800/60">
        <div className="flex items-center space-x-2">
          <label className="text-zinc-400">Primary Dimension (X-Axis):</label>
          <select
            value={mapping.selectedDimension || mapping.primaryDimension || ""}
            onChange={(e) =>
              onMappingChange({
                ...mapping,
                selectedDimension: e.target.value,
                primaryDimension: e.target.value,
              })
            }
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100"
          >
            {dimensions.map((dim) => (
              <option key={dim} value={dim}>
                {dim}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-zinc-400">Primary Measure (Y-Axis):</label>
          <select
            value={mapping.selectedMeasure || mapping.primaryMeasure || ""}
            onChange={(e) =>
              onMappingChange({
                ...mapping,
                selectedMeasure: e.target.value,
                primaryMeasure: e.target.value,
              })
            }
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100"
          >
            {measures.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-zinc-400">Aggregation:</label>
          <select
            value={mapping.aggregation || "SUM"}
            onChange={(e) =>
              onMappingChange({
                ...mapping,
                aggregation: e.target.value as FieldMapping["aggregation"],
              })
            }
            className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-100"
          >
            <option value="SUM">SUM</option>
            <option value="AVG">AVERAGE</option>
            <option value="COUNT">COUNT</option>
            <option value="PERCENT">PERCENT (%)</option>
            <option value="MAX">MAX</option>
            <option value="MIN">MIN</option>
          </select>
        </div>
      </div>
    </div>
  );
};