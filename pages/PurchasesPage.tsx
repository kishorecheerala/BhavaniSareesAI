import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Upload, IndianRupee, Edit, Save, X, Trash2, Search, QrCode, Package, ArrowLeft } from 'lucide-react';
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
    const [view, setView] = useState<'list' | 'add_supplier' | 'add_purchase' | 'supplier_details'>('list');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // State for 'add_supplier' view
    const [newSupplier, setNewSupplier] = useState({ id: '', name: '', phone: '', location: '', reference: '', account1: '', account2: '', upi: '' });

    // State for 'add_purchase' view
    const [purchaseSupplierId, setPurchaseSupplierId] = useState('');
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    const [supplierInvoiceId, setSupplierInvoiceId] = useState('');
    const [purchasePaymentAmount, setPurchasePaymentAmount] = useState('');
    const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'CASH' | 'UPI' | 'CHEQUE'>('CASH');
    const [purchasePaymentDate, setPurchasePaymentDate] = useState(getLocalDateString());
    
    // State for modals in purchase view
    const [isScanning, setIsScanning] = useState(false);
    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [addingItem, setAddingItem] = useState<Omit<PurchaseItem, 'productName'> & { isNew: boolean } | null>(null);

    // State for supplier details view
    const [isEditing, setIsEditing] = useState(false);
    const [editedSupplier, setEditedSupplier] = useState<Supplier | null>(null);
    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, purchaseId: string | null }>({ isOpen: false, purchaseId: null });
    const [paymentDetails, setPaymentDetails] = useState({ amount: '', method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE', date: getLocalDateString() });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, purchaseIdToDelete: string | null }>({ isOpen: false, purchaseIdToDelete: null });

    useEffect(() => {
        let isDirty = false;
        if (view === 'add_supplier') {
            isDirty = Object.values(newSupplier).some(val => val !== '');
        } else if (view === 'add_purchase') {
            isDirty = !!purchaseSupplierId || purchaseItems.length > 0;
        } else if (view === 'supplier_details') {
            isDirty = isEditing;
        }
        setIsDirty(isDirty);

        return () => setIsDirty(false);
    }, [view, newSupplier, purchaseSupplierId, purchaseItems, isEditing, setIsDirty]);
    
    useEffect(() => {
        if (selectedSupplier) {
            const currentSupplier = state.suppliers.find(s => s.id === selectedSupplier.id);
            setSelectedSupplier(currentSupplier || null);
            setEditedSupplier(currentSupplier || null);
            setView('supplier_details');
        } else {
            setView('list');
            setEditedSupplier(null);
        }
        setIsEditing(false);
    }, [selectedSupplier, state.suppliers, state.purchases]);


    const resetSupplierForm = () => {
        setNewSupplier({ id: '', name: '', phone: '', location: '', reference: '', account1: '', account2: '', upi: '' });
        setView('list');
    };

    const resetPurchaseForm = () => {
        setPurchaseSupplierId('');
        setPurchaseItems([]);
        setSupplierInvoiceId('');
        setPurchasePaymentAmount('');
        setPurchasePaymentMethod('CASH');
        setPurchasePaymentDate(getLocalDateString());
        setIsScanning(false);
        setIsSelectingProduct(false);
        setProductSearchTerm('');
        setAddingItem(null);
        setView('list');
    };

    const handleAddSupplier = () => {
        if (!newSupplier.id || !newSupplier.name) {
            alert('Supplier ID and Name are required.');
            return;
        }
        const finalId = `SUPP-${newSupplier.id.trim()}`;
        if (state.suppliers.some(s => s.id.toLowerCase() === finalId.toLowerCase())) {
            alert(`Supplier ID "${finalId}" is already in use.`);
            return;
        }
        const supplierToAdd: Supplier = { ...newSupplier, id: finalId };
        dispatch({ type: 'ADD_SUPPLIER', payload: supplierToAdd });
        showToast('Supplier added successfully!');
        resetSupplierForm();
    };

    const handleUpdateSupplier = () => {
        if (editedSupplier) {
            dispatch({ type: 'UPDATE_SUPPLIER', payload: editedSupplier });
            showToast('Supplier details updated.');
            setIsEditing(false);
        }
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

    const handleAddPayment = () => {
        const purchase = state.purchases.find(p => p.id === paymentModalState.purchaseId);
        if (!purchase || !paymentDetails.amount) {
            alert("Please enter a valid amount.");
            return;
        }

        const amountPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = purchase.totalAmount - amountPaid;
        const newPaymentAmount = parseFloat(paymentDetails.amount);

        if(newPaymentAmount > dueAmount + 0.01) {
            alert(`Payment of ₹${newPaymentAmount.toLocaleString('en-IN')} exceeds due amount of ₹${dueAmount.toLocaleString('en-IN')}.`);
            return;
        }

        const payment: Payment = {
            id: `PAY-P-${Date.now()}`,
            amount: newPaymentAmount,
            method: paymentDetails.method,
            date: new Date(paymentDetails.date).toISOString()
        };

        dispatch({ type: 'ADD_PAYMENT_TO_PURCHASE', payload: { purchaseId: purchase.id, payment } });
        setPaymentModalState({ isOpen: false, purchaseId: null });
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString() });
    };
    
     // --- Purchase Form Logic ---
    const totalPurchaseAmount = useMemo(() =>
        purchaseItems.reduce((sum, item) => {
            const itemTotal = item.price * item.quantity;
            const gst = itemTotal * (item.gstPercent / 100);
            return sum + itemTotal + gst;
        }, 0), [purchaseItems]);

    const handleProductSelected = (product: Product) => {
        setAddingItem({
            productId: product.id,
            quantity: 1,
            price: product.purchasePrice,
            gstPercent: product.gstPercent,
            saleValue: product.salePrice,
            isNew: false
        });
    };

    const handleProductScanned = (decodedText: string) => {
        const product = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleProductSelected(product);
        } else {
            setAddingItem({
                productId: decodedText,
                quantity: 1,
                price: 0,
                gstPercent: 5,
                saleValue: 0,
                isNew: true
            });
        }
    };
    
    const handleSavePurchaseItem = () => {
        if (!addingItem) return;

        const { productId, quantity, price, gstPercent, saleValue, isNew } = addingItem;
        
        if (!productId || quantity <= 0 || price <= 0 || saleValue <= 0) {
            alert("Please fill all item details with valid values.");
            return;
        }
        
        const productName = isNew ? prompt("Enter new product name:") : state.products.find(p => p.id === productId)?.name;
        if (!productName) {
            alert("Product name is required.");
            return;
        }

        const newItem: PurchaseItem = { productId, productName, quantity, price, gstPercent, saleValue };
        setPurchaseItems([...purchaseItems.filter(i => i.productId !== productId), newItem]);
        setAddingItem(null);
        setIsSelectingProduct(false);
    };

    const handleCompletePurchase = () => {
        if (!purchaseSupplierId || purchaseItems.length === 0) {
            alert("Please select a supplier and add at least one item.");
            return;
        }

        const now = new Date();
        const purchaseId = `PUR-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;

        const newPurchase: Purchase = {
            id: purchaseId,
            supplierId: purchaseSupplierId,
            items: purchaseItems,
            totalAmount: totalPurchaseAmount,
            date: now.toISOString(),
            supplierInvoiceId: supplierInvoiceId,
            payments: [],
        };

        const paidAmount = parseFloat(purchasePaymentAmount);
        if (paidAmount > 0) {
            newPurchase.payments.push({
                id: `PAY-P-${Date.now()}`,
                amount: paidAmount,
                method: purchasePaymentMethod,
                date: new Date(purchasePaymentDate).toISOString(),
            });
        }
        
        dispatch({ type: 'ADD_PURCHASE', payload: newPurchase });

        purchaseItems.forEach(item => {
            const newProduct: Product = {
                id: item.productId,
                name: item.productName,
                quantity: item.quantity,
                purchasePrice: item.price,
                salePrice: item.saleValue,
                gstPercent: item.gstPercent,
            };
            dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
        });

        showToast("Purchase recorded successfully! Stock updated.");
        resetPurchaseForm();
    };

    // --- RENDER METHODS ---

    const renderListView = () => (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={() => setView('add_purchase')} className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Create New Purchase
                </Button>
                <Button onClick={() => setView('add_supplier')} variant="secondary" className="w-full">
                    <Plus className="w-4 h-4 mr-2" /> Add New Supplier
                </Button>
            </div>
            
            <h2 className="text-xl font-bold text-primary border-t pt-4">All Suppliers</h2>
            <div className="space-y-3">
                {state.suppliers.map(supplier => {
                    const supplierPurchases = state.purchases.filter(p => p.supplierId === supplier.id);
                    const totalPurchased = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
                    const totalPaid = supplierPurchases.reduce((sum, p) => sum + (p.payments || []).reduce((pSum, payment) => pSum + payment.amount, 0), 0);
                    const totalDue = totalPurchased - totalPaid;
                    return (
                        <Card key={supplier.id} className="cursor-pointer hover:shadow-lg" onClick={() => setSelectedSupplier(supplier)}>
                             <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-primary">{supplier.name}</p>
                                    <p className="text-sm text-gray-600">{supplier.location}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-semibold text-green-600">Total: ₹{totalPurchased.toLocaleString('en-IN')}</p>
                                    <p className={`font-semibold ${totalDue > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                        Due: ₹{totalDue.toLocaleString('en-IN')}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    )
                })}
            </div>
        </div>
    );
    
    const renderAddSupplierView = () => (
        <Card title="Add New Supplier">
            <div className="space-y-4">
                <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 border border-r-0 rounded-l-md">SUPP-</span>
                    <input type="text" placeholder="Supplier ID" value={newSupplier.id} onChange={e => setNewSupplier({ ...newSupplier, id: e.target.value })} className="w-full p-2 border rounded-r-md" />
                </div>
                <input type="text" placeholder="Name" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full p-2 border rounded" />
                <input type="text" placeholder="Phone" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full p-2 border rounded" />
                <input type="text" placeholder="Location" value={newSupplier.location} onChange={e => setNewSupplier({ ...newSupplier, location: e.target.value })} className="w-full p-2 border rounded" />
                <input type="text" placeholder="Reference (Optional)" value={newSupplier.reference} onChange={e => setNewSupplier({ ...newSupplier, reference: e.target.value })} className="w-full p-2 border rounded" />
                <input type="text" placeholder="Account 1 (Optional)" value={newSupplier.account1} onChange={e => setNewSupplier({ ...newSupplier, account1: e.target.value })} className="w-full p-2 border rounded" />
                <input type="text" placeholder="Account 2 (Optional)" value={newSupplier.account2} onChange={e => setNewSupplier({ ...newSupplier, account2: e.target.value })} className="w-full p-2 border rounded" />
                <input type="text" placeholder="UPI (Optional)" value={newSupplier.upi} onChange={e => setNewSupplier({ ...newSupplier, upi: e.target.value })} className="w-full p-2 border rounded" />
                <div className="flex gap-2">
                    <Button onClick={handleAddSupplier} className="w-full">Save Supplier</Button>
                    <Button onClick={resetSupplierForm} variant="secondary" className="w-full">Cancel</Button>
                </div>
            </div>
        </Card>
    );

    const renderAddPurchaseView = () => {
         const QRScannerModal = () => (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
                <Card title="Scan Product QR" className="w-full max-w-md relative">
                    <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100"><X size={20}/></button>
                    <div id="qr-reader-purchase" className="w-full mt-4"></div>
                    <Button onClick={() => {
                        const html5QrCode = new Html5Qrcode("qr-reader-purchase");
                        html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, 
                            (decodedText) => {
                                html5QrCode.stop();
                                setIsScanning(false);
                                handleProductScanned(decodedText);
                            }, 
                            () => {}
                        ).catch(err => alert("Failed to start scanner: " + err));
                    }} className="w-full mt-2">Start Scan</Button>
                </Card>
            </div>
        );

        const ProductSearchModal = () => (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card className="w-full max-w-lg">
                    <h2 className="text-lg font-bold mb-2">Select Product</h2>
                    <input type="text" placeholder="Search..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="w-full p-2 border rounded mb-2"/>
                    <div className="max-h-60 overflow-y-auto">
                        {state.products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase())).map(p => (
                            <div key={p.id} onClick={() => handleProductSelected(p)} className="p-2 hover:bg-gray-100 cursor-pointer">{p.name}</div>
                        ))}
                    </div>
                    <Button onClick={() => setIsSelectingProduct(false)} variant="secondary" className="w-full mt-2">Close</Button>
                </Card>
            </div>
        );

        const AddItemModal = () => (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card title={addingItem?.isNew ? "Add New Product" : "Edit Purchase Item"} className="w-full max-w-md">
                    <div className="space-y-2">
                        <p><strong>Product Code:</strong> {addingItem?.productId}</p>
                        <label>Quantity</label><input type="number" value={addingItem?.quantity} onChange={e => setAddingItem({...addingItem!, quantity: +e.target.value})} className="w-full p-2 border rounded"/>
                        <label>Purchase Price (per item, excl. GST)</label><input type="number" value={addingItem?.price} onChange={e => setAddingItem({...addingItem!, price: +e.target.value})} className="w-full p-2 border rounded"/>
                        <label>GST %</label><input type="number" value={addingItem?.gstPercent} onChange={e => setAddingItem({...addingItem!, gstPercent: +e.target.value})} className="w-full p-2 border rounded"/>
                        <label>Sale Price (per item, incl. GST)</label><input type="number" value={addingItem?.saleValue} onChange={e => setAddingItem({...addingItem!, saleValue: +e.target.value})} className="w-full p-2 border rounded"/>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <Button onClick={handleSavePurchaseItem} className="w-full">Save Item</Button>
                        <Button onClick={() => setAddingItem(null)} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </Card>
            </div>
        );

        return (
            <div className="space-y-4">
                {isScanning && <QRScannerModal />}
                {isSelectingProduct && <ProductSearchModal />}
                {addingItem && <AddItemModal />}

                <Card title="New Purchase Order">
                    <select value={purchaseSupplierId} onChange={e => setPurchaseSupplierId(e.target.value)} className="w-full p-2 border rounded custom-select mb-2">
                        <option value="">Select Supplier</option>
                        {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    <input type="text" placeholder="Supplier Invoice ID (Optional)" value={supplierInvoiceId} onChange={e => setSupplierInvoiceId(e.target.value)} className="w-full p-2 border rounded" />
                </Card>

                <Card title="Items">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={() => setIsSelectingProduct(true)} className="w-full"><Search size={16} /> Select Existing Product</Button>
                        <Button onClick={() => setIsScanning(true)} variant="secondary" className="w-full"><QrCode size={16} /> Scan/Enter New Product</Button>
                    </div>
                    <div className="mt-4 space-y-2">
                        {purchaseItems.map(item => (
                            <div key={item.productId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <div><p className="font-semibold">{item.productName}</p><p className="text-sm">{item.quantity} x ₹{item.price}</p></div>
                                <div className="flex items-center gap-2">
                                    <p>₹{(item.quantity * item.price).toLocaleString('en-IN')}</p>
                                    <DeleteButton variant="remove" onClick={() => setPurchaseItems(purchaseItems.filter(i => i.productId !== item.productId))} />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Billing">
                    <div className="p-4 bg-purple-50 rounded-lg text-center mb-4">
                        <p className="text-sm font-semibold text-gray-600">Grand Total (incl. GST)</p>
                        <p className="text-4xl font-bold text-primary">₹{totalPurchaseAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium">Amount Paid Now</label>
                            <input type="number" value={purchasePaymentAmount} onChange={e => setPurchasePaymentAmount(e.target.value)} className="w-full p-2 border-2 border-red-300 rounded-lg shadow-inner focus:ring-red-500 focus:border-red-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Payment Method</label>
                            <select value={purchasePaymentMethod} onChange={e => setPurchasePaymentMethod(e.target.value as any)} className="w-full p-2 border rounded custom-select">
                                <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium">Payment Date</label>
                            <input type="date" value={purchasePaymentDate} onChange={e => setPurchasePaymentDate(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                </Card>
                <div className="flex gap-2">
                    <Button onClick={handleCompletePurchase} className="w-full">Complete Purchase</Button>
                    <Button onClick={resetPurchaseForm} variant="secondary" className="w-full">Cancel</Button>
                </div>
            </div>
        );
    };

    const renderSupplierDetailsView = () => {
         if (!selectedSupplier || !editedSupplier) return null;

         const supplierPurchases = state.purchases.filter(p => p.supplierId === selectedSupplier.id);
         const PaymentModal = () => {
             const purchase = state.purchases.find(p => p.id === paymentModalState.purchaseId);
             if (!paymentModalState.isOpen || !purchase) return null;
             const amountPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
             const dueAmount = purchase.totalAmount - amountPaid;

             return (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card title="Add Payment" className="w-full max-w-sm">
                        <div className="space-y-4">
                            <p>Due Amount: <span className="font-bold text-red-600">₹{dueAmount.toLocaleString('en-IN')}</span></p>
                            <input type="number" placeholder="Enter amount" value={paymentDetails.amount} onChange={e => setPaymentDetails({ ...paymentDetails, amount: e.target.value })} className="w-full p-2 border rounded" autoFocus/>
                            <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any })} className="w-full p-2 border rounded custom-select">
                                <option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CHEQUE">Cheque</option>
                            </select>
                            <input type="date" value={paymentDetails.date} onChange={e => setPaymentDetails({ ...paymentDetails, date: e.target.value })} className="w-full p-2 border rounded"/>
                            <div className="flex gap-2">
                               <Button onClick={handleAddPayment} className="w-full">Save Payment</Button>
                               <Button onClick={() => setPaymentModalState({isOpen: false, purchaseId: null})} variant="secondary" className="w-full">Cancel</Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )
         };

         return (
             <div className="space-y-4">
                 <ConfirmationModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({ isOpen: false, purchaseIdToDelete: null })} onConfirm={confirmDeletePurchase} title="Confirm Purchase Deletion">
                    Are you sure you want to delete this purchase record? This will remove the items from your stock.
                 </ConfirmationModal>
                 {paymentModalState.isOpen && <PaymentModal />}
                 <Button onClick={() => setSelectedSupplier(null)}><ArrowLeft size={16} /> Back to List</Button>
                 
                 <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-primary">{selectedSupplier.name}</h2>
                        {isEditing ? (
                            <div className="flex gap-2"><Button onClick={handleUpdateSupplier}><Save size={16}/> Save</Button><Button onClick={() => setIsEditing(false)} variant="secondary"><X size={16}/></Button></div>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit</Button>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="space-y-2">
                            <input type="text" value={editedSupplier.name} onChange={e => setEditedSupplier({...editedSupplier, name: e.target.value})} className="w-full p-2 border rounded"/>
                            {/* Add other fields here */}
                        </div>
                    ) : (
                        <div className="space-y-1 text-gray-700">
                             <p><strong>ID:</strong> {selectedSupplier.id}</p>
                             <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
                             <p><strong>Location:</strong> {selectedSupplier.location}</p>
                        </div>
                    )}
                 </Card>

                 <Card title="Purchase History">
                    {supplierPurchases.length > 0 ? (
                        <div className="space-y-4">
                            {supplierPurchases.slice().reverse().map(purchase => {
                                const amountPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
                                const dueAmount = purchase.totalAmount - amountPaid;
                                return (
                                <div key={purchase.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <p className="font-semibold">{new Date(purchase.date).toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">Invoice ID: {purchase.id}</p>
                                        {purchase.supplierInvoiceId && <p className="text-xs text-gray-500">Supplier Invoice: {purchase.supplierInvoiceId}</p>}
                                        <p className={`text-sm font-bold ${dueAmount <= 0.01 ? 'text-green-600' : 'text-red-600'}`}>Due: ₹{dueAmount.toLocaleString('en-IN')}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-bold text-lg text-primary">₹{purchase.totalAmount.toLocaleString('en-IN')}</p>
                                        <DeleteButton variant="delete" onClick={(e) => { e.stopPropagation(); handleDeletePurchase(purchase.id); }} />
                                      </div>
                                    </div>
                                     <div className="pl-4 mt-2 border-l-2 border-purple-200 space-y-3">
                                         <div>
                                             <h4 className="font-semibold text-sm">Items:</h4>
                                             <ul className="list-disc list-inside text-sm">{purchase.items.map((item, i) => <li key={i}>{item.productName} (x{item.quantity})</li>)}</ul>
                                         </div>
                                         {purchase.payments.length > 0 && <div>
                                             <h4 className="font-semibold text-sm">Payments:</h4>
                                             <ul className="list-disc list-inside text-sm">{purchase.payments.map(p => <li key={p.id}>₹{p.amount.toLocaleString('en-IN')} via {p.method} on {new Date(p.date).toLocaleDateString()}</li>)}</ul>
                                         </div>}
                                         {dueAmount > 0.01 && <Button onClick={() => setPaymentModalState({ isOpen: true, purchaseId: purchase.id })}><Plus size={16}/> Add Payment</Button>}
                                     </div>
                                </div>
                            )})}
                        </div>
                    ) : <p>No purchases recorded.</p>}
                 </Card>
             </div>
         );
    }
    
    let content;
    switch(view) {
        case 'add_supplier': content = renderAddSupplierView(); break;
        case 'add_purchase': content = renderAddPurchaseView(); break;
        case 'supplier_details': content = renderSupplierDetailsView(); break;
        default: content = renderListView();
    }

    return (
        <div className="space-y-4">
             <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <Package /> Purchases & Suppliers
            </h1>
            {content}
        </div>
    );
};

export default PurchasesPage;
