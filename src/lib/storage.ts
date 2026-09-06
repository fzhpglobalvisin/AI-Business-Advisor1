import { get, set, del } from "idb-keyval";

const DATASET_KEY = "advisor_cached_dataset";
const METADATA_KEY = "advisor_dataset_metadata";
const MAPPING_KEY = "advisor_field_mapping";

export interface FieldMapping {
  dimensions?: string[];
  measures?: string[];
  ignoredFields?: string[];
  excludedFields?: string[];
  selectedDimension?: string;
  selectedMeasure?: string;
  primaryDimension?: string;
  primaryMeasure?: string;
  aggregation?: "SUM" | "AVG" | "COUNT" | "MAX" | "MIN" | string;
}

// Save Full Dataset to IndexedDB
export async function saveDatasetToStorage(data: any[], fileName: string) {
  await set(DATASET_KEY, data);
  localStorage.setItem(
    METADATA_KEY,
    JSON.stringify({ fileName, rowCount: data.length, updatedAt: new Date().toISOString() })
  );
}

// Retrieve Dataset from IndexedDB
export async function getDatasetFromStorage(): Promise<{ data: any[]; fileName: string } | null> {
  const data = await get<any[]>(DATASET_KEY);
  const metadataRaw = localStorage.getItem(METADATA_KEY);
  if (data && metadataRaw) {
    const metadata = JSON.parse(metadataRaw);
    return { data, fileName: metadata.fileName };
  }
  return null;
}

// Save Mapping Config to localStorage
export function saveMappingToStorage(mapping: FieldMapping) {
  localStorage.setItem(MAPPING_KEY, JSON.stringify(mapping));
}

// Retrieve Mapping Config from localStorage
export function getMappingFromStorage(): FieldMapping | null {
  const raw = localStorage.getItem(MAPPING_KEY);
  return raw ? JSON.parse(raw) : null;
}

// Clear Storage
export async function clearAppStorage() {
  await del(DATASET_KEY);
  localStorage.removeItem(METADATA_KEY);
  localStorage.removeItem(MAPPING_KEY);
}