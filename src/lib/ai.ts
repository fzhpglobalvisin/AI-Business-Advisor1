import { GoogleGenAI, Type } from "@google/genai";
import { ChartConfig } from "@/components/Dashboard";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateDashboardConfig(data: any[]): Promise<ChartConfig[]> {
  if (!data || data.length === 0) return [];

  // Take a sample of the data to avoid exceeding context limits
  const sample = data.slice(0, 5);
  const keys = Object.keys(sample[0]);

  const prompt = `
    Analyze the following JSON data sample and its keys.
    Keys: ${keys.join(", ")}
    Sample: ${JSON.stringify(sample)}

    Generate a configuration for 3 to 4 charts to visualize this data effectively.
    The charts can be of type "bar", "line", or "pie".
    Return a JSON array of objects with the following structure:
    {
      "id": "unique-string",
      "type": "bar" | "line" | "pie",
      "title": "Chart Title",
      "dataKey": "The key for the Y-axis or value (must be a numeric field)",
      "xAxisKey": "The key for the X-axis or label (usually a string/category field)"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              type: { type: Type.STRING },
              title: { type: Type.STRING },
              dataKey: { type: Type.STRING },
              xAxisKey: { type: Type.STRING },
            },
            required: ["id", "type", "title", "dataKey", "xAxisKey"],
          },
        },
      },
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text) as ChartConfig[];
    }
  } catch (error) {
    console.error("Failed to generate dashboard config:", error);
  }

  return [];
}

export async function generateReport(data: any[], language: string): Promise<string> {
  if (!data || data.length === 0) return "No data available to generate a report.";

  const sample = data.slice(0, 50); // Send up to 50 rows for context

  const prompt = `
    Analyze the following dataset and generate a comprehensive business report.
    The report should include:
    1. Executive Summary
    2. Key Findings & Trends
    3. Actionable Recommendations

    Dataset Sample:
    ${JSON.stringify(sample)}

    Please write the report in ${language}.
    Format the output in Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
    });

    return response.text || "Failed to generate report.";
  } catch (error) {
    console.error("Failed to generate report:", error);
    return "An error occurred while generating the report.";
  }
}
