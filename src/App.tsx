// src/App.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Globe, BarChart3, FileText, Loader2, Table, Sparkles } from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Dashboard } from "@/components/Dashboard";
import { FileUpload } from "@/components/FileUpload";
import { DataGrid } from "@/components/DataGrid";
import { MappingControlBar } from "@/components/MappingControlBar";
import { useGemini } from "@/hooks/useGemini";
import { generateReport } from "@/lib/ai";
import { cleanDataset } from "@/lib/dataCleaner";
import { autoClassifyFields } from "@/lib/fieldClassifier";
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

import {
  saveDatasetToStorage,
  getDatasetFromStorage,
  saveMappingToStorage,
  getMappingFromStorage,
  FieldMapping,
} from "@/lib/storage";
import { cn } from "@/lib/utils";
import Papa from "papaparse";

const LANGUAGES = [
  { code: "en-US", name: "English" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "ja-JP", name: "Japanese" },
  { code: "zh-CN", name: "Chinese" },
];

export default function App() {
  const [data, setData] = useState<any[]>([]);
  const [fileName, setFileName] = useState<string>("amazon.csv");
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  
  // Set Dashboard as default tab on load
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report' | 'dataset'>('dashboard');
  const [mapping, setMapping] = useState<FieldMapping>({ dimensions: [], measures: [], ignoredFields: [] });

  // Load from IndexedDB / Storage or fetch default CSV
  useEffect(() => {
    async function loadInitialData() {
      const cached = await getDatasetFromStorage();
      
      if (cached && cached.data.length > 0) {
        setData(cached.data);
        setFileName(cached.fileName);

        const savedMapping = getMappingFromStorage();
        if (savedMapping) {
          setMapping(savedMapping);
        } else {
          const classified = autoClassifyFields(cached.data);
          setMapping(classified);
          saveMappingToStorage(classified);
        }
      } else {
        fetch("/amazon.csv")
          .then((res) => res.text())
          .then((csvText) => {
            Papa.parse(csvText, {
              header: true,
              skipEmptyLines: true,
              dynamicTyping: true,
              complete: async (results) => {
                const { cleanedData } = cleanDataset(results.data);
                setData(cleanedData);
                setFileName("amazon.csv");

                const classified = autoClassifyFields(cleanedData);
                setMapping(classified);

                await saveDatasetToStorage(cleanedData, "amazon.csv");
                saveMappingToStorage(classified);
              },
            });
          })
          .catch((err) => console.error("Failed to load default dataset:", err));
      }
    }

    loadInitialData();
  }, []);

  // Auto-generate report when switching to the 'report' tab if none exists
  useEffect(() => {
    if (activeTab === 'report' && !report && data.length > 0 && !isGeneratingReport) {
      handleGenerateReport();
    }
  }, [activeTab, data, report]);

  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    error,
    captions,
  } = useGemini();

  const handleGenerateReport = async () => {
    if (data.length === 0) return;
    setIsGeneratingReport(true);
    try {
      const generated = await generateReport(data, language.name);
      setReport(generated);
    } catch (err) {
      console.error("Report generation error:", err);
      setReport("Failed to generate report. Please check your API configuration.");
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDataLoaded = async (loadedData: any[], name: string) => {
    const { cleanedData } = cleanDataset(loadedData);
    setData(cleanedData);
    setFileName(name);
    setReport(null);

    const classified = autoClassifyFields(cleanedData);
    setMapping(classified);

    await saveDatasetToStorage(cleanedData, name);
    saveMappingToStorage(classified);
    setActiveTab('dashboard');
  };

  const handleDataGridChange = async (updatedData: any[]) => {
    setData(updatedData);
    setReport(null);
    await saveDatasetToStorage(updatedData, fileName);
  };

  const handleMappingChange = (updatedMapping: FieldMapping) => {
    setMapping(updatedMapping);
    saveMappingToStorage(updatedMapping);
  };

  const handleResetMapping = () => {
    if (data.length > 0) {
      const classified = autoClassifyFields(data);
      setMapping(classified);
      saveMappingToStorage(classified);
    }
  };

  // Helper to aggregate dashboard breakdown context for AI safely
  const getDashboardSummary = () => {
    if (!data.length) return "No data currently available.";

    const dim = mapping.primaryDimension || mapping.dimensions?.[0];
    const meas = mapping.primaryMeasure || mapping.measures?.[0];
    const agg = mapping.aggregation || "SUM";

    if (!dim || !meas) {
      return `Total Dataset Rows: ${data.length}. Active Dimensions: ${(mapping.dimensions || []).join(", ")}, Active Measures: ${(mapping.measures || []).join(", ")}.`;
    }

    const grouped: Record<string, number> = {};
    data.forEach((row) => {
      const key = String(row[dim] ?? "Unknown");
      const val = parseFloat(row[meas]) || 0;
      grouped[key] = (grouped[key] || 0) + val;
    });

    const topBreakdowns = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, v]) => `${k}: ${v.toFixed(2)}`)
      .join("; ");

    return `
      Primary Dimension (X-Axis): ${dim}
      Primary Measure (Y-Axis): ${meas} (${agg})
      Top Aggregated Category Insights: [${topBreakdowns}]
      Configured Dimensions: ${(mapping.dimensions || []).join(", ")}
      Configured Measures: ${(mapping.measures || []).join(", ")}
      Total Analyzed Records: ${data.length}
    `;
  };

  const handleToggleVoice = () => {
    if (isConnected) {
      disconnect();
    } else {
      const dashboardInsights = getDashboardSummary();
      const systemInstruction = `
        You are an AI Business Advisor analyzing an interactive business intelligence dashboard.
        Dataset Name: "${fileName}"
        
        CURRENT DASHBOARD METRICS & VISUALIZATION SUMMARY:
        ${dashboardInsights}

        Answer executive questions directly based on these active dashboard visual metrics and dimensions.
      `;
      connect(systemInstruction, language.code.split('-')[0]);
    }
  };

