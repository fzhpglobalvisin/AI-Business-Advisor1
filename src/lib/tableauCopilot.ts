import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export async function parseTableauCopilotPrompt(userPrompt: string, dataSample: any[]) {
  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY environment variable");
  }

  const columns = dataSample.length > 0 ? Object.keys(dataSample[0]) : [];
  
  const systemInstruction = `
    You are an AI Tableau Copilot. Translate user prompts into JSON configs for Recharts.
    Valid chart types: 'bar', 'line', 'pie', 'area'.
    Available dataset columns: ${columns.join(', ')}.
    Return ONLY a JSON object with this exact shape:
    {
      "type": "bar" | "line" | "pie" | "area",
      "xAxisKey": "string",
      "dataKey": "string",
      "title": "string"
    }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3.6-flash',
    contents: `Translate this prompt: "${userPrompt}"`,
    config: {
      systemInstruction,
      responseMimeType: "application/json"
    }
  });

  return JSON.parse(response.text || '{}');
}