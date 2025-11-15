import React, { useState, useRef, useEffect } from 'react';
import { Plus, Upload, IndianRupee, Search, QrCode, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { Supplier, Product, PurchaseItem, Purchase } from '../types';
import Card from './Card';
import Button from './Button';
import { Html5Qrcode } from 'html5-qrcode';
import DeleteButton from './DeleteButton';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

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

// --- Modals defined outside the main component to prevent re-creation on render ---

const QRScannerModal: React.FC<{ onClose: () => void; onScanned: (text: string) => void }> = ({ onClose, onScanned }) => {
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader-purchase");
        
        const qrCodeSuccessCallback = (decodedText: string) => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().then(() => {
                    onScanned(decodedText);
                }).catch(err => console.error("Error stopping scanner", err));
            }
        };
        const config = { fps: 10, qrbox: { width: 250, height: 250 } };
        html5QrCodeRef.current.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
            .catch(err => alert("Camera permission is required. Please allow and try again."));
        
        return () => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().catch(err => console.log("Failed to stop scanner on cleanup.", err));
            }
        };
    }, [onScanned]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Scan Product" className="w-full max-w-md relative animate-scale-in">
                <button onClick={onClose} className="absolute top-4 right-4 p-2"><X size={20}/></button>
                <div id="qr-reader-purchase" className="w-full mt-4"></div>
            </Card>
        </div>
    );
};

const ProductSearchModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSelect: (product: Product) => void;
    products: Product[];
}> = ({ isOpen, onClose, onSelect, products }) => {
    const [searchTerm, setSearchTerm] = useState('');
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card className="w-full max-w-lg animate-scale-in">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Select Existing Product</h2>
                <button onClick={onClose}><X size={20}/></button>
            </div>
            <input type="text" placeholder="Search products..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg mb-4" autoFocus/>
            <div className="max-h-80 overflow-y-auto space-y-2">
                {products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
                <div key={p.id} onClick={() => onSelect(p)} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-100">
                    <p className="font-semibold">{p.name}</p>
                    <p className="text-sm text-gray-500">Code: {p.id} | Stock: {p.quantity}</p>
                </div>
                ))}
            </div>
            </Card>
        </div>
    );
};

const NewProductModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onAdd: (item: PurchaseItem) => void;
    initialId?: string;
    existingProducts: Product[];
    currentPurchaseItems: PurchaseItem[];
    mode: 'add' | 'edit';
}> = ({ isOpen, onClose, onAdd, initialId = '', existingProducts, currentPurchaseItems, mode }) => {
    const [newProduct, setNewProduct] = useState({ id: initialId, name: '', purchasePrice: '', salePrice: '', gstPercent: '5', quantity: '' });
    
    useEffect(() => {
        setNewProduct(prev => ({ ...prev, id: initialId }));
    }, [initialId]);

    const handleAddItemManually = () => {
        const { id, name, purchasePrice, salePrice, gstPercent, quantity } = newProduct;
        if (!id || !name || !purchasePrice || !salePrice || !quantity) return alert('All fields are required.');
        
        const trimmedId = id.trim();
        if(currentPurchaseItems.some(item => item.productId.toLowerCase() === trimmedId.toLowerCase())) return alert(`Product with ID "${trimmedId}" is already in this purchase.`);
        // In edit mode for a purchase, we don't need to check against existing stock, as we might be adding a new product line to an old invoice.
        if(mode === 'add' && existingProducts.some(p => p.id.toLowerCase() === trimmedId.toLowerCase())) return alert(`Product with ID "${trimmedId}" already exists in stock. Please select it from the list instead of creating a new one.`);

        const item: PurchaseItem = {
            productId: trimmedId,
            productName: name,
            price: parseFloat(purchasePrice),
            saleValue: parseFloat(salePrice),
            gstPercent: parseFloat(gstPercent),
            quantity: parseInt(quantity)
        };
        onAdd(item);
        onClose();
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Add New Product to Purchase" className="w-full max-w-md animate-scale-in">
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product ID (Unique)</label>
                        <input type="text" value={newProduct.id} onChange={e => setNewProduct({...newProduct, id: e.target.value})} className="w-full p-2 border rounded mt-1" autoFocus />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product Name</label>
                        <input type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <input type="number" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Purchase Price (per item)</label>
                        <input type="number" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: e.target.value})} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sale Price (per item)</label>
                        <input type="number" value={newProduct.salePrice} onChange={e => setNewProduct({...newProduct, salePrice: e.target.value})} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">GST %</label>
                        <input type="number" value={newProduct.gstPercent} onChange={e => setNewProduct({...newProduct, gstPercent: e.target.value})} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div className="flex gap-2 pt-2">
                        <Button onClick={handleAddItemManually} className="w-full">Add to Purchase</Button>
                        <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- Main PurchaseForm Component ---

