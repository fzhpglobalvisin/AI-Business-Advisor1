// D:\ai_business_advisor_v1\src\components\DataGrid.tsx
import { useState, useEffect, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { 
  ColDef, 
  ModuleRegistry, 
  AllCommunityModule 
} from 'ag-grid-community';

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

interface DataGridProps {
  initialData?: any[];
  onDataChange?: (updatedData: any[]) => void;
}

export function DataGrid({ initialData = [], onDataChange }: DataGridProps) {
  const [rowData, setRowData] = useState<any[]>(initialData);

  // Sync internal state whenever initialData changes (e.g., when uploading a ZIP or CSV)
  useEffect(() => {
    setRowData(initialData);
  }, [initialData]);

  // Dynamically generate column definitions from the loaded data keys
  const columnDefs = useMemo<ColDef[]>(() => {
    if (!rowData || rowData.length === 0) return [];

    const sampleRow = rowData[0];
    return Object.keys(sampleRow).map((key) => ({
      field: key,
      headerName: key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase()),
      editable: true,
      filter: true,
      sortable: true,
      resizable: true,
    }));
  }, [rowData]);

  const handleCellValueChanged = () => {
    if (onDataChange) {
      onDataChange(rowData);
    }
  };

  const handleSaveData = () => {
    if (onDataChange) {
      onDataChange(rowData);
    }
  };

  return (
    <div className="w-full space-y-4">
      {rowData.length > 0 && (
        <button 
          onClick={handleSaveData}
          className="px-4 py-2 bg-emerald-600 text-white rounded-md font-medium hover:bg-emerald-500 transition-colors"
        >
          Save Cleaned Data
        </button>
      )}

      <div className="w-full h-125 rounded-lg overflow-hidden border border-zinc-800">
        <AgGridReact
          rowData={rowData}
          columnDefs={columnDefs}
          onCellValueChanged={handleCellValueChanged}
          defaultColDef={{
            sortable: true,
            resizable: true,
            flex: 1,
            minWidth: 120,
          }}
          pagination={true}
          paginationPageSize={10}
        />
      </div>
    </div>
  );
}