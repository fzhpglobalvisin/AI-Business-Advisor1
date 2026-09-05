# 🚀 AI Business Advisor v1 (Enterprise Edition)

> **Turn Raw Enterprise Data into Actionable Business Intelligence in Seconds.**

AI Business Advisor v1 is a next-generation intelligence workspace combining real-time AI data modeling, interactive spreadsheet grids, automated visual analytics, and hands-free voice AI interaction. Built for executive decision-makers and data analysts, it bridges the gap between raw CSV/JSON datasets and instant strategic decision-making.

---

## 🌟 Key Value Propositions

* **Conversational Visual Analytics (Tableau Canvas Copilot)**  
  Ask plain-language questions like *"Show top categories by revenue as a pie chart"*, and our AI Data Modeling Agent automatically populates field shelves and renders interactive, presentation-ready visualizations.
* **Hands-Free Voice Assistant (Gemini Live Integration)**  
  Leveraging WebSocket streaming via `gemini-3.1-flash-live-preview`, executives can verbally query business performance, conduct deep-dive audits, and receive real-time audio-visual feedback hands-free.
* **Enterprise Data Grid & Spreadsheet Workflows**  
  Includes AG Grid spreadsheet support (`ExcelGrid.tsx`) with editable cells, global column search, inline filters, and paginated data tables for high-density financial and inventory data processing.
* **Instant Zero-Setup Onboarding**  
  Pre-loaded with operational datasets (`amazon.csv`) for instant product demoing, paired with dynamic uploader dropzones (`FileUpload.tsx`) supporting seamless CSV and JSON data hydration.

---

## 🏗️ Core Architecture Map

```text
AI BUSINESS ADVISOR WORKSPACE
├── public/
│   └── amazon.csv                --> Pre-loaded default dataset for instant boot
│
├── src/
│   ├── components/               --> Dynamic UI View Layer
│   │   ├── Dashboard.tsx         --> Chart.js analytics dashboard & KPI views
│   │   ├── DataTable.tsx         --> High-performance data grid with global search
│   │   ├── DynamicRechart.tsx    --> AI-generated dynamic Recharts visualization engine
│   │   ├── ExcelGrid.tsx         --> Interactive AG Grid spreadsheet editor
│   │   ├── FileUpload.tsx        --> Dropzone component for custom CSV/JSON datasets
│   │   ├── TableauCanvas.tsx     --> Drag-and-drop field shelves & copilot canvas
│   │   └── VoiceAssistant.tsx    --> Real-time Gemini Live audio visualizer UI
│   │
│   ├── hooks/
│   │   └── useGemini.ts          --> WebSocket streaming hook for Gemini Flash Live
│   │
│   └── lib/                      --> Intelligence Layer
│       ├── ai.ts                 --> Automated business report generation logic
│       ├── aiModeling.ts         --> AI Data Agent converting raw data to Recharts specs
│       ├── tableauCopilot.ts     --> Natural language prompt mapping engine
│       └── utils.ts              --> High-efficiency Tailwind styling utilities
│
└── .env                          --> Secured VITE_GEMINI_API_KEY environment config