import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, IndianRupee, Edit, Save, X, Trash2, Search, QrCode, Package, Info, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Supplier, Product, Purchase, PurchaseItem, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { Html5Qrcode } from 'html5-qrcode';
import ConfirmationModal from '../components/ConfirmationModal';
import DeleteButton from '../components/DeleteButton';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// More robust CSV line parser that handles quoted fields.
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quote ""
        current += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Unquoted comma is a delimiter
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};


interface PurchasesPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const PurchasesPage: React.FC<PurchasesPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [view, setView] = useState<'list' | 'add_supplier' | 'add_purchase'>('list');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);


    // State for 'add_supplier' view
    const [newSupplier, setNewSupplier] = useState({ id: '', name: '', phone: '', location: '', gstNumber: '', reference: '', account1: '', account2: '', upi: '' });

    // State for 'add_purchase' view
    const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    const [supplierInvoiceId, setSupplierInvoiceId] = useState('');
    const [purchasePaymentDetails, setPurchasePaymentDetails] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: getLocalDateString(),
        reference: '',
    });
    
    // State for modals and interactions
    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');

    // State for new product form in modal
    const [newProduct, setNewProduct] = useState({ id: '', name: '', purchasePrice: '', salePrice: '', gstPercent: '5', quantity: '' });

    // State for supplier detail view
    const [isEditing, setIsEditing] = useState(false);
    const [editedSupplier, setEditedSupplier] = useState<Supplier | null>(null);
    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, purchaseId: string | null }>({ isOpen: false, purchaseId: null });
    const [paymentDetails, setPaymentDetails] = useState({ amount: '', method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE', date: getLocalDateString(), reference: '' });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, purchaseIdToDelete: string | null }>({ isOpen: false, purchaseIdToDelete: null });
    const isDirtyRef = useRef(false);

    useEffect(() => {
        if (state.selection && state.selection.page === 'PURCHASES') {
            const supplierToSelect = state.suppliers.find(s => s.id === state.selection.id);
            if (supplierToSelect) {
                setSelectedSupplier(supplierToSelect);
            }
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, state.suppliers, dispatch]);
    
    useEffect(() => {
        const addSupplierDirty = view === 'add_supplier' && !!(newSupplier.id || newSupplier.name || newSupplier.phone || newSupplier.location);
        const addPurchaseDirty = view === 'add_purchase' && !!(purchaseSupplierId || purchaseItems.length > 0 || purchasePaymentDetails.amount);
        const detailViewDirty = !!(selectedSupplier && isEditing);
        const currentlyDirty = addSupplierDirty || addPurchaseDirty || detailViewDirty;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [view, newSupplier, purchaseSupplierId, purchaseItems, purchasePaymentDetails.amount, selectedSupplier, isEditing, setIsDirty]);

    // On unmount, we must always clean up.
    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);
    
    useEffect(() => {
        if (selectedSupplier) {
            const currentSupplier = state.suppliers.find(s => s.id === selectedSupplier.id);
            setSelectedSupplier(currentSupplier || null);
            setEditedSupplier(currentSupplier || null);
        } else {
            setEditedSupplier(null);
        }
        setIsEditing(false);
    }, [selectedSupplier, state.suppliers, state.purchases]);
    
    const resetAddPurchaseForm = () => {
        setPurchaseSupplierId('');
        setPurchaseItems([]);
        setSupplierInvoiceId('');
        setPurchasePaymentDetails({
            amount: '',
            method: 'CASH',
            date: getLocalDateString(),
            reference: ''
        });
        setImportStatus(null);
    };

    const handleAddSupplier = () => {
        const trimmedId = newSupplier.id.trim();
        if (!trimmedId) return alert('Supplier ID is required.');
        if (!newSupplier.name || !newSupplier.phone || !newSupplier.location) return alert('Please fill Name, Phone, and Location.');

        const finalId = `SUPP-${trimmedId}`;
        if (state.suppliers.some(s => s.id.toLowerCase() === finalId.toLowerCase())) {
            return alert(`Supplier ID "${finalId}" is already taken.`);
        }

        const supplierToAdd: Supplier = { ...newSupplier, id: finalId };
        dispatch({ type: 'ADD_SUPPLIER', payload: supplierToAdd });
        showToast("Supplier added successfully!");
        setNewSupplier({ id: '', name: '', phone: '', location: '', gstNumber: '', reference: '', account1: '', account2: '', upi: '' });
        setView('list');
    };
    
    const handleUpdateSupplier = () => {
        if (editedSupplier) {
            if (window.confirm('Save changes to this supplier?')) {
                dispatch({ type: 'UPDATE_SUPPLIER', payload: editedSupplier });
                showToast("Supplier details updated.");
                setIsEditing(false);
            }
        }
    };
    
    const handleAddPayment = () => {
        const purchase = state.purchases.find(p => p.id === paymentModalState.purchaseId);
        if (!purchase || !paymentDetails.amount) return alert("Please enter a valid amount.");
        
        const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = purchase.totalAmount - amountPaid;
        const newPaymentAmount = parseFloat(paymentDetails.amount);

        if(newPaymentAmount > dueAmount + 0.01) {
            return alert(`Payment exceeds due amount of ₹${dueAmount.toLocaleString('en-IN')}.`);
        }

        const payment: Payment = {
            id: `PAY-P-${Date.now()}`,
            amount: newPaymentAmount,
            method: paymentDetails.method,
            date: new Date(paymentDetails.date).toISOString(),
            reference: paymentDetails.reference.trim() || undefined,
        };

        dispatch({ type: 'ADD_PAYMENT_TO_PURCHASE', payload: { purchaseId: purchase.id, payment } });
        showToast("Payment added successfully.");
        setPaymentModalState({ isOpen: false, purchaseId: null });
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '' });
    };

    const handleDeletePurchase = (purchaseId: string) => {
        setConfirmModalState({ isOpen: true, purchaseIdToDelete: purchaseId });
    };

    const confirmDeletePurchase = () => {
        if (confirmModalState.purchaseIdToDelete) {
            dispatch({ type: 'DELETE_PURCHASE', payload: confirmModalState.purchaseIdToDelete });
            showToast('Purchase deleted successfully. Stock has been adjusted.');
            setConfirmModalState({ isOpen: false, purchaseIdToDelete: null });
        }
    };
    
    const handleAddItemManually = () => {
        const { id, name, purchasePrice, salePrice, gstPercent, quantity } = newProduct;
        if (!id || !name || !purchasePrice || !salePrice || !quantity) return alert('All fields are required.');
        
        const trimmedId = id.trim();
        const existingInCart = purchaseItems.some(item => item.productId.toLowerCase() === trimmedId.toLowerCase());
        const existingInDb = state.products.some(p => p.id.toLowerCase() === trimmedId.toLowerCase());
        if(existingInCart) return alert(`Product with ID "${trimmedId}" is already in this purchase.`);
        if(existingInDb) return alert(`Product with ID "${trimmedId}" already exists in stock. Please select it from the list instead of creating a new one.`);

        const item: PurchaseItem = {
            productId: trimmedId,
            productName: name,
            price: parseFloat(purchasePrice),
            saleValue: parseFloat(salePrice),
            gstPercent: parseFloat(gstPercent),
            quantity: parseInt(quantity)
        };
        setPurchaseItems([...purchaseItems, item]);
        setIsAddingProduct(false);
        setNewProduct({ id: '', name: '', purchasePrice: '', salePrice: '', gstPercent: '5', quantity: '' });
    };
    
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
        setProductSearchTerm('');
    };

    const handleProductScanned = (decodedText: string) => {
        const product = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
        } else {
            alert("Product not found. You can add it as a new product.");
            setIsAddingProduct(true);
            setNewProduct(prev => ({ ...prev, id: decodedText }));
        }
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (purchaseItems.length > 0) {
            if (!window.confirm("Importing from CSV will replace all items currently in the purchase. Are you sure you want to continue?")) {
                if (csvInputRef.current) csvInputRef.current.value = "";
                return;
            }
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
                if (lines.length < 2) {
                    throw new Error('CSV file must have a header row and at least one data row.');
                }

                const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
                const requiredHeaders = ['id', 'name', 'quantity', 'purchaseprice', 'saleprice', 'gstpercent'];
                const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));

                if (missingHeaders.length > 0) {
                     throw new Error(`CSV is missing required columns: ${missingHeaders.join(', ')}. Header must contain: id, name, quantity, purchaseprice, saleprice, gstpercent.`);
                }
                
                const newItems: PurchaseItem[] = [];
                const existingProductIds = new Set([...state.products.map(p => p.id.toLowerCase()), ...newItems.map(i => i.productId.toLowerCase())]);

                for (let i = 1; i < lines.length; i++) {
                    const values = parseCsvLine(lines[i]);
                    const row = headers.reduce((obj, header, index) => {
                        obj[header] = values[index]?.trim() || '';
                        return obj;
                    }, {} as any);
                    
                    const id = row.id?.trim();
                    if (!id) {
                        console.warn(`Skipping row ${i+1}: missing 'id'`);
                        continue;
                    }

                    if (existingProductIds.has(id.toLowerCase())) {
                        throw new Error(`Product ID "${id}" from CSV (row ${i+1}) already exists in your stock or is duplicated in the CSV. Please use 'Select Existing Product' for existing items or ensure IDs in the CSV are unique for new products.`);
                    }

                    const quantity = parseInt(row.quantity, 10);
                    const purchasePrice = parseFloat(row.purchaseprice);
                    const salePrice = parseFloat(row.saleprice);
                    const gstPercent = parseFloat(row.gstpercent);

                    if (!row.name || isNaN(quantity) || isNaN(purchasePrice) || isNaN(salePrice) || isNaN(gstPercent) || quantity <= 0) {
                        console.warn(`Skipping row ${i+1} due to invalid or missing data.`);
                        continue;
                    }

                    newItems.push({
                        productId: id,
                        productName: row.name,
                        quantity,
                        price: purchasePrice,
                        saleValue: salePrice,
                        gstPercent,
                    });
                    existingProductIds.add(id.toLowerCase());
                }

                setPurchaseItems(newItems);
                setImportStatus({ type: 'success', message: `Successfully imported ${newItems.length} items from CSV.`});

            } catch (error) {
                console.error("CSV Import Error:", error);
                setImportStatus({ type: 'error', message: `An error occurred during import: ${(error as Error).message}`});
            } finally {
                 if (csvInputRef.current) csvInputRef.current.value = "";
            }
        };

        reader.readAsText(file);
    };
    
    const totalPurchaseAmount = purchaseItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleCompletePurchase = () => {
        if (!purchaseSupplierId || purchaseItems.length === 0) {
            return alert("Please select a supplier and add at least one item.");
        }
        
        const paidAmount = parseFloat(purchasePaymentDetails.amount) || 0;
        if(paidAmount > totalPurchaseAmount + 0.01) {
            return alert("Paid amount cannot be greater than the total amount.");
        }
        
        const now = new Date();
        const purchaseId = `PUR-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

        const payments: Payment[] = paidAmount > 0 ? [{
            id: `PAY-P-${Date.now()}`,
            amount: paidAmount,
            method: purchasePaymentDetails.method,
            date: new Date(purchasePaymentDetails.date).toISOString(),
            reference: purchasePaymentDetails.reference.trim() || undefined,
        }] : [];
        
        const newPurchase: Purchase = {
            id: purchaseId,
            supplierId: purchaseSupplierId,
            items: purchaseItems,
            totalAmount: totalPurchaseAmount,
            date: now.toISOString(),
            supplierInvoiceId: supplierInvoiceId.trim() || undefined,
            payments
        };

        dispatch({ type: 'ADD_PURCHASE', payload: newPurchase });
        
        purchaseItems.forEach(item => {
            dispatch({
                type: 'ADD_PRODUCT',
                payload: {
                    id: item.productId,
                    name: item.productName,
                    quantity: item.quantity,
                    purchasePrice: item.price,
                    salePrice: item.saleValue,
                    gstPercent: item.gstPercent,
                }
            });
        });

        showToast("Purchase recorded successfully! Inventory updated.");
        resetAddPurchaseForm();
        setView('list');
    };
    
    const QRScannerModal: React.FC = () => {
        const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

        useEffect(() => {
            html5QrCodeRef.current = new Html5Qrcode("qr-reader-purchase");
            
            const qrCodeSuccessCallback = (decodedText: string) => {
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().then(() => {
                        setIsScanning(false);
                        handleProductScanned(decodedText);
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
        }, []);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                <Card title="Scan Product" className="w-full max-w-md relative animate-scale-in">
                    <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 p-2"><X size={20}/></button>
                    <div id="qr-reader-purchase" className="w-full mt-4"></div>
                </Card>
            </div>
        );
    };

    const ProductSearchModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
        <Card className="w-full max-w-lg animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Select Existing Product</h2>
            <button onClick={() => setIsSelectingProduct(false)}><X size={20}/></button>
          </div>
          <input type="text" placeholder="Search products..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg mb-4" autoFocus/>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {state.products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
              <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-100">
                <p className="font-semibold">{p.name}</p>
                <p className="text-sm text-gray-500">Code: {p.id} | Stock: {p.quantity}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
    
    const NewProductModal = () => (
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
                    <Button onClick={() => setIsAddingProduct(false)} variant="secondary" className="w-full">Cancel</Button>
                </div>
            </div>
        </Card>
      </div>
    );

    const PaymentModal = () => {
        const purchase = state.purchases.find(p => p.id === paymentModalState.purchaseId);
        if (!paymentModalState.isOpen || !purchase) return null;
        
        const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = purchase.totalAmount - amountPaid;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                <Card title="Add Payment" className="w-full max-w-sm animate-scale-in">
                    <div className="space-y-4">
                        <p>Invoice Total: <span className="font-bold">₹{purchase.totalAmount.toLocaleString('en-IN')}</span></p>
                        <p>Amount Due: <span className="font-bold text-red-600">₹{dueAmount.toLocaleString('en-IN')}</span></p>
                        <input type="number" placeholder="Enter amount" value={paymentDetails.amount} onChange={e => setPaymentDetails({ ...paymentDetails, amount: e.target.value })} className="w-full p-2 border rounded" autoFocus/>
                        <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any })} className="w-full p-2 border rounded custom-select">
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CHEQUE">Cheque</option>
                        </select>
                         <input type="date" value={paymentDetails.date} onChange={e => setPaymentDetails({ ...paymentDetails, date: e.target.value })} className="w-full p-2 border rounded" />
                         <input 
                            type="text"
                            placeholder="Payment Reference (Optional)"
                            value={paymentDetails.reference}
                            onChange={e => setPaymentDetails({ ...paymentDetails, reference: e.target.value })}
                            className="w-full p-2 border rounded"
                        />
                        <div className="flex gap-2">
                           <Button onClick={handleAddPayment} className="w-full">Save Payment</Button>
                           <Button onClick={() => setPaymentModalState({isOpen: false, purchaseId: null})} variant="secondary" className="w-full">Cancel</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    };
    
    if (selectedSupplier) {
        const supplierPurchases = state.purchases.filter(p => p.supplierId === selectedSupplier.id);
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (editedSupplier) {
                setEditedSupplier({ ...editedSupplier, [e.target.name]: e.target.value });
            }
        };

        return (
            <div className="space-y-4">
                <ConfirmationModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({isOpen: false, purchaseIdToDelete: null})} onConfirm={confirmDeletePurchase} title="Confirm Purchase Deletion">
                    Are you sure you want to delete this purchase? This will remove the items from your stock. This action cannot be undone.
                </ConfirmationModal>
                {paymentModalState.isOpen && <PaymentModal />}
                <Button onClick={() => setSelectedSupplier(null)}>&larr; Back to Suppliers</Button>
                <Card>
                     <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-primary">Supplier Details: {selectedSupplier.name}</h2>
                        {isEditing ? (
                            <div className="flex gap-2 items-center">
                                <Button onClick={handleUpdateSupplier} className="h-9 px-3"><Save size={16} /> Save</Button>
                                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100"><X size={20}/></button>
                            </div>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit</Button>
                        )}
                    </div>
                    {isEditing && editedSupplier ? (
                        <div className="space-y-3">
                            <div><label className="text-sm font-medium">Name</label><input type="text" name="name" value={editedSupplier.name} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Phone</label><input type="text" name="phone" value={editedSupplier.phone} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Location</label><input type="text" name="location" value={editedSupplier.location} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">GST Number</label><input type="text" name="gstNumber" value={editedSupplier.gstNumber || ''} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                        </div>
                    ) : (
                        <div className="space-y-1 text-gray-700">
                             <p><strong>ID:</strong> {selectedSupplier.id}</p>
                            <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
                            <p><strong>Location:</strong> {selectedSupplier.location}</p>
                            {selectedSupplier.gstNumber && <p><strong>GSTIN:</strong> {selectedSupplier.gstNumber}</p>}
                        </div>
                    )}
                </Card>
                <Card title="Purchase History">
                    {supplierPurchases.length > 0 ? (
                        <div className="space-y-4">
                            {supplierPurchases.slice().reverse().map(purchase => {
                                const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + p.amount, 0);
                                const dueAmount = purchase.totalAmount - amountPaid;
                                const isPaid = dueAmount <= 0.01;

                                return (
                                <div key={purchase.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-grow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-semibold">{new Date(purchase.date).toLocaleString()}</p>
                                                <p className="text-xs text-gray-500">Internal ID: {purchase.id}</p>
                                                {purchase.supplierInvoiceId && <p className="text-xs text-gray-500">Supplier Invoice: {purchase.supplierInvoiceId}</p>}
                                                <p className={`text-sm font-bold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>{isPaid ? 'Paid' : `Due: ₹${dueAmount.toLocaleString('en-IN')}`}</p>
                                            </div>
                                            <p className="font-bold text-lg text-primary">₹{purchase.totalAmount.toLocaleString('en-IN')}</p>
                                        </div>
                                      </div>
                                      <DeleteButton variant="delete" onClick={() => handleDeletePurchase(purchase.id)} className="ml-4" />
                                    </div>
                                    <div className="pl-4 mt-2 border-l-2 border-purple-200 space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-sm">Items:</h4>
                                            <ul className="list-disc list-inside text-sm">
                                                {purchase.items.map((item, index) => <li key={index}>{item.productName} (x{item.quantity}) @ ₹{item.price.toLocaleString('en-IN')}</li>)}
                                            </ul>
                                        </div>
                                        {(purchase.payments || []).length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-sm">Payments:</h4>
                                                <ul className="list-disc list-inside text-sm">
                                                    {(purchase.payments || []).map(p => (
                                                      <li key={p.id}>
                                                        ₹{p.amount.toLocaleString('en-IN')} via {p.method} on {new Date(p.date).toLocaleDateString()}
                                                        {p.reference && <span className="text-xs text-gray-500 block">Ref: {p.reference}</span>}
                                                      </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {!isPaid && <Button onClick={() => setPaymentModalState({ isOpen: true, purchaseId: purchase.id })}><Plus size={16}/> Add Payment</Button>}
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : <p className="text-gray-500">No purchases recorded for this supplier.</p>}
                </Card>
            </div>
        );
    }
    
    if (view === 'add_supplier') {
        return (
            <div className="space-y-4">
                 <Button onClick={() => setView('list')}>&larr; Back to List</Button>
                 <Card title="Add New Supplier">
                     <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Supplier ID</label>
                            <div className="flex items-center mt-1">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-gray-50 text-gray-500 text-sm">SUPP-</span>
                                <input type="text" placeholder="Enter unique ID" value={newSupplier.id} onChange={e => setNewSupplier({ ...newSupplier, id: e.target.value })} className="w-full p-2 border rounded-r-md" autoFocus />
                            </div>
                        </div>
                        <input type="text" placeholder="Name" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Phone" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Location" value={newSupplier.location} onChange={e => setNewSupplier({ ...newSupplier, location: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="GST Number (Optional)" value={newSupplier.gstNumber} onChange={e => setNewSupplier({ ...newSupplier, gstNumber: e.target.value })} className="w-full p-2 border rounded" />
                        <Button onClick={handleAddSupplier} className="w-full">Save Supplier</Button>
                     </div>
                 </Card>
            </div>
        );
    }
    
    if (view === 'add_purchase') {
        const StatusNotification = () => {
            if (!importStatus) return null;
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
                <div className={`p-3 rounded-md mt-4 text-sm flex justify-between items-start ${variants[importStatus.type]}`}>
                    <div className="flex items-start">
                        {icons[importStatus.type]}
                        <span>{importStatus.message}</span>
                    </div>
                    <button onClick={() => setImportStatus(null)} className="font-bold text-lg leading-none ml-4">&times;</button>
                </div>
            );
        };

        return (
            <div className="space-y-4">
                 <input type="file" accept=".csv" ref={csvInputRef} onChange={handleImportCSV} className="hidden" />
                 {isScanning && <QRScannerModal />}
                 {isSelectingProduct && <ProductSearchModal />}
                 {isAddingProduct && <NewProductModal />}
                 <Button onClick={() => setView('list')}>&larr; Back to List</Button>
                 <Card title="New Purchase Order">
                    <div className="space-y-4">
                        <select value={purchaseSupplierId} onChange={e => setPurchaseSupplierId(e.target.value)} className="w-full p-2 border rounded custom-select">
                            <option value="">Select a Supplier</option>
                            {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name} - {s.location}</option>)}
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
                 <Button onClick={handleCompletePurchase} className="w-full">Complete Purchase</Button>
                 <Button onClick={resetAddPurchaseForm} variant="secondary" className="w-full">Clear Form</Button>
            </div>
        );
    }

    // Default 'list' view
    const filteredSuppliers = state.suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.phone.includes(searchTerm) ||
        supplier.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary">Purchases & Suppliers</h1>
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => setView('add_purchase')} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Purchase
                </Button>
                <Button onClick={() => setView('add_supplier')} variant="secondary" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Supplier
                </Button>
            </div>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search suppliers by name, phone, or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg"
                />
            </div>

            <Card title="All Suppliers">
                <div className="space-y-3">
                    {filteredSuppliers.map((supplier, index) => {
                        const supplierPurchases = state.purchases.filter(p => p.supplierId === supplier.id);
                        const totalSpent = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
                        const totalPaid = supplierPurchases.reduce((sum, p) => sum + (p.payments || []).reduce((pSum, payment) => pSum + payment.amount, 0), 0);
                        const totalDue = totalSpent - totalPaid;

                        return (
                            <div 
                                key={supplier.id} 
                                onClick={() => setSelectedSupplier(supplier)} 
                                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-100 border animate-slide-up-fade"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg text-primary">{supplier.name}</p>
                                        <p className="text-sm text-gray-500">{supplier.location}</p>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-4">
                                        <div className="flex items-center justify-end gap-1 text-green-600">
                                            <Package size={14}/>
                                            <span className="font-semibold">₹{totalSpent.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div className={`flex items-center justify-end gap-1 ${totalDue > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                            <IndianRupee size={14} />
                                            <span className="font-semibold">₹{totalDue.toLocaleString('en-IN')}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
        </div>
    );
};

export default PurchasesPage;