interface PurchaseFormProps {
    mode: 'add' | 'edit';
    initialData?: Purchase | null;
    suppliers: Supplier[];
    products: Product[];
    onSubmit: (purchaseData: Purchase) => void;
    onBack: () => void;
    setIsDirty: (isDirty: boolean) => void;
    dispatch: React.Dispatch<any>;
    showToast: (message: string, type?: 'success' | 'info') => void;
}

const PurchaseForm: React.FC<PurchaseFormProps> = ({ mode, initialData, suppliers, products, onSubmit, onBack, setIsDirty, dispatch, showToast }) => {
    
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [supplierInvoiceId, setSupplierInvoiceId] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(getLocalDateString());
    const [paymentDueDates, setPaymentDueDates] = useState<string[]>([]);

    const [isAddingSupplier, setIsAddingSupplier] = useState(false);
    const [newSupplier, setNewSupplier] = useState({ id: '', name: '', phone: '', location: '', gstNumber: '', reference: '', account1: '', account2: '', upi: '' });

    const isDirtyRef = useRef(false);

    useEffect(() => {
        if (mode === 'edit' && initialData) {
            setSupplierId(initialData.supplierId);
            setItems(initialData.items.map(item => ({ ...item }))); // Deep copy
            setSupplierInvoiceId(initialData.supplierInvoiceId || '');
            setPurchaseDate(getLocalDateString(new Date(initialData.date)));
            setPaymentDueDates(initialData.paymentDueDates || []);
        }
    }, [mode, initialData]);

    useEffect(() => {
        const currentlyDirty = !!supplierId || items.length > 0;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [supplierId, items, setIsDirty]);

    const resetForm = () => {
        setSupplierId('');
        setItems([]);
        setSupplierInvoiceId('');
        setPurchaseDate(getLocalDateString());
        setPaymentDueDates([]);
    };

    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedProductId, setScannedProductId] = useState('');
    const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);

    const handleSelectProduct = (product: Product) => {
        const quantityStr = prompt(`Enter quantity for ${product.name}:`, '1');
        if (!quantityStr) return;
        
        const quantity = parseInt(quantityStr, 10);
        if(isNaN(quantity) || quantity <= 0) return alert('Please enter a valid quantity.');

        const existingItemIndex = items.findIndex(item => item.productId === product.id);

        if (existingItemIndex > -1) {
            const updatedItems = [...items];
            updatedItems[existingItemIndex].quantity += quantity;
            setItems(updatedItems);
        } else {
            const newItem: PurchaseItem = {
                productId: product.id,
                productName: product.name,
                price: product.purchasePrice,
                saleValue: product.salePrice,
                gstPercent: product.gstPercent,
                quantity,
            };
            setItems([...items, newItem]);
        }
        
        setIsSelectingProduct(false);
    };

    const handleItemChange = (productId: string, field: keyof PurchaseItem, value: string) => {
        const numericFields = ['quantity', 'price', 'saleValue', 'gstPercent'];
        const isNumeric = numericFields.includes(field as string);

        setItems(prevItems => prevItems.map(item => {
            if (item.productId === productId) {
                return { ...item, [field]: isNumeric ? parseFloat(value) || 0 : value };
            }
            return item;
        }));
    };

    const handleProductScanned = (decodedText: string) => {
        setIsScanning(false);
        const product = products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
        } else {
            alert("Product not found. You can add it as a new product.");
            setScannedProductId(decodedText);
            setIsAddingProduct(true);
        }
    };
    
    const handleDownloadTemplate = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const headers = ['id', 'name', 'quantity', 'purchaseprice', 'saleprice', 'gstpercent'];
        const exampleRow1 = ['PROD-UNIQUE-1', 'New Saree Model A', '10', '1500', '3000', '5'];
        const exampleRow2 = ['PROD-UNIQUE-2', 'New Saree Model B', '25', '800', '1600', '12'];
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), exampleRow1.join(','), exampleRow2.join(',')].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "purchase-import-template.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (items.length > 0 && !window.confirm("Importing from CSV will replace all current items. Continue?")) {
            if (event.target) (event.target as HTMLInputElement).value = '';
            return;
        }

        const reader = new FileReader();
        setImportStatus({ type: 'info', message: 'Reading file...' });

        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                setImportStatus({ type: 'error', message: 'Could not read the file content.' });
                return;
            }

            try {
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');

                const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
                const requiredHeaders = ['id', 'name', 'quantity', 'purchaseprice', 'saleprice', 'gstpercent'];
                if (requiredHeaders.some(rh => !headers.includes(rh))) {
                    throw new Error(`CSV is missing required columns. Header must contain: id, name, quantity, purchaseprice, saleprice, gstpercent.`);
                }
                
                const newItems: PurchaseItem[] = [];
                const existingProductIds = new Set(products.map(p => p.id.toLowerCase()));

                for (let i = 1; i < lines.length; i++) {
                    const values = parseCsvLine(lines[i]);
                    const row = headers.reduce((obj, header, index) => ({...obj, [header]: values[index]?.trim() || ''}), {} as any);
                    
                    const id = row.id?.trim();
                    if (!id) continue;
                    if (existingProductIds.has(id.toLowerCase()) || newItems.some(item => item.productId.toLowerCase() === id.toLowerCase())) {
                        throw new Error(`Product ID "${id}" from CSV (row ${i+1}) already exists in stock or is duplicated in the CSV.`);
                    }

                    const quantity = parseInt(row.quantity, 10);
                    if (!row.name || isNaN(quantity) || isNaN(parseFloat(row.purchaseprice)) || isNaN(parseFloat(row.saleprice)) || isNaN(parseFloat(row.gstpercent)) || quantity <= 0) continue;

                    newItems.push({
                        productId: id, productName: row.name, quantity,
                        price: parseFloat(row.purchaseprice), saleValue: parseFloat(row.saleprice), gstPercent: parseFloat(row.gstpercent),
                    });
                }

                setItems(newItems);
                setImportStatus({ type: 'success', message: `Successfully imported ${newItems.length} items from CSV.`});
            } catch (error) {
                setImportStatus({ type: 'error', message: `Import error: ${(error as Error).message}`});
            } finally {
                 if (event.target) (event.target as HTMLInputElement).value = '';
            }
        };
        reader.readAsText(file);
    };
    
    const handleAddSupplier = () => {
        const trimmedId = newSupplier.id.trim();
        if (!trimmedId) {
            alert('Supplier ID is required.');
            return;
        }
        if (!newSupplier.name || !newSupplier.phone || !newSupplier.location) {
            alert('Please fill all required fields (Name, Phone, Location).');
            return;
        }

        const finalId = `SUPP-${trimmedId}`;
        const isIdTaken = suppliers.some(c => c.id.toLowerCase() === finalId.toLowerCase());
        
        if (isIdTaken) {
            alert(`Supplier ID "${finalId}" is already taken. Please choose another one.`);
            return;
        }

        const supplierToAdd: Supplier = { ...newSupplier, id: finalId };
        dispatch({ type: 'ADD_SUPPLIER', payload: supplierToAdd });
        showToast("Supplier added successfully!");
        
        setNewSupplier({ id: '', name: '', phone: '', location: '', gstNumber: '', reference: '', account1: '', account2: '', upi: '' });
        setIsAddingSupplier(false);
        setSupplierId(finalId); // Automatically select the newly added supplier
    };
    
    const handleSubmit = () => {
        if (!supplierId || items.length === 0) {
            return alert("Please select a supplier and add at least one item.");
        }
        
        const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        
        const now = new Date();
        const purchaseId = mode === 'edit' && initialData ? initialData.id : `PUR-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

        const finalPurchaseData: Purchase = {
            id: purchaseId,
            supplierId: supplierId,
            items: items,
            totalAmount: totalAmount,
            date: new Date(purchaseDate).toISOString(),
            supplierInvoiceId: supplierInvoiceId.trim() || undefined,
            payments: (mode === 'edit' && initialData) ? initialData.payments : [],
            paymentDueDates: paymentDueDates.filter(date => date), // Filter out empty strings
        };
        
        onSubmit(finalPurchaseData);
    };

    const StatusNotification = () => {
        if (!importStatus) return null;
        const variants = {
            info: 'bg-blue-100 text-blue-800', success: 'bg-green-100 text-green-800', error: 'bg-red-100 text-red-800',
        };
        const icons = {
            info: <Info className="w-5 h-5 mr-3 flex-shrink-0" />, success: <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />, error: <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
        };
        return (
            <div className={`p-3 rounded-md mt-4 text-sm flex justify-between items-start ${variants[importStatus.type]}`}>
                <div className="flex items-start">{icons[importStatus.type]}<span>{importStatus.message}</span></div>
                <button onClick={() => setImportStatus(null)} className="font-bold text-lg leading-none ml-4">&times;</button>
            </div>
        );
    };
    
    const handleDueDateChange = (index: number, value: string) => {
        const newDates = [...paymentDueDates];
        newDates[index] = value;
        setPaymentDueDates(newDates);
    };

    const addDueDate = () => {
        setPaymentDueDates([...paymentDueDates, '']);
    };

    const removeDueDate = (index: number) => {
        setPaymentDueDates(paymentDueDates.filter((_, i) => i !== index));
    };

    const totalPurchaseAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalGstAmount = items.reduce((sum, item) => {
        const itemTotal = item.price * item.quantity;
        const itemGst = itemTotal - (itemTotal / (1 + (item.gstPercent / 100)));
        return sum + itemGst;
    }, 0);
    const subTotal = totalPurchaseAmount - totalGstAmount;
    const title = mode === 'add' ? 'New Purchase Order' : 'Edit Purchase Order';

    return (
        <div className="space-y-4">
             {isAddingSupplier && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                    <Card title="Add New Supplier" className="w-full max-w-md animate-scale-in">
                        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                             <div>
                                <label className="block text-sm font-medium">Supplier ID</label>
                                <div className="flex items-center mt-1">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-gray-50 text-gray-500 text-sm">SUPP-</span>
                                    <input type="text" placeholder="Enter unique ID" value={newSupplier.id} onChange={e => setNewSupplier({ ...newSupplier, id: e.target.value })} className="w-full p-2 border rounded-r-md" autoFocus />
                                </div>
                            </div>
                            <input type="text" placeholder="Name*" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full p-2 border rounded" />
                            <input type="text" placeholder="Phone*" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full p-2 border rounded" />
                            <input type="text" placeholder="Location*" value={newSupplier.location} onChange={e => setNewSupplier({ ...newSupplier, location: e.target.value })} className="w-full p-2 border rounded" />
                            <input type="text" placeholder="GST Number (Optional)" value={newSupplier.gstNumber} onChange={e => setNewSupplier({ ...newSupplier, gstNumber: e.target.value })} className="w-full p-2 border rounded" />
                            <input type="text" placeholder="Reference (Optional)" value={newSupplier.reference} onChange={e => setNewSupplier({ ...newSupplier, reference: e.target.value })} className="w-full p-2 border rounded" />
                            <input type="text" placeholder="Bank Account 1 (Optional)" value={newSupplier.account1} onChange={e => setNewSupplier({ ...newSupplier, account1: e.target.value })} className="w-full p-2 border rounded" />
                            <input type="text" placeholder="Bank Account 2 (Optional)" value={newSupplier.account2} onChange={e => setNewSupplier({ ...newSupplier, account2: e.target.value })} className="w-full p-2 border rounded" />
                            <input type="text" placeholder="UPI ID (Optional)" value={newSupplier.upi} onChange={e => setNewSupplier({ ...newSupplier, upi: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                         <div className="flex gap-2 pt-4 border-t mt-4">
                            <Button onClick={handleAddSupplier} className="w-full">Save Supplier</Button>
                            <Button onClick={() => setIsAddingSupplier(false)} variant="secondary" className="w-full">Cancel</Button>
                        </div>
                    </Card>
                </div>
            )}
            <input 
                type="file" 
                accept=".csv, text/csv" 
                id="csv-purchase-import"
                onChange={handleImportCSV} 
                className="hidden"
                onClick={(event) => { (event.target as HTMLInputElement).value = '' }}
            />
            {isScanning && <QRScannerModal onClose={() => setIsScanning(false)} onScanned={handleProductScanned} />}
            <ProductSearchModal isOpen={isSelectingProduct} onClose={() => setIsSelectingProduct(false)} onSelect={handleSelectProduct} products={products} />
            <NewProductModal
                isOpen={isAddingProduct}
                onClose={() => setIsAddingProduct(false)}
                onAdd={(item) => setItems([...items, item])}
                initialId={scannedProductId}
                existingProducts={products}
                currentPurchaseItems={items}
                mode={mode}
            />

            <Button onClick={onBack} variant="secondary" className="bg-purple-200 text-primary hover:bg-purple-300">&larr; Back</Button>
            <Card title={title}>
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Supplier</label>
                        <div className="flex gap-2 items-center mt-1">
                            <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full p-2 border rounded custom-select" disabled={mode === 'edit'}>
                                <option value="">Select a Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} - {s.location}</option>)}
                            </select>
                             {mode === 'add' && (
                                <Button onClick={() => setIsAddingSupplier(true)} variant="secondary" className="flex-shrink-0">
                                    <Plus size={16}/> New
                                </Button>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Purchase Date</label>
                        <input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="w-full p-2 border rounded mt-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Supplier Invoice ID (Optional)</label>
                        <input type="text" placeholder="Supplier Invoice ID (Optional)" value={supplierInvoiceId} onChange={e => setSupplierInvoiceId(e.target.value)} className="w-full p-2 border rounded mt-1" />
                    </div>
                </div>
            </Card>
            <Card title="Purchase Items">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    <Button onClick={() => setIsAddingProduct(true)}><Plus size={16} className="mr-2"/> Add New Product</Button>
                    <Button onClick={() => setIsSelectingProduct(true)} variant="secondary"><Search size={16} className="mr-2"/> Select Existing</Button>
                    <Button onClick={() => setIsScanning(true)} variant="secondary"><QrCode size={16} className="mr-2"/> Scan Product</Button>
                    <label htmlFor="csv-purchase-import" className="px-4 py-2 rounded-md font-semibold text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98] bg-secondary hover:bg-purple-600 focus:ring-secondary cursor-pointer">
                        <Upload size={16} className="mr-2"/> Import from CSV
                    </label>
                </div>
                <div className="text-center text-xs text-gray-500 -mt-2 mb-4">
                    <span>CSV format issues? </span>
                    <a href="#" onClick={handleDownloadTemplate} className="font-semibold text-primary underline hover:text-purple-800">
                        Download sample template
                    </a>
                </div>
                <StatusNotification />
                <div className="space-y-2 mt-4">
                    {items.map(item => (
                        <div key={item.productId} className="p-3 bg-gray-50 rounded-lg space-y-2 border">
                            <div className="flex justify-between items-start">
                                <input 
                                    type="text" 
                                    value={item.productName}
                                    onChange={e => handleItemChange(item.productId, 'productName', e.target.value)}
                                    className="font-semibold bg-transparent border-b w-full"
                                />
                                <DeleteButton variant="remove" onClick={() => setItems(items.filter(i => i.productId !== item.productId))} />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Qty</label>
                                    <input type="number" value={item.quantity || ''} onChange={e => handleItemChange(item.productId, 'quantity', e.target.value)} className="w-full p-1 border rounded" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Purchase Price</label>
                                    <input type="number" value={item.price || ''} onChange={e => handleItemChange(item.productId, 'price', e.target.value)} className="w-full p-1 border rounded" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">Sale Price</label>
                                    <input type="number" value={item.saleValue || ''} onChange={e => handleItemChange(item.productId, 'saleValue', e.target.value)} className="w-full p-1 border rounded" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500">GST %</label>
                                    <input type="number" value={item.gstPercent || ''} onChange={e => handleItemChange(item.productId, 'gstPercent', e.target.value)} className="w-full p-1 border rounded" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card title="Payment Schedule">
                <div className="space-y-2">
                    {paymentDueDates.map((date, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <input 
                                type="date" 
                                value={date} 
                                onChange={e => handleDueDateChange(index, e.target.value)} 
                                className="w-full p-2 border rounded" 
                            />
                            <DeleteButton variant="remove" onClick={() => removeDueDate(index)} />
                        </div>
                    ))}
                </div>
                <Button onClick={addDueDate} variant="secondary" className="w-full mt-3">
                    <Plus size={16} className="mr-2"/> Add Due Date
                </Button>
            </Card>
            <Card title="Transaction Details">
                 <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal (excl. GST):</span>
                        <span>₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>GST Amount:</span>
                        <span>+ ₹{totalGstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg text-center border-t">
                    <p className="text-sm font-semibold text-gray-600">Grand Total</p>
                    <p className="text-4xl font-bold text-primary">₹{totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
            </Card>
            
            <Button onClick={handleSubmit} className="w-full">{mode === 'add' ? 'Complete Purchase' : 'Update Purchase'}</Button>
            <Button onClick={resetForm} variant="secondary" className="w-full">Clear Form</Button>
        </div>
    );
};

export default React.memo(PurchaseForm);