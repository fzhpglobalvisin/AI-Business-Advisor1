import React, { useState, useRef } from "react";
import { UploadCloud, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

interface FileUploadProps {
  onDataLoaded: (data: any[], fileName: string) => void;
}

export function FileUpload({ onDataLoaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          onDataLoaded(results.data, file.name);
        },
      });
    } else if (file.name.endsWith(".json")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const json = JSON.parse(e.target?.result as string);
          onDataLoaded(Array.isArray(json) ? json : [json], file.name);
        } catch (err) {
          console.error("Failed to parse JSON", err);
        }
      };
      reader.readAsText(file);
    } else {
      alert("Please upload a CSV or JSON file.");
      setFileName(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full">
      {!fileName ? (
        <div
          className={cn(
            "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-colors",
            isDragging
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <UploadCloud className="w-8 h-8 text-zinc-400 mb-3" />
          <p className="text-sm font-medium text-zinc-200">
            Drag & drop your dataset here
          </p>
          <p className="text-xs text-zinc-500 mt-1">Supports CSV and JSON</p>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv,.json"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="flex items-center justify-between bg-zinc-800 rounded-xl p-4 border border-zinc-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-200 truncate max-w-[150px]">
                {fileName}
              </p>
              <p className="text-xs text-emerald-400">Dataset loaded</p>
            </div>
          </div>
          <button
            onClick={() => {
              setFileName(null);
              onDataLoaded([], "");
            }}
            className="p-1.5 hover:bg-zinc-700 rounded-md text-zinc-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