const handleDownloadReport = async () => {
  if (data.length === 0) return;
  setIsExportingPdf(true);

  const originalTab = activeTab;

  try {
    // 1. SWITCH TAB & WAIT FOR RECHARTS/CANVAS ANIMATIONS TO RENDER
    if (activeTab !== "dashboard") {
      setActiveTab("dashboard");
    }
    // Give charts 800ms to mount and finish animation transition
    await new Promise((resolve) => setTimeout(resolve, 800));

    const pdf = new jsPDF("p", "pt", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 40;
    const contentWidth = pageWidth - margin * 2;

    // 2. RENDER AI EXECUTIVE REPORT TEXT
    if (report) {
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(18);
      pdf.setTextColor(16, 185, 129);
      pdf.text("Executive Briefing", margin, 50);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);

      const cleanReportText = report
        .replace(/[#*`_]/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

      const splitText = pdf.splitTextToSize(cleanReportText, contentWidth);
      let currentY = 70;

      splitText.forEach((line: string) => {
        if (currentY > pageHeight - margin) {
          pdf.addPage();
          currentY = margin;
        }
        pdf.text(line, margin, currentY);
        currentY += 13;
      });

      pdf.addPage();
    }

    // 3. CAPTURE DASHBOARD CANVAS WITH DOUBLE-PASS ENFORCEMENT
    const dashboardElement = document.getElementById("export-container");

    if (dashboardElement) {
      // First pass warms up browser canvas cache for Recharts SVGs
      await toPng(dashboardElement, { cacheBust: true });

      // Second pass captures full layout image
      const dataUrl = await toPng(dashboardElement, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#09090b",
        filter: (node) => {
          if (node instanceof HTMLElement) {
            return (
              !node.classList.contains("ag-root-wrapper") &&
              node.tagName !== "TABLE" &&
              !node.classList.contains("mapping-control-bar")
            );
          }
          return true;
        },
      });

      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * contentWidth) / imgProps.width;

      pdf.setFillColor(9, 9, 11);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text("Dashboard Visualizations", margin, 40);

      const renderHeight = Math.min(imgHeight, pageHeight - 70);
      pdf.addImage(dataUrl, "PNG", margin, 55, contentWidth, renderHeight);
    }

    pdf.save(`Executive_Report_${fileName.split(".")[0] || "Dataset"}.pdf`);
  } catch (err) {
    console.error("PDF Export error:", err);
  } finally {
    setActiveTab(originalTab);
    setIsExportingPdf(false);
  }
};

  return (
    <div className="relative min-h-screen w-full text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Background */}
      <div 
        className="fixed inset-0 w-full h-full bg-cover bg-center bg-no-repeat -z-20 pointer-events-none"
        style={{ backgroundImage: `url('/DigitalTransformation.png')` }}
      />
      <div className="fixed inset-0 bg-zinc-950/40 -z-10 pointer-events-none" />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">AI Business Advisor</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
            <Globe className="w-4 h-4 text-zinc-400" />
            <select
              value={language.code}
              onChange={(e) => {
                const lang = LANGUAGES.find((l) => l.code === e.target.value) || LANGUAGES[0];
                setLanguage(lang);
                setReport(null);
              }}
              className="bg-transparent text-sm font-medium text-zinc-200 focus:outline-none cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="bg-zinc-900">
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleDownloadReport}
            disabled={data.length === 0 || isExportingPdf}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              data.length === 0
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            )}
          >
            {isExportingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isExportingPdf ? "Exporting PDF..." : "Download PDF Report"}</span>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        {/* Left Panel */}
        <div className="lg:col-span-3 space-y-6">
          <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <h2 className="text-sm font-medium mb-3 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              <span>Dataset Source</span>
            </h2>
            <FileUpload onDataLoaded={handleDataLoaded} />
          </section>

          <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 flex flex-col items-center justify-center min-h-87.5 backdrop-blur-sm">
            <h2 className="text-sm font-medium mb-4 text-center">
              {isConnected ? "Advisor is listening..." : "Start Voice Session"}
            </h2>
            
            <VoiceAssistant
              isListening={isListening}
              isSpeaking={isSpeaking}
              isConnecting={isConnecting}
              onToggle={handleToggleVoice}
              captions={captions}
            />

            {error && (
              <p className="mt-4 text-xs text-red-400 text-center bg-red-400/10 px-3 py-1.5 rounded-lg">
                {error}
              </p>
            )}

            <p className="mt-4 text-xs text-zinc-400 text-center max-w-55">
              {isConnected
                ? "Speak naturally to ask questions about your dashboard charts."
                : "Click the microphone to connect to your AI Business Advisor."}
            </p>
          </section>
        </div>

        {/* Right Canvas */}
        <div className="lg:col-span-9">
          <section className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl flex flex-col min-h-150 backdrop-blur-sm">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              {/* Tabs ordered: Dashboard -> AI Report -> Dataset Canvas */}
              <div className="flex bg-zinc-900/80 p-1 rounded-lg border border-zinc-800">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    activeTab === 'dashboard' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => setActiveTab('report')}
                  disabled={data.length === 0}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    activeTab === 'report' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200",
                    data.length === 0 && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  <span>AI Report</span>
                </button>
                <button
                  onClick={() => setActiveTab('dataset')}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                    activeTab === 'dataset' ? "bg-zinc-800 text-zinc-100 shadow-sm" : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <Table className="w-4 h-4" />
                  <span>Dataset Canvas</span>
                </button>
              </div>

              {data.length > 0 && (
                <span className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full">
                  {data.length} records
                </span>
              )}
            </div>

            {/* Target Container for PDF Export */}
            <div id="export-container" className="p-4 flex-1">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                  <motion.div
                    key="dashboard-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {data.length > 0 && (
                      <MappingControlBar
                        mapping={mapping}
                        allColumns={Object.keys(data[0] || {})}
                        onMappingChange={handleMappingChange}
                        onGenerate={() => saveMappingToStorage(mapping)}
                        onReset={handleResetMapping}
                      />
                    )}

                    {data.length > 0 ? (
                      <Dashboard data={data} mapping={mapping} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                        <p>Upload a dataset to view your dashboard</p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'report' && (
                  <motion.div
                    key="report-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-6 max-w-4xl mx-auto"
                  >
                    {isGeneratingReport ? (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-400 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        <p className="text-sm font-medium text-zinc-300">Generating Executive Summary...</p>
                        <p className="text-xs text-zinc-500">Evaluating dataset metrics and formatting strategic action items</p>
                      </div>
                    ) : report ? (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-5 h-5 text-emerald-400" />
                            <h2 className="text-lg font-semibold text-zinc-100">Executive Briefing</h2>
                          </div>
                          <button
                            onClick={handleGenerateReport}
                            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                          >
                            Regenerate
                          </button>
                        </div>

                        <div className="prose prose-invert max-w-none prose-headings:text-zinc-100 prose-headings:font-bold prose-p:text-zinc-300 prose-li:text-zinc-300 prose-strong:text-emerald-400 prose-table:border-collapse prose-th:border prose-th:border-zinc-800 prose-th:bg-zinc-900 prose-th:p-2 prose-td:border prose-td:border-zinc-800 prose-td:p-2">
                          <Markdown remarkPlugins={[remarkGfm]}>{report}</Markdown>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <FileText className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm">No report generated yet.</p>
                        <button
                          onClick={handleGenerateReport}
                          className="mt-4 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 transition-colors"
                        >
                          Generate AI Executive Report
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'dataset' && (
                  <motion.div
                    key="dataset-tab"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-full"
                  >
                    {data.length > 0 ? (
                      <DataGrid initialData={data} onDataChange={handleDataGridChange} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                        <Table className="w-12 h-12 mb-2 opacity-30" />
                        <p>Loading dataset...</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}