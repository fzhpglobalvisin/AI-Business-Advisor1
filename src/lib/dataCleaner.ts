export type FieldType = 'number' | 'string' | 'image' | 'link' | 'date' | 'boolean';

export interface FieldMetadata {
  key: string;          // Formatted label, e.g., "Product Name"
  originalKey: string;  // Original raw column name, e.g., "product_name"
  type: FieldType;
}

// Convert "product_name" or "productName" or "product-name" to "Product Name"
export function formatColumnHeader(key: string): string {
  if (!key) return '';
  
  return key
    // Insert space before capital letters in camelCase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Replace underscores and hyphens with spaces
    .replace(/[_-]+/g, ' ')
    // Trim extra spaces
    .trim()
    // Capitalize the first letter of each word
    .replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

const isImageUrl = (val: string): boolean => {
  if (typeof val !== 'string') return false;
  const clean = val.toLowerCase().trim();
  return (
    clean.startsWith('http') &&
    (clean.match(/\.(jpeg|jpg|gif|png|webp|svg)$/) !== null || clean.includes('images-na.ssl-images-amazon.com'))
  );
};

const isUrl = (val: string): boolean => {
  if (typeof val !== 'string') return false;
  return val.trim().startsWith('http://') || val.trim().startsWith('https://');
};

const parseNumericValue = (val: any): number | null => {
  if (typeof val === 'number') return isNaN(val) ? null : val;
  if (typeof val !== 'string') return null;

  const trimmed = val.trim();
  if (!trimmed) return null;

  const cleaned = trimmed.replace(/[^0-9.-]+/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return null;

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
};

/**
 * Universal Data Cleaner Pipeline
 * Rewrites column headers to Title Case, infers field types, and cleans dataset values.
 */
export function cleanDataset(rawData: any[]): { cleanedData: any[]; metadata: FieldMetadata[] } {
  if (!rawData || rawData.length === 0) {
    return { cleanedData: [], metadata: [] };
  }

  const sampleSize = Math.min(rawData.length, 50);
  const originalKeys = Object.keys(rawData[0]);
  
  // Create mapping of raw keys to readable keys
  const keyMap: Record<string, string> = {};
  originalKeys.forEach((rawKey) => {
    keyMap[rawKey] = formatColumnHeader(rawKey);
  });

  const fieldTypes: Record<string, FieldType> = {};

  // Step 1: Infer column types
  originalKeys.forEach((rawKey) => {
    const formattedKey = keyMap[rawKey];
    let numberMatches = 0;
    let imageMatches = 0;
    let urlMatches = 0;
    let validRows = 0;

    for (let i = 0; i < sampleSize; i++) {
      const val = rawData[i]?.[rawKey];
      if (val === null || val === undefined || val === '') continue;
      validRows++;

      if (isImageUrl(String(val))) {
        imageMatches++;
      } else if (isUrl(String(val))) {
        urlMatches++;
      } else if (parseNumericValue(val) !== null) {
        numberMatches++;
      }
    }

    if (validRows > 0 && imageMatches / validRows > 0.5) {
      fieldTypes[formattedKey] = 'image';
    } else if (validRows > 0 && urlMatches / validRows > 0.5) {
      fieldTypes[formattedKey] = 'link';
    } else if (validRows > 0 && numberMatches / validRows > 0.6) {
      fieldTypes[formattedKey] = 'number';
    } else {
      fieldTypes[formattedKey] = 'string';
    }
  });

  // Step 2: Transform rows with human-readable headers and cleaned data values
  const cleanedData = rawData.map((row) => {
    const cleanedRow: Record<string, any> = {};

    originalKeys.forEach((rawKey) => {
      const formattedKey = keyMap[rawKey];
      const rawVal = row[rawKey];
      const type = fieldTypes[formattedKey];

      if (rawVal === null || rawVal === undefined) {
        cleanedRow[formattedKey] = type === 'number' ? 0 : '';
        return;
      }

      if (type === 'number') {
        const num = parseNumericValue(rawVal);
        cleanedRow[formattedKey] = num !== null ? num : 0;
      } else if (type === 'string') {
        let strVal = String(rawVal).trim();
        if (strVal.includes('|')) {
          const parts = strVal.split('|');
          strVal = parts[parts.length - 1].trim();
        }
        cleanedRow[formattedKey] = strVal;
      } else {
        cleanedRow[formattedKey] = String(rawVal).trim();
      }
    });

    return cleanedRow;
  });

  const metadata: FieldMetadata[] = originalKeys.map((rawKey) => {
    const formattedKey = keyMap[rawKey];
    return {
      key: formattedKey,
      originalKey: rawKey,
      type: fieldTypes[formattedKey],
    };
  });

  return { cleanedData, metadata };
}