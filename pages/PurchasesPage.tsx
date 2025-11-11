
// FIX: import useMemo from react.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Upload, IndianRupee, Edit, Save, X, Trash2, Search, QrCode, Package } from 'lucide-react';
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

interface PurchasesPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const PurchasesPage: React.FC<PurchasesPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [view, setView] = useState<'list' | 'add_supplier' | 'add_purchase'>('list');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const csvInputRef = useRef<HTMLInputElement>(null);

    // State for 'add_supplier' view
    const [newSupplier, setNewSupplier] = useState({ id: '', name: '', phone: '', location: '', reference: '', account1: '', account2: '', upi: '' });

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
        setIsDirty(addSupplierDirty || addPurchaseDirty || detailViewDirty);
        return () => setIsDirty(false);
    }, [view, newSupplier, purchaseSupplierId, purchaseItems, purchasePaymentDetails.amount, selectedSupplier, isEditing, setIsDirty]);
    
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
        setNewSupplier({ id: '', name: '', phone: '', location: '', reference: '', account1: '', account2: '', upi: '' });
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
            alert("Product not found. You can add it manually.");
            setNewProduct({ ...newProduct, id: decodedText });
            setIsAddingProduct(true);
        }
        setIsScanning(false);
    };

    const totalPurchaseAmount = useMemo(() => {
        return purchaseItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }, [purchaseItems]);

    const handleCreatePurchase = () => {
        if (!purchaseSupplierId || purchaseItems.length === 0) {
            return alert("Please select a supplier and add items.");
        }
        
        const now = new Date();
        const purchaseId = `PURCH-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`;

        const paid = parseFloat(purchasePaymentDetails.amount) || 0;
        if (paid > totalPurchaseAmount + 0.01) {
            return alert("Paid amount cannot exceed total purchase amount.");
        }

        const payment: Payment | null = paid > 0 ? {
            id: `PAY-P-${Date.now()}`,
            amount: paid,
            method: purchasePaymentDetails.method,
            date: new Date(purchasePaymentDetails.date).toISOString(),
            reference: purchasePaymentDetails.reference || undefined,
        } : null;

        const newPurchase: Purchase = {
            id: purchaseId,
            supplierId: purchaseSupplierId,
            items: purchaseItems,
            totalAmount: totalPurchaseAmount,
            date: now.toISOString(),
            supplierInvoiceId: supplierInvoiceId.trim() || undefined,
            payments: payment ? [payment] : [],
        };

        dispatch({ type: 'ADD_PURCHASE', payload: newPurchase });

        purchaseItems.forEach(item => {
            const product: Product = {
                id: item.productId,
                name: item.productName,
                quantity: item.quantity,
                purchasePrice: item.price,
                salePrice: item.saleValue,
                gstPercent: item.gstPercent,
            };
            dispatch({ type: 'ADD_PRODUCT', payload: product });
        });

        showToast("Purchase created and stock updated!");
        resetAddPurchaseForm();
        setView('list');
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                alert('Could not read the file content.');
                return;
            }

            try {
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    alert('CSV file must have a header row and at least one data row.');
                    return;
                }

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const requiredHeaders = ['id', 'name', 'purchaseprice', 'saleprice', 'gstpercent', 'quantity'];
                const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));

                if (missingHeaders.length > 0) {
                     alert(`CSV is missing required columns: ${missingHeaders.join(', ')}.`);
                     return;
                }

                const items: PurchaseItem[] = [];
                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    const row = headers.reduce((obj, header, index) => {
                        obj[header] = values[index]?.trim() || '';
                        return obj;
                    }, {} as any);
                    
                    if (!row.id || !row.name) {
                        console.warn(`Skipping row ${i+1} due to missing id or name.`);
                        continue;
                    }

                    items.push({
                        productId: row.id,
                        productName: row.name,
                        price: parseFloat(row.purchaseprice) || 0,
                        saleValue: parseFloat(row.saleprice) || 0,
                        gstPercent: parseFloat(row.gstpercent) || 0,
                        quantity: parseInt(row.quantity) || 0
                    });
                }
                setPurchaseItems(prev => [...prev, ...items]);
                showToast(`Imported ${items.length} items from CSV.`);
            } catch (error) {
                console.error("CSV Import Error:", error);
                alert(`An error occurred during import: ${(error as Error).message}`);
            } finally {
                 if (csvInputRef.current) csvInputRef.current.value = "";
            }
        };

        reader.readAsText(file);
    };

    const filteredSuppliers = state.suppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.location.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Modals
    const NewProductModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Add New Product" className="w-full max-w-md animate-scale-in">
                <div className="space-y-4">
                    <input type="text" placeholder="Product ID / Code" value={newProduct.id} onChange={e => setNewProduct({ ...newProduct, id: e.target.value })} className="w-full p-2 border rounded" autoFocus />
                    <input type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({ ...newProduct, name: e.target.value })} className="w-full p-2 border rounded" />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Purchase Price" value={newProduct.purchasePrice} onChange={e => setNewProduct({ ...newProduct, purchasePrice: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="number" placeholder="Sale Price" value={newProduct.salePrice} onChange={e => setNewProduct({ ...newProduct, salePrice: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select value={newProduct.gstPercent} onChange={e => setNewProduct({ ...newProduct, gstPercent: e.target.value })} className="w-full p-2 border rounded custom-select">
                            <option value="0">0% GST</option>
                            <option value="3">3% GST</option>
                            <option value="5">5% GST</option>
                            <option value="12">12% GST</option>
                            <option value="18">18% GST</option>
                            <option value="28">28% GST</option>
                        </select>
                        <input type="number" placeholder="Quantity" value={newProduct.quantity} onChange={e => setNewProduct({ ...newProduct, quantity: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleAddItemManually} className="w-full">Add to Purchase</Button>
                        <Button onClick={() => setIsAddingProduct(false)} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            </Card>
        </div>
    );

    const QRScannerModal: React.FC = () => {
        const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
        useEffect(() => {
            if (!isScanning) return;
            html5QrCodeRef.current = new Html5Qrcode("qr-reader-purchases");
            const qrCodeSuccessCallback = (decodedText: string) => {
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().then(() => handleProductScanned(decodedText));
                }
            };
            html5QrCodeRef.current.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } }, qrCodeSuccessCallback, undefined)
                .catch(() => alert("Camera permission is required."));
            return () => {
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().catch(err => console.log("Failed to stop scanner.", err));
                }
            };
        }, [isScanning]);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                <Card title="Scan Product" className="w-full max-w-md relative animate-scale-in">
                    <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 p-2"><X size={20}/></button>
                    <div id="qr-reader-purchases" className="w-full mt-4"></div>
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
            {state.products
              .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
              .map(p => (
                <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-100">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-gray-500">Code: {p.id} | Stock: {p.quantity}</p>
                </div>
              ))}
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
                        <input type="date" value={paymentDetails.date} onChange={e => setPaymentDetails({ ...paymentDetails, date: e.target.value })} className="w-full p-2 border rounded"/>
                        <input type="text" placeholder="Reference (Optional)" value={paymentDetails.reference} onChange={e => setPaymentDetails({ ...paymentDetails, reference: e.target.value })} className="w-full p-2 border rounded" />
                        <div className="flex gap-2">
                           <Button onClick={handleAddPayment} className="w-full">Save Payment</Button>
                           <Button onClick={() => setPaymentModalState({isOpen: false, purchaseId: null})} variant="secondary" className="w-full">Cancel</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    };
    
    // Conditional Rendering
    if (isAddingProduct) return <NewProductModal />;
    if (isScanning) return <QRScannerModal />;
    if (isSelectingProduct) return <ProductSearchModal />;
    
    if (selectedSupplier) {
        const supplierPurchases = state.purchases.filter(p => p.supplierId === selectedSupplier.id);
        const supplierReturns = state.returns.filter(r => r.type === 'SUPPLIER' && r.partyId === selectedSupplier.id);
        
        return (
            <div className="space-y-4">
                <ConfirmationModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({isOpen: false, purchaseIdToDelete: null})} onConfirm={confirmDeletePurchase} title="Confirm Purchase Deletion">
                    Are you sure you want to delete this purchase? This will remove the items from your stock. This action cannot be undone.
                </ConfirmationModal>
                {paymentModalState.isOpen && <PaymentModal />}
                <Button onClick={() => setSelectedSupplier(null)}>&larr; Back to Suppliers List</Button>
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-primary">{selectedSupplier.name}</h2>
                        {isEditing ? (
                             <div className="flex gap-2 items-center">
                                <Button onClick={handleUpdateSupplier} className="h-9 px-3"><Save size={16} /> Save</Button>
                                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"><X size={20}/></button>
                            </div>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit</Button>
                        )}
                    </div>
                    {isEditing && editedSupplier ? (
                         <div className="space-y-3">
                            <input type="text" value={editedSupplier.name} onChange={e => setEditedSupplier({...editedSupplier, name: e.target.value})} className="w-full p-2 border rounded" />
                            <input type="text" value={editedSupplier.phone} onChange={e => setEditedSupplier({...editedSupplier, phone: e.target.value})} className="w-full p-2 border rounded" />
                            <input type="text" value={editedSupplier.location} onChange={e => setEditedSupplier({...editedSupplier, location: e.target.value})} className="w-full p-2 border rounded" />
                            <input type="text" value={editedSupplier.reference ?? ''} onChange={e => setEditedSupplier({...editedSupplier, reference: e.target.value})} className="w-full p-2 border rounded" placeholder="Reference" />
                            <input type="text" value={editedSupplier.account1 ?? ''} onChange={e => setEditedSupplier({...editedSupplier, account1: e.target.value})} className="w-full p-2 border rounded" placeholder="Bank Account 1" />
                            <input type="text" value={editedSupplier.account2 ?? ''} onChange={e => setEditedSupplier({...editedSupplier, account2: e.target.value})} className="w-full p-2 border rounded" placeholder="Bank Account 2" />
                            <input type="text" value={editedSupplier.upi ?? ''} onChange={e => setEditedSupplier({...editedSupplier, upi: e.target.value})} className="w-full p-2 border rounded" placeholder="UPI ID" />
                        </div>
                    ) : (
                         <div className="space-y-1 text-gray-700">
                             <p><strong>ID:</strong> {selectedSupplier.id}</p>
                            <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
                            <p><strong>Location:</strong> {selectedSupplier.location}</p>
                            {selectedSupplier.reference && <p><strong>Reference:</strong> {selectedSupplier.reference}</p>}
                            {selectedSupplier.account1 && <p><strong>Account 1:</strong> {selectedSupplier.account1}</p>}
                            {selectedSupplier.account2 && <p><strong>Account 2:</strong> {selectedSupplier.account2}</p>}
                            {selectedSupplier.upi && <p><strong>UPI:</strong> {selectedSupplier.upi}</p>}
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
                                                <p className="text-xs text-gray-500">Invoice ID: {purchase.id}</p>
                                                {purchase.supplierInvoiceId && <p className="text-xs text-gray-500">Supplier Invoice: {purchase.supplierInvoiceId}</p>}
                                                <p className={`text-sm font-bold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isPaid ? 'Paid' : `Due: ₹${dueAmount.toLocaleString('en-IN')}`}
                                                </p>
                                            </div>
                                            <p className="font-bold text-lg text-primary">₹{purchase.totalAmount.toLocaleString('en-IN')}</p>
                                        </div>
                                      </div>
                                      <DeleteButton variant="delete" onClick={(e) => { e.stopPropagation(); handleDeletePurchase(purchase.id); }} className="ml-4" />
                                    </div>
                                    <div className="pl-4 mt-2 border-l-2 border-purple-200 space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-1">Items Purchased:</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                {purchase.items.map((item, index) => (
                                                    <li key={index}>
                                                        {item.productName} (x{item.quantity}) @ ₹{item.price.toLocaleString('en-IN')} each
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        {(purchase.payments || []).length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-700 mb-1">Payments Made:</h4>
                                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                    {purchase.payments.map(payment => (
                                                        <li key={payment.id}>
                                                            ₹{payment.amount.toLocaleString('en-IN')} {payment.method === 'RETURN_CREDIT' ? <span className="text-blue-600 font-semibold">(Return Credit)</span> : `via ${payment.method}`} on {new Date(payment.date).toLocaleDateString()}
                                                            {payment.reference && <span className="text-xs text-gray-500 block">Ref: {payment.reference}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {!isPaid && (
                                            <div className="pt-2">
                                                <Button onClick={() => setPaymentModalState({ isOpen: true, purchaseId: purchase.id })} className="w-full sm:w-auto">
                                                    <Plus size={16} className="mr-2"/> Add Payment
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <p className="text-gray-500">No purchases recorded for this supplier.</p>
                    )}
                </Card>
                 <Card title="Returns History">
                    {supplierReturns.length > 0 ? (
                         <div className="space-y-3">
                            {supplierReturns.slice().reverse().map(ret => (
                                <div key={ret.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">Return on {new Date(ret.returnDate).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500">Original Invoice: {ret.referenceId}</p>
                                        </div>
                                        <p className="font-semibold text-primary">Credit Value: ₹{ret.amount.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="mt-2 pt-2 border-t">
                                        <ul className="text-sm list-disc list-inside text-gray-600">
                                            {ret.items.map((item, idx) => (
                                                <li key={idx}>{item.productName} (x{item.quantity})</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No returns recorded for this supplier.</p>
                    )}
                </Card>
            </div>
        );
    }
    
    if (view === 'add_supplier') {
        return (
            <div className="space-y-4">
                <Button onClick={() => setView('list')}>&larr; Back to List</Button>
                <Card title="New Supplier Form">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Supplier ID</label>
                            <div className="flex items-center mt-1">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-gray-50 text-gray-500 text-sm">SUPP-</span>
                                <input type="text" placeholder="Enter unique ID" value={newSupplier.id} onChange={e => setNewSupplier({ ...newSupplier, id: e.target.value })} className="w-full p-2 border rounded-r-md" autoFocus/>
                            </div>
                        </div>
                        <input type="text" placeholder="Name" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Phone" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Location" value={newSupplier.location} onChange={e => setNewSupplier({ ...newSupplier, location: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Reference (Optional)" value={newSupplier.reference} onChange={e => setNewSupplier({ ...newSupplier, reference: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Bank Account 1 (Optional)" value={newSupplier.account1} onChange={e => setNewSupplier({ ...newSupplier, account1: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Bank Account 2 (Optional)" value={newSupplier.account2} onChange={e => setNewSupplier({ ...newSupplier, account2: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="UPI ID (Optional)" value={newSupplier.upi} onChange={e => setNewSupplier({ ...newSupplier, upi: e.target.value })} className="w-full p-2 border rounded" />
                        <Button onClick={handleAddSupplier} className="w-full">Save Supplier</Button>
                    </div>
                </Card>
            </div>
        );
    }

    if (view === 'add_purchase') {
        return (
            <div className="space-y-4">
                 <Button onClick={() => { setView('list'); resetAddPurchaseForm(); }}>&larr; Back to List</Button>
                 <Card title="New Purchase Form">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Supplier</label>
                            <select value={purchaseSupplierId} onChange={e => setPurchaseSupplierId(e.target.value)} className="w-full p-2 border rounded custom-select">
                                <option value="">-- Select Supplier --</option>
                                {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>
                        <input type="text" placeholder="Supplier Invoice ID (Optional)" value={supplierInvoiceId} onChange={e => setSupplierInvoiceId(e.target.value)} className="w-full p-2 border rounded" />
                        
                        <Card title="Items">
                             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                                <Button onClick={() => setIsAddingProduct(true)}><Plus className="w-4 h-4 mr-2"/>Add New Product</Button>
                                <Button onClick={() => setIsSelectingProduct(true)} variant="secondary"><Search className="w-4 h-4 mr-2"/>Select Existing</Button>
                                <Button onClick={() => setIsScanning(true)} variant="secondary"><QrCode className="w-4 h-4 mr-2"/>Scan Product</Button>
                                <Button onClick={() => csvInputRef.current?.click()} variant="secondary"><Upload className="w-4 h-4 mr-2"/>Bulk Import</Button>
                            </div>
                             <input
                                type="file"
                                accept=".csv,text/csv,application/vnd.ms-excel,text/plain"
                                className="hidden"
                                ref={csvInputRef}
                                onChange={handleImportCSV}
                            />
                            <div className="space-y-2">
                                {purchaseItems.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                        <div>
                                            <p className="font-semibold">{item.productName} (x{item.quantity})</p>
                                            <p className="text-sm text-gray-600">@ ₹{item.price.toLocaleString('en-IN')} each</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold w-24 text-right">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                            <DeleteButton variant="remove" onClick={() => setPurchaseItems(purchaseItems.filter((_, i) => i !== index))} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                        
                        <Card title="Billing">
                            <div className="space-y-3">
                                 <div className="flex justify-between items-center text-xl font-bold text-primary">
                                    <span>Total Amount:</span>
                                    <span>₹{totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                    <input type="number" placeholder="Amount Paid" value={purchasePaymentDetails.amount} onChange={e => setPurchasePaymentDetails({ ...purchasePaymentDetails, amount: e.target.value })} className="w-full p-2 border rounded" />
                                    <select value={purchasePaymentDetails.method} onChange={e => setPurchasePaymentDetails({ ...purchasePaymentDetails, method: e.target.value as any })} className="w-full p-2 border rounded custom-select">
                                        <option value="CASH">Cash</option>
                                        <option value="UPI">UPI</option>
                                        <option value="CHEQUE">Cheque</option>
                                    </select>
                                    <input type="date" value={purchasePaymentDetails.date} onChange={e => setPurchasePaymentDetails({ ...purchasePaymentDetails, date: e.target.value })} className="w-full p-2 border rounded" />
                                    <input type="text" placeholder="Reference (Optional)" value={purchasePaymentDetails.reference} onChange={e => setPurchasePaymentDetails({ ...purchasePaymentDetails, reference: e.target.value })} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                        </Card>
                         <Button onClick={handleCreatePurchase} className="w-full">Complete Purchase</Button>
                    </div>
                </Card>
            </div>
        );
    }
    
    // Default view: list
    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-primary">Suppliers & Purchases</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                    <Button onClick={() => setView('add_purchase')} className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> New Purchase
                    </Button>
                    <Button onClick={() => setView('add_supplier')} variant="secondary" className="w-full">
                        <Plus className="w-4 h-4 mr-2" /> New Supplier
                    </Button>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search suppliers by name or location..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg"
                />
            </div>

            <div className="space-y-3">
                {filteredSuppliers.map(supplier => {
                    const supplierPurchases = state.purchases.filter(p => p.supplierId === supplier.id);
                    const totalPurchased = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
                    const totalPaid = supplierPurchases.reduce((sum, p) => sum + (p.payments || []).reduce((pSum, payment) => pSum + payment.amount, 0), 0);
                    const totalDue = totalPurchased - totalPaid;

                    return (
                        <Card key={supplier.id} className="cursor-pointer" onClick={() => setSelectedSupplier(supplier)}>
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-primary">{supplier.name}</p>
                                    <p className="text-sm text-gray-500">{supplier.location}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <p className="text-sm text-gray-600">Total Purchase: ₹{totalPurchased.toLocaleString('en-IN')}</p>
                                    <p className={`text-sm font-bold ${totalDue > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                        Due: ₹{totalDue.toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default PurchasesPage;
