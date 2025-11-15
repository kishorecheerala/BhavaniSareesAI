import React, { useState } from 'react';
import { X, Download, Upload, Info, CheckCircle, XCircle, Users, Package as PackageIcon, Boxes } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { StoreName } from '../utils/db';
import { Customer, Supplier, Product } from '../types';
import Card from './Card';
import Button from './Button';

type Tab = 'customers' | 'suppliers' | 'products';

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};

const StatusNotification: React.FC<{ status: { type: 'info' | 'success' | 'error', message: string } | null; onClose: () => void; }> = ({ status, onClose }) => {
    if (!status) return null;

    const variants = {
        info: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
    };
    const icons = {
        info: <Info className="w-5 h-5 mr-3 flex-shrink-0" />,
        success: <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
        error: <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
    };

    return (
        <div className={`p-3 rounded-md my-4 text-sm flex justify-between items-start ${variants[status.type]}`}>
            <div className="flex items-start">{icons[status.type]}<span>{status.message}</span></div>
            <button onClick={onClose} className="font-bold text-lg leading-none ml-4">&times;</button>
        </div>
    );
};


interface DataImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DataImportModal: React.FC<DataImportModalProps> = ({ isOpen, onClose }) => {
  const { dispatch, showToast } = useAppContext();
  const [activeTab, setActiveTab] = useState<Tab>('customers');
  const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);

  const templates = {
    customers: {
        fileName: 'customers-template.csv',
        headers: ['id', 'name', 'phone', 'address', 'area', 'reference'],
        example: ['CUST-UNIQUE-1', 'Test Customer', '9876543210', '123 Main St', 'Test Area', 'Friend'],
    },
    suppliers: {
        fileName: 'suppliers-template.csv',
        headers: ['id', 'name', 'phone', 'location', 'gstNumber', 'reference', 'account1', 'account2', 'upi'],
        example: ['SUPP-UNIQUE-1', 'Test Supplier', '1234567890', 'Test City', 'GSTIN123', 'Ref', '12345', '', 'test@upi'],
    },
    products: {
        fileName: 'products-template.csv',
        headers: ['id', 'name', 'quantity', 'purchasePrice', 'salePrice', 'gstPercent'],
        example: ['PROD-UNIQUE-1', 'Test Product', '10', '100', '200', '5'],
    }
  };

  const handleDownloadTemplate = (type: Tab) => {
    const { fileName, headers, example } = templates[type];
    const csvContent = "data:text/csv;charset=utf-8," 
        + [headers.join(','), example.join(',')].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>, storeName: StoreName) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`Are you sure you want to import ${storeName}? This will REPLACE all existing ${storeName} data.`)) {
      if (event.target) (event.target as HTMLInputElement).value = '';
      return;
    }

    const reader = new FileReader();
    setImportStatus({ type: 'info', message: 'Reading file...' });

    reader.onload = (e) => {
        try {
            const text = e.target?.result as string;
            if (!text) throw new Error("Could not read file content.");

            const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
            if (lines.length < 2) throw new Error("CSV must have a header and at least one data row.");

            const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
            const template = templates[storeName as Tab];
            const requiredHeaders = template.headers;
            
            if (requiredHeaders.some(rh => !headers.includes(rh))) {
                throw new Error(`CSV is missing required columns. Header must contain: ${requiredHeaders.join(', ')}.`);
            }

            const data: any[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = parseCsvLine(lines[i]);
                const row = headers.reduce((obj, header, index) => ({...obj, [header]: values[index]?.trim() || ''}), {} as any);
                if (!row.id) continue; // Skip rows without an ID

                let newItem: any = { id: row.id };
                if (storeName === 'customers') {
                    newItem = { id: row.id, name: row.name, phone: row.phone, address: row.address, area: row.area, reference: row.reference } as Customer;
                } else if (storeName === 'suppliers') {
                    newItem = { id: row.id, name: row.name, phone: row.phone, location: row.location, gstNumber: row.gstnumber, reference: row.reference, account1: row.account1, account2: row.account2, upi: row.upi } as Supplier;
                } else if (storeName === 'products') {
                    newItem = { 
                        id: row.id, name: row.name, 
                        quantity: parseInt(row.quantity, 10) || 0,
                        purchasePrice: parseFloat(row.purchaseprice) || 0,
                        salePrice: parseFloat(row.saleprice) || 0,
                        gstPercent: parseFloat(row.gstpercent) || 0
                    } as Product;
                }
                data.push(newItem);
            }

            dispatch({ type: 'REPLACE_COLLECTION', payload: { storeName, data }});
            setImportStatus({ type: 'success', message: `Successfully imported ${data.length} ${storeName}.`});
            showToast(`Import successful! ${data.length} ${storeName} loaded.`);

        } catch (error) {
             setImportStatus({ type: 'error', message: `Import error: ${(error as Error).message}`});
        } finally {
            if (event.target) (event.target as HTMLInputElement).value = '';
        }
    };
    reader.readAsText(file);
  };
  
  if (!isOpen) return null;

  const tabConfig = {
    customers: { label: "Customers", icon: Users, storeName: 'customers' as StoreName },
    suppliers: { label: "Suppliers", icon: PackageIcon, storeName: 'suppliers' as StoreName },
    products: { label: "Products", icon: Boxes, storeName: 'products' as StoreName },
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[101] p-4 animate-fade-in-fast" aria-modal="true" role="dialog">
      <Card className="w-full max-w-4xl animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-primary">Import Data from CSV</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"><X size={24} /></button>
        </div>
        
        <div className="flex flex-col md:flex-row md:gap-8 mt-4">
            {/* Nav (Top on mobile, Left on desktop) */}
            <nav className="flex flex-row md:flex-col md:space-y-2 md:border-r md:pr-6 space-x-2 md:space-x-0 overflow-x-auto border-b md:border-b-0 pb-2 md:pb-0 mb-4 md:mb-0" aria-label="Tabs">
                {Object.entries(tabConfig).map(([key, { label, icon: Icon }]) => {
                    const isActive = activeTab === key;
                    return (
                        <button
                            key={key}
                            onClick={() => { setActiveTab(key as Tab); setImportStatus(null); }}
                            className={`group shrink-0 flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors w-full justify-center md:justify-start
                                ${isActive
                                    ? 'bg-purple-100 text-primary'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                            aria-current={isActive ? 'page' : undefined}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Content Panel */}
            <div className="flex-grow">
                <h3 className="font-bold text-lg">Import {tabConfig[activeTab].label}</h3>
                <p className="text-sm text-gray-600 mt-1">
                    You can use a spreadsheet program like Excel to create a CSV file.
                </p>
                <p className="text-sm font-bold text-red-600 mt-2">
                    Warning: Importing a file will replace all existing {activeTab} in the application.
                </p>
                
                <StatusNotification status={importStatus} onClose={() => setImportStatus(null)} />
                
                <div className="mt-6 space-y-4">
                    <div>
                        <h4 className="font-semibold">Step 1: Download Template</h4>
                        <p className="text-xs text-gray-500 mb-2">Use this template to ensure your data is in the correct format.</p>
                        <Button onClick={() => handleDownloadTemplate(activeTab)} variant="secondary" className="w-full sm:w-auto">
                            <Download className="w-4 h-4 mr-2" />
                            Download {tabConfig[activeTab].label} Template
                        </Button>
                    </div>
                    <div>
                        <h4 className="font-semibold">Step 2: Upload Your File</h4>
                        <p className="text-xs text-gray-500 mb-2">Select the CSV file you prepared.</p>
                         <label htmlFor="csv-import-input" className="px-4 py-2 rounded-md font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] bg-primary hover:bg-purple-800 focus:ring-primary cursor-pointer w-full sm:w-auto">
                            <Upload className="w-4 h-4 mr-2" />
                            Upload {tabConfig[activeTab].label} CSV
                        </label>
                        <input 
                            type="file" 
                            id="csv-import-input"
                            accept=".csv, text/csv"
                            className="hidden"
                            onChange={(e) => handleFileImport(e, tabConfig[activeTab].storeName)}
                        />
                    </div>
                </div>
            </div>
        </div>
      </Card>
    </div>
  );
};

export default DataImportModal;
