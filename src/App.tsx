import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, Globe, BarChart3, FileText, Loader2 } from "lucide-react";
import Markdown from "react-markdown";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { Dashboard, ChartConfig } from "@/components/Dashboard";
import { FileUpload } from "@/components/FileUpload";
import { useGemini } from "@/hooks/useGemini";
import { generateDashboardConfig, generateReport } from "@/lib/ai";
import { cn } from "@/lib/utils";

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
  const [fileName, setFileName] = useState<string>("");
  const [configs, setConfigs] = useState<ChartConfig[]>([]);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [isGeneratingDashboard, setIsGeneratingDashboard] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'report'>('dashboard');

  const {
    connect,
    disconnect,
    isConnected,
    isConnecting,
    isSpeaking,
    isListening,
    error,
  } = useGemini();

  const handleDataLoaded = async (loadedData: any[], name: string) => {
    setData(loadedData);
    setFileName(name);
    setReport(null);
    setActiveTab('dashboard');

    if (loadedData.length > 0) {
      setIsGeneratingDashboard(true);
      const newConfigs = await generateDashboardConfig(loadedData);
      setConfigs(newConfigs);
      setIsGeneratingDashboard(false);
    } else {
      setConfigs([]);
    }
  };

  const handleToggleVoice = () => {
    if (isConnected) {
      disconnect();
    } else {
      const systemInstruction = `
        You are an expert AI Business Advisor.
        The user has uploaded a dataset named "${fileName}" with ${data.length} rows.
        Here is a sample of the data:
        ${JSON.stringify(data.slice(0, 5))}
        
        Answer their questions concisely and professionally based on this data.
        If they ask about trends, analyze the sample and infer insights.
      `;
      connect(systemInstruction, language.name);
    }
  };

  const handleGenerateReport = async () => {
    if (data.length === 0) return;
    setActiveTab('report');
    if (report) return;
    
    setIsGeneratingReport(true);
    const generatedReport = await generateReport(data, language.name);
    setReport(generatedReport);
    setIsGeneratingReport(false);
  };

  const handleDownloadReport = async () => {
    if (data.length === 0) return;
    
    let currentReport = report;
    if (!currentReport) {
      setIsGeneratingReport(true);
      currentReport = await generateReport(data, language.name);
      setReport(currentReport);
      setIsGeneratingReport(false);
    }

    // Create a Blob and trigger download
    const blob = new Blob([currentReport], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Business_Report_${fileName.split(".")[0] || "Dataset"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">AI Business Advisor</h1>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5">
            <Globe className="w-4 h-4 text-zinc-400" />
            <select
              value={language.code}
              onChange={(e) =>
                setLanguage(LANGUAGES.find((l) => l.code === e.target.value) || LANGUAGES[0])
              }
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
            disabled={data.length === 0 || isGeneratingReport}
            className={cn(
              "flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              data.length === 0
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20"
            )}
          >
            {isGeneratingReport ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{isGeneratingReport ? "Generating..." : "Download Report"}</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls & Voice */}
        <div className="lg:col-span-4 space-y-8">
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-lg font-medium mb-4 flex items-center space-x-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <span>Dataset Source</span>
            </h2>
            <FileUpload onDataLoaded={handleDataLoaded} />
          </section>

          <section className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center min-h-[400px]">
            <h2 className="text-lg font-medium mb-8 text-center">
              {isConnected ? "Advisor is listening..." : "Start Voice Session"}
            </h2>
            
            <VoiceAssistant
              isListening={isListening}
              isSpeaking={isSpeaking}
              isConnecting={isConnecting}
              onToggle={handleToggleVoice}
            />

            {error && (
              <p className="mt-6 text-sm text-red-400 text-center bg-red-400/10 px-4 py-2 rounded-lg">
                {error}
              </p>
            )}

            <p className="mt-8 text-sm text-zinc-500 text-center max-w-[250px]">
              {isConnected
                ? "Speak naturally to ask questions about your dataset."
                : "Click the microphone to connect to your AI Business Advisor."}
            </p>
          </section>
        </div>

        {/* Right Column: Dashboard */}
        <div className="lg:col-span-8">
          <section className="bg-zinc-900/40 border border-zinc-800 rounded-2xl min-h-[600px] flex flex-col">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
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
                  onClick={handleGenerateReport}
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
              </div>
              {data.length > 0 && (
                <span className="text-xs font-medium text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full">
                  {data.length} records
                </span>
              )}
            </div>

            <div className="flex-1 relative overflow-y-auto">
              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' ? (
                  isGeneratingDashboard ? (
                    <motion.div
                      key="loading-dash"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400"
                    >
                      <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                      <p>Analyzing dataset and generating insights...</p>
                    </motion.div>
                  ) : data.length > 0 && configs.length > 0 ? (
                    <motion.div
                      key="dashboard"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full"
                    >
                      <Dashboard data={data} configs={configs} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500"
                    >
                      <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                      <p>Upload a dataset to view your dashboard</p>
                    </motion.div>
                  )
                ) : (
                  isGeneratingReport ? (
                    <motion.div
                      key="loading-report"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400"
                    >
                      <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                      <p>Analyzing dataset and writing comprehensive report...</p>
                    </motion.div>
                  ) : report ? (
                    <motion.div
                      key="report"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-8"
                    >
                      <div className="markdown-body">
                        <Markdown>{report}</Markdown>
                      </div>
                    </motion.div>
                  ) : null
                )}
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
