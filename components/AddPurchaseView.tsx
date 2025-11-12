import React, { useState, useRef, useEffect } from 'react';
import { Plus, Upload, IndianRupee, Search, QrCode, Info, CheckCircle, XCircle, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Supplier, Product, PurchaseItem } from '../types';
import Card from './Card';
import Button from './Button';
import { Html5Qrcode } from 'html5-qrcode';
import DeleteButton from './DeleteButton';

// More robust CSV line parser that handles quoted fields.
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
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
}> = ({ isOpen, onClose, onAdd, initialId = '', existingProducts, currentPurchaseItems }) => {
    const [newProduct, setNewProduct] = useState({ id: initialId, name: '', purchasePrice: '', salePrice: '', gstPercent: '5', quantity: '' });
    
    useEffect(() => {
        setNewProduct(prev => ({ ...prev, id: initialId }));
    }, [initialId]);

    const handleAddItemManually = () => {
        const { id, name, purchasePrice, salePrice, gstPercent, quantity } = newProduct;
        if (!id || !name || !purchasePrice || !salePrice || !quantity) return alert('All fields are required.');
        
        const trimmedId = id.trim();
        if(currentPurchaseItems.some(item => item.productId.toLowerCase() === trimmedId.toLowerCase())) return alert(`Product with ID "${trimmedId}" is already in this purchase.`);
        if(existingProducts.some(p => p.id.toLowerCase() === trimmedId.toLowerCase())) return alert(`Product with ID "${trimmedId}" already exists in stock. Please select it from the list instead of creating a new one.`);

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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Add New Product to Purchase" className="w-full max-w-md animate-scale-in">
                <div className="space-y-3">
                    <input type="text" placeholder="Product ID (Unique)" value={newProduct.id} onChange={e => setNewProduct({...newProduct, id: e.target.value})} className="w-full p-2 border rounded" autoFocus />
                    <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 border rounded" />
                    <input type="number" placeholder="Quantity" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} className="w-full p-2 border rounded" />
                    <input type="number" placeholder="Purchase Price (per item)" value={newProduct.purchasePrice} onChange={e => setNewProduct({...newProduct, purchasePrice: e.target.value})} className="w-full p-2 border rounded" />
                    <input type="number" placeholder="Sale Price (per item)" value={newProduct.salePrice} onChange={e => setNewProduct({...newProduct, salePrice: e.target.value})} className="w-full p-2 border rounded" />
                    <input type="number" placeholder="GST %" value={newProduct.gstPercent} onChange={e => setNewProduct({...newProduct, gstPercent: e.target.value})} className="w-full p-2 border rounded" />
                    <div className="flex gap-2">
                        <Button onClick={handleAddItemManually} className="w-full">Add to Purchase</Button>
                        <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

// --- Main AddPurchaseView Component ---

interface AddPurchaseViewProps {
    suppliers: Supplier[];
    products: Product[];
    purchaseSupplierId: string;
    setPurchaseSupplierId: (id: string) => void;
    purchaseItems: PurchaseItem[];
    setPurchaseItems: (items: PurchaseItem[]) => void;
    supplierInvoiceId: string;
    setSupplierInvoiceId: (id: string) => void;
    purchasePaymentDetails: any;
    setPurchasePaymentDetails: (details: any) => void;
    onCompletePurchase: () => void;
    onClearForm: () => void;
    onBack: () => void;
}

const AddPurchaseView: React.FC<AddPurchaseViewProps> = (props) => {
    const {
        suppliers, products, purchaseSupplierId, setPurchaseSupplierId,
        purchaseItems, setPurchaseItems, supplierInvoiceId, setSupplierInvoiceId,
        purchasePaymentDetails, setPurchasePaymentDetails, onCompletePurchase, onClearForm, onBack
    } = props;
    
    // Local state for modals and interactions is encapsulated here
    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [scannedProductId, setScannedProductId] = useState('');
    const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
    const csvInputRef = useRef<HTMLInputElement>(null);

    const handleSelectProduct = (product: Product) => {
        const quantityStr = prompt(`Enter quantity for ${product.name}:`, '1');
        if (!quantityStr) return;
        
        const quantity = parseInt(quantityStr, 10);
        if(isNaN(quantity) || quantity <= 0) return alert('Please enter a valid quantity.');

        const existingItemIndex = purchaseItems.findIndex(item => item.productId === product.id);

        if (existingItemIndex > -1) {
            const updatedItems = [...purchaseItems];
            updatedItems[existingItemIndex].quantity += quantity;
            setPurchaseItems(updatedItems);
        } else {
            const newItem: PurchaseItem = {
                productId: product.id,
                productName: product.name,
                price: product.purchasePrice,
                saleValue: product.salePrice,
                gstPercent: product.gstPercent,
                quantity,
            };
            setPurchaseItems([...purchaseItems, newItem]);
        }
        
        setIsSelectingProduct(false);
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
    
    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (purchaseItems.length > 0 && !window.confirm("Importing from CSV will replace all current items. Continue?")) {
            if (csvInputRef.current) csvInputRef.current.value = "";
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

                setPurchaseItems(newItems);
                setImportStatus({ type: 'success', message: `Successfully imported ${newItems.length} items from CSV.`});
            } catch (error) {
                setImportStatus({ type: 'error', message: `Import error: ${(error as Error).message}`});
            } finally {
                 if (csvInputRef.current) csvInputRef.current.value = "";
            }
        };
        reader.readAsText(file);
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

    const totalPurchaseAmount = purchaseItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return (
        <div className="space-y-4">
            <input type="file" accept=".csv" ref={csvInputRef} onChange={handleImportCSV} className="hidden" />
            {isScanning && <QRScannerModal onClose={() => setIsScanning(false)} onScanned={handleProductScanned} />}
            <ProductSearchModal isOpen={isSelectingProduct} onClose={() => setIsSelectingProduct(false)} onSelect={handleSelectProduct} products={products} />
            <NewProductModal
                isOpen={isAddingProduct}
                onClose={() => setIsAddingProduct(false)}
                onAdd={(item) => setPurchaseItems([...purchaseItems, item])}
                initialId={scannedProductId}
                existingProducts={products}
                currentPurchaseItems={purchaseItems}
            />

            <Button onClick={onBack}>&larr; Back to List</Button>
            <Card title="New Purchase Order">
                <div className="space-y-4">
                    <select value={purchaseSupplierId} onChange={e => setPurchaseSupplierId(e.target.value)} className="w-full p-2 border rounded custom-select">
                        <option value="">Select a Supplier</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} - {s.location}</option>)}
                    </select>
                    <input type="text" placeholder="Supplier Invoice ID (Optional)" value={supplierInvoiceId} onChange={e => setSupplierInvoiceId(e.target.value)} className="w-full p-2 border rounded" />
                </div>
            </Card>
            <Card title="Purchase Items">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    <Button onClick={() => setIsAddingProduct(true)}><Plus size={16} className="mr-2"/> Add New Product</Button>
                    <Button onClick={() => setIsSelectingProduct(true)} variant="secondary"><Search size={16} className="mr-2"/> Select Existing</Button>
                    <Button onClick={() => setIsScanning(true)} variant="secondary"><QrCode size={16} className="mr-2"/> Scan Product</Button>
                    <Button onClick={() => csvInputRef.current?.click()} variant="secondary"><Upload size={16} className="mr-2"/> Import from CSV</Button>
                </div>
                <StatusNotification />
                <div className="space-y-2 mt-4">
                    {purchaseItems.map(item => (
                        <div key={item.productId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                                <p className="font-semibold">{item.productName}</p>
                                <p className="text-sm">{item.quantity} x ₹{item.price.toLocaleString('en-IN')}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <p>₹{(item.quantity * item.price).toLocaleString('en-IN')}</p>
                                <DeleteButton variant="remove" onClick={() => setPurchaseItems(purchaseItems.filter(i => i.productId !== item.productId))} />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card title="Billing Summary">
                <div className="p-4 bg-purple-50 rounded-lg text-center">
                    <p className="text-sm font-semibold text-gray-600">Total Amount</p>
                    <p className="text-4xl font-bold text-primary">₹{totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
            </Card>
            <Card title="Payment">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Amount Paid Now</label>
                        <input type="number" placeholder={`Total is ₹${totalPurchaseAmount.toLocaleString('en-IN')}`} value={purchasePaymentDetails.amount} onChange={e => setPurchasePaymentDetails({ ...purchasePaymentDetails, amount: e.target.value })} className="w-full p-2 border-2 border-red-300 rounded-lg shadow-inner focus:ring-red-500 focus:border-red-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Payment Method</label>
                        <select value={purchasePaymentDetails.method} onChange={e => setPurchasePaymentDetails({ ...purchasePaymentDetails, method: e.target.value as any })} className="w-full p-2 border rounded custom-select">
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CHEQUE">Cheque</option>
                        </select>
                    </div>
                    <div>
                         <label className="block text-sm font-medium">Purchase Date</label>
                         <input type="date" value={purchasePaymentDetails.date} onChange={e => setPurchasePaymentDetails({ ...purchasePaymentDetails, date: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Payment Reference (Optional)</label>
                        <input type="text" placeholder="e.g. Cheque No., Txn ID" value={purchasePaymentDetails.reference} onChange={e => setPurchasePaymentDetails({ ...purchasePaymentDetails, reference: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                </div>
            </Card>
            <Button onClick={onCompletePurchase} className="w-full">Complete Purchase</Button>
            <Button onClick={onClearForm} variant="secondary" className="w-full">Clear Form</Button>
        </div>
    );
};

export default React.memo(AddPurchaseView);
