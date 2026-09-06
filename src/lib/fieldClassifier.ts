import { FieldMapping } from "./storage";

export function autoClassifyFields(data: any[]): FieldMapping {
  if (!data || data.length === 0) {
    return { dimensions: [], measures: [], ignoredFields: [] };
  }

  const sample = data[0];
  const keys = Object.keys(sample);

  const dimensions: string[] = [];
  const measures: string[] = [];
  const ignoredFields: string[] = [];

  keys.forEach((key) => {
    const lowerKey = key.toLowerCase();
    
    // Auto-ignore typical primary/foreign keys and date indexes from chart aggregations
    if (lowerKey.endsWith("id") || lowerKey === "id" || lowerKey.includes("date")) {
      ignoredFields.push(key);
      return;
    }

    const value = sample[key];
    if (typeof value === "number") {
      measures.push(key);
    } else {
      dimensions.push(key);
    }
  });

  return {
    dimensions,
    measures,
    ignoredFields,
    selectedDimension: dimensions[0] || keys[0],
    selectedMeasure: measures[0] || keys[1],
    aggregation: "SUM",
  };
}