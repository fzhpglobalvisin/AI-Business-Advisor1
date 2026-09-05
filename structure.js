import fs from 'fs';
import path from 'path';

// Mapping relative file/folder paths to their inline annotation comments
const FILE_COMMENTS = {
  // Root Vercel & Project Folders
  '.vercel': 'Vercel deployment metadata directory',
  'project.json': 'Vercel project configuration',
  'README.txt': 'Project overview and documentation',
  'ai_business_advisor_v1': 'Main application root workspace',

  // Public Assets
  'public': 'Public static assets folder',
  'public/amazon.csv': '# Default dataset auto-loaded on boot',

  // Source Folder & Assets
  'src': 'Frontend application source code',
  'src/assets': '# Static media assets',
  'src/assets/logo.svg': '# Main application branding SVG logo',

  // Components
  'src/components': 'UI components and application views',
  'src/components/Dashboard.tsx': '# Standard Chart.js analytics dashboard (exports ChartConfig)',
  'src/components/DataTable.tsx': '# Data grid with global search, column filters, and pagination',
  'src/components/DynamicRechart.tsx': '# Dynamic Recharts renderer for AI-generated charts',
  'src/components/ExcelGrid.tsx': '# Interactive AG Grid spreadsheet (editable cells)',
  'src/components/FileUpload.tsx': '# File uploader dropzone (CSV & JSON support)',
  'src/components/TableauCanvas.tsx': '# Drag-and-drop field shelves with Tableau-style canvas',
  'src/components/VoiceAssistant.tsx': '# Gemini Live audio visualization interface',

  // Hooks
  'src/hooks': 'Custom React Hooks',
  'src/hooks/useGemini.ts': '# WebSocket client hook for gemini-3.1-flash-live-preview',

  // Core Logic Libraries
  'src/lib': 'Application helper modules and AI integrations',
  'src/lib/ai.ts': '# Full business report generation logic',
  'src/lib/aiModeling.ts': '# AI Data Modeling Agent (outputs Recharts JSON specs)',
  'src/lib/tableauCopilot.ts': '# AI Copilot logic for Tableau canvas field mapping',
  'src/lib/utils.ts': '# Tailwind class joiners (cn utility)',

  // App Root Files
  'src/App.tsx': '# Main layout wrapper, tab navigation, and default dataset hydration',
  'src/index.css': '# Global Tailwind CSS import declarations',
  'src/main.tsx': '# React DOM root bootstrap mounting entrypoint',
  'src/vite-env.d.ts': '# TypeScript client env declarations (import.meta.env)',

  // Root Configuration Files
  '.env': '# API key secrets (VITE_GEMINI_API_KEY)',
  'index.html': '# HTML application shell template',
  'package.json': '# Dependencies, Vite scripts, and metadata',
  'tsconfig.json': '# TypeScript compilation settings',
  'vite.config.ts': '# Vite server configuration & alias path mappings'
};

// Set of files/folders to exclude from tree traversal
const IGNORED = new Set([
  'node_modules',
  '.next',
  '.git',
  '.vscode',
  '.idea',
  'dist',
  'build',
  '.DS_Store',
  'Thumbs.db',
  'desktop.ini',
  '.env.local',
  '.env.development',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'generate-tree.js',
  'structure.txt'
]);

/**
 * Recursively builds an ASCII directory tree with file icons and inline comments.
 */
function generateTree(dir, prefix = '', relativeDir = '') {
  let output = '';

  try {
    // Read directory items, filter out ignored names, and sort (directories first, then alphabetically)
    const items = fs.readdirSync(dir, { withFileTypes: true })
      .filter(item => !IGNORED.has(item.name))
      .sort((a, b) => b.isDirectory() - a.isDirectory() || a.name.localeCompare(b.name));

    items.forEach((item, index) => {
      const isLast = index === items.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const icon = item.isDirectory() ? '📁 ' : '📄 ';
      
      // Construct clean relative key path for dictionary lookup
      const itemRelativePath = relativeDir ? `${relativeDir}/${item.name}` : item.name;
      
      // Also check for src-relative path fallback (handles nested relative trees)
      const cleanPathKey = itemRelativePath.startsWith('ai_business_advisor_v1/') 
        ? itemRelativePath.replace('ai_business_advisor_v1/', '')
        : itemRelativePath;

      const lineContent = `${prefix}${connector}${icon}${item.name}`;
      const comment = FILE_COMMENTS[itemRelativePath] || FILE_COMMENTS[cleanPathKey];
      
      // Append formatted comment with column padding if matching key exists
      if (comment) {
        const paddedLine = lineContent.padEnd(42, ' ');
        output += `${paddedLine} ${comment.startsWith('#') ? comment : `# ${comment}`}\n`;
      } else {
        output += `${lineContent}\n`;
      }

      // Recursively traverse nested subdirectories
      if (item.isDirectory()) {
        const newPrefix = prefix + (isLast ? '    ' : '│   ');
        output += generateTree(path.join(dir, item.name), newPrefix, itemRelativePath);
      }
    });
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err.message);
  }

  return output;
}

// Execute structure tree generation and write output file
const rootName = path.basename(process.cwd());
const treeText = `${rootName}/\n` + generateTree(process.cwd());

fs.writeFileSync('structure.txt', treeText, 'utf8');
console.log('✅ Clean project structure generated in structure.txt with inline action comments!');