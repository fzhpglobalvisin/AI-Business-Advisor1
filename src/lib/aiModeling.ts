import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export interface AIChartSpec {
  chartType: "bar" | "line" | "pie";
  title: string;
  summary: string;
  xAxisKey: string;
  dataKeys: string[];
  modeledData: Array<Record<string, any>>;
}

export async function generateAIChartSpec(
  datasetSample: any[],
  userPrompt: string
): Promise<AIChartSpec> {
  const prompt = `
    Analyze this dataset sample and create a chart payload for the user request: "${userPrompt}".
    
    Dataset Sample:
    ${JSON.stringify(datasetSample.slice(0, 5))}
    
    1. Filter, aggregate, or clean the data to best answer the request.
    2. Return a summary explaining the key metric insight.
    3. Specify chart configuration compatible with Recharts.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          chartType: { type: Type.STRING, enum: ["bar", "line", "pie"] },
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          xAxisKey: { type: Type.STRING },
          dataKeys: { type: Type.ARRAY, items: { type: Type.STRING } },
          modeledData: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT },
          },
        },
        required: ["chartType", "title", "summary", "xAxisKey", "dataKeys", "modeledData"],
      },
    },
  });

  return JSON.parse(response.text || "{}") as AIChartSpec;
}