import React, { useState, useEffect, useRef } from 'react';
import { Plus, Upload, IndianRupee, Edit, Save, X, Trash2, Download, QrCode, Package, Info, CheckCircle, XCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Supplier, Product, Purchase, PurchaseItem, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { Html5Qrcode } from 'html5-qrcode';

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
    const { state, dispatch } = useAppContext();
    const [view, setView] = useState<'list' | 'add_supplier' | 'add_purchase'>('list');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [purchaseToEdit, setPurchaseToEdit] = useState<Purchase | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editedSupplier, setEditedSupplier] = useState<Supplier | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
    const [fileToImport, setFileToImport] = useState<File | null>(null);
    const [itemsForReview, setItemsForReview] = useState<PurchaseItem[] | null>(null);

    const [newSupplier, setNewSupplier] = useState<Omit<Supplier, 'id'>>({ name: '', phone: '', location: '' });
    
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [newItem, setNewItem] = useState<{ productId: string, productName: string, quantity: string, price: string, gstPercent: string, saleValue: string }>({ productId: '', productName: '', quantity: '1', price: '', gstPercent: '5', saleValue: '' });
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CHEQUE'>('CASH');
    const [paymentDate, setPaymentDate] = useState(getLocalDateString());

    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, purchaseId: string | null }>({ isOpen: false, purchaseId: null });
    const [paymentDetails, setPaymentDetails] = useState({ 
        amount: '', 
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: getLocalDateString()
    });
    
     useEffect(() => {
        let formIsDirty = false;
        if (view === 'add_supplier') {
            formIsDirty = !!(newSupplier.name || newSupplier.phone || newSupplier.location);
        } else if (view === 'add_purchase') {
            formIsDirty = !!supplierId || items.length > 0 || !!paymentAmount || !!itemsForReview;
        } else if (selectedSupplier) {
            formIsDirty = isEditing;
        }
        if (fileToImport || purchaseToEdit) {
            formIsDirty = true;
        }
        setIsDirty(formIsDirty);

        return () => {
            setIsDirty(false);
        };
    }, [view, newSupplier, supplierId, items, paymentAmount, isEditing, selectedSupplier, fileToImport, itemsForReview, purchaseToEdit, setIsDirty]);

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
    
    useEffect(() => {
        if (purchaseToEdit) {
            setSupplierId(purchaseToEdit.supplierId);
            setItems(purchaseToEdit.items);
            const mainPayment = purchaseToEdit.payments.find(p => p.method !== 'RETURN_CREDIT');
            setPaymentAmount(mainPayment ? mainPayment.amount.toString() : '');
            setPaymentMethod(mainPayment ? mainPayment.method : 'CASH');
            setPaymentDate(mainPayment ? getLocalDateString(new Date(mainPayment.date)) : getLocalDateString());
            setView('add_purchase');
        }
    }, [purchaseToEdit]);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddSupplier = () => {
        if (!newSupplier.name || !newSupplier.phone || !newSupplier.location) {
            alert("Please fill all supplier details.");
            return;
        }
        dispatch({ type: 'ADD_SUPPLIER', payload: { ...newSupplier, id: `SUP-${Date.now()}` } });
        setNewSupplier({ name: '', phone: '', location: '' });
        setView('list');
        alert("Supplier added successfully!");
    };
    
    const handleUpdateSupplier = () => {
        if (editedSupplier) {
             if (window.confirm('Are you sure you want to save these changes to the supplier details?')) {
                dispatch({ type: 'UPDATE_SUPPLIER', payload: editedSupplier });
                setSelectedSupplier(editedSupplier);
                setIsEditing(false);
                alert("Supplier details updated successfully.");
            }
        }
    };
    
    const handleDeleteSupplier = (supplierId: string) => {
        const hasPurchases = state.purchases.some(p => p.supplierId === supplierId);
        if (hasPurchases) {
            alert("This supplier cannot be deleted because they have existing purchase records. Please delete their purchases first.");
            return;
        }
        if (window.confirm("Are you sure you want to delete this supplier? This action cannot be undone.")) {
            dispatch({ type: 'DELETE_SUPPLIER', payload: supplierId });
            setSelectedSupplier(null);
            alert("Supplier deleted successfully.");
        }
    };


    const handleDeletePurchase = (purchaseId: string) => {
        if (window.confirm('Are you sure you want to delete this purchase? This action cannot be undone and will remove the items from your stock.')) {
            dispatch({ type: 'DELETE_PURCHASE', payload: purchaseId });
            alert('Purchase deleted successfully.');
        }
    };

    const handleAddItem = () => {
         if (!newItem.productId || !newItem.productName || !newItem.quantity || !newItem.price || !newItem.saleValue) {
            alert("Please fill all item fields.");
            return;
        }
        setItems([...items, { ...newItem, quantity: parseInt(newItem.quantity), price: parseFloat(newItem.price), gstPercent: parseFloat(newItem.gstPercent), saleValue: parseFloat(newItem.saleValue) }]);
        setNewItem({ productId: '', productName: '', quantity: '1', price: '', gstPercent: '5', saleValue: '' });
    }

    const clearPurchaseFormFields = () => {
        setSupplierId('');
        setItems([]);
        setPaymentAmount('');
        setPaymentMethod('CASH');
        setPaymentDate(getLocalDateString());
        setNewItem({ productId: '', productName: '', quantity: '1', price: '', gstPercent: '5', saleValue: '' });
        setPurchaseToEdit(null);
    };

    const resetPurchaseForm = () => {
        clearPurchaseFormFields();
        setView('list');
    };

    const handleAddOrUpdatePurchase = () => {
        if (!supplierId || items.length === 0) {
            alert("Please select a supplier and add at least one item.");
            return;
        }
        const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        
        const paidAmount = parseFloat(paymentAmount || '0');
        if (paidAmount > totalAmount + 0.01) {
            alert(`Paid amount (₹${paidAmount}) cannot be greater than the total amount (₹${totalAmount}).`);
            return;
        }

        const newPayments: Payment[] = [];
        if (paidAmount > 0) {
            newPayments.push({
                id: `PAY-P-${Date.now()}`,
                amount: paidAmount,
                method: paymentMethod,
                date: new Date(paymentDate).toISOString(),
            });
        }
        // Preserve any return credits
        if (purchaseToEdit) {
            const returnCredits = purchaseToEdit.payments.filter(p => p.method === 'RETURN_CREDIT');
            newPayments.push(...returnCredits);
        }

        if (purchaseToEdit) {
            // Update existing purchase
            const updatedPurchase: Purchase = {
                ...purchaseToEdit,
                supplierId,
                items,
                totalAmount,
                payments: newPayments
            };
            dispatch({ type: 'UPDATE_PURCHASE', payload: { oldPurchase: purchaseToEdit, newPurchase: updatedPurchase } });
            // Stock is handled in the reducer
            alert("Purchase updated successfully!");
        } else {
            // Add new purchase
            const newPurchase: Purchase = {
                id: `PUR-${Date.now()}`,
                supplierId,
                items,
                totalAmount,
                date: new Date().toISOString(),
                payments: newPayments
            };
            dispatch({ type: 'ADD_PURCHASE', payload: newPurchase });
            items.forEach(item => {
                const product: Product = { id: item.productId, name: item.productName, quantity: item.quantity, purchasePrice: item.price, salePrice: item.saleValue, gstPercent: item.gstPercent };
                dispatch({ type: 'ADD_PRODUCT', payload: product });
            });
            alert("Purchase added successfully!");
        }
        
        resetPurchaseForm();
    };

    const handleRecordStandalonePayment = () => {
        if (!supplierId) {
            alert('Please select a supplier to record a payment for.');
            return;
        }

        const paidAmount = parseFloat(paymentAmount || '0');
        if (paidAmount <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }

        const outstandingPurchases = state.purchases
            .filter(purchase => {
                const paid = (purchase.payments || []).reduce((sum, p) => sum + p.amount, 0);
                return purchase.supplierId === supplierId && (purchase.totalAmount - paid) > 0.01;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (outstandingPurchases.length === 0) {
            alert('This supplier has no outstanding dues.');
            return;
        }
        
        const totalDueForSupplier = outstandingPurchases.reduce((total, purchase) => {
            const paid = (purchase.payments || []).reduce((sum, p) => sum + p.amount, 0);
            return total + (purchase.totalAmount - paid);
        }, 0);

        if (paidAmount > totalDueForSupplier + 0.01) {
            alert(`Payment amount of ₹${paidAmount.toLocaleString('en-IN')} exceeds the total due of ₹${totalDueForSupplier.toLocaleString('en-IN')}.`);
            return;
        }
        
        let remainingPayment = paidAmount;
        for (const purchase of outstandingPurchases) {
            if (remainingPayment <= 0) break;

            const paid = (purchase.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const dueAmount = purchase.totalAmount - paid;
            
            const amountToApply = Math.min(remainingPayment, dueAmount);

            const newPayment: Payment = {
                id: `PAY-P-${Date.now()}-${Math.random()}`,
                amount: amountToApply,
                method: paymentMethod,
                date: new Date(paymentDate).toISOString()
            };

            dispatch({ type: 'ADD_PAYMENT_TO_PURCHASE', payload: { purchaseId: purchase.id, payment: newPayment } });
            
            remainingPayment -= amountToApply;
        }
        
        alert(`Payment of ₹${paidAmount.toLocaleString('en-IN')} recorded successfully.`);
        resetPurchaseForm();
    };

    const handleProductScanned = (decodedText: string) => {
        setNewItem(prev => ({ ...prev, productId: decodedText }));
        const existingProduct = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (existingProduct) {
            setNewItem(prev => ({
                ...prev,
                productName: existingProduct.name,
                price: existingProduct.purchasePrice.toString(),
                saleValue: existingProduct.salePrice.toString(),
                gstPercent: existingProduct.gstPercent.toString(),
            }));
        }
    };

    const handleAddPaymentToPurchase = () => {
        const purchase = state.purchases.find(p => p.id === paymentModalState.purchaseId);
        if (!purchase || !paymentDetails.amount) return;
        
        const amountPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = purchase.totalAmount - amountPaid;
        const newPaymentAmount = parseFloat(paymentDetails.amount);

        if(newPaymentAmount > dueAmount + 0.01) {
             alert(`Payment exceeds due amount.`);
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

    const handleDownloadTemplate = () => {
        const headers = ['Saree Code/ID', 'Saree Name', 'Quantity', 'Purchase Price', 'Sale Price', 'GST %'];
        const examples = [
            ['PATTU001', 'Red Kanchipuram Silk', 10, 5000, 12000, 12],
            ['COTTON002', 'Blue Bengal Cotton', 25, 800, 2500, 5]
        ];

        const escapeCsvCell = (cell: any) => `"${String(cell).replace(/"/g, '""')}"`;
        
        const csvContent = [
            headers.join(','),
            ...examples.map(row => row.map(escapeCsvCell).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'stock-upload-template.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    const processImport = async () => {
        if (!fileToImport) return;
        const file = fileToImport;
        setImportStatus(null);
        setFileToImport(null);

        try {
            setImportStatus({ type: 'info', message: 'Reading and parsing file...' });

            const text = await file.text();
            
            const cleanedText = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
            const rows = cleanedText.trim().split(/\r?\n/).filter(row => row.trim() !== '');
            
            if (rows.length < 2) {
                throw new Error("CSV file must have a header and at least one data row.");
            }

            const header = rows[0].trim().split(',').map(h => h.trim().replace(/"/g, ''));
            const expectedHeader = ['Saree Code/ID', 'Saree Name', 'Quantity', 'Purchase Price', 'Sale Price', 'GST %'];

            if (header.length !== expectedHeader.length || !header.every((h, i) => h.toLowerCase() === expectedHeader[i].toLowerCase())) {
                throw new Error(`Invalid CSV header. Expected: "${expectedHeader.join(', ')}". Found: "${header.join(', ')}"`);
            }

            const itemsToAdd: PurchaseItem[] = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i].trim().split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(cell => cell.trim().replace(/^"|"$/g, ''));
                if (row.length !== expectedHeader.length) {
                    throw new Error(`Row ${i + 1} has an incorrect number of columns. Expected ${expectedHeader.length}, found ${row.length}.`);
                }

                const [id, name, quantity, purchasePrice, salePrice, gstPercent] = row;

                const quantityNum = parseInt(quantity, 10);
                const purchasePriceNum = parseFloat(purchasePrice);
                const salePriceNum = parseFloat(salePrice);
                const gstPercentNum = parseFloat(gstPercent);

                if (!id || !name || isNaN(quantityNum) || isNaN(purchasePriceNum) || isNaN(salePriceNum) || isNaN(gstPercentNum) || quantityNum < 0) {
                    throw new Error(`Row ${i + 1} contains invalid or missing data. Please check all fields. [ID: ${id}, Name: ${name}, Qty: ${quantity}, etc.]`);
                }

                itemsToAdd.push({ 
                    productId: id, 
                    productName: name, 
                    quantity: quantityNum, 
                    price: purchasePriceNum, 
                    saleValue: salePriceNum, 
                    gstPercent: gstPercentNum 
                });
            }
            
            if (itemsToAdd.length === 0) {
                setImportStatus({ type: 'info', message: 'No valid product rows found in the file to import.' });
                return;
            }
            
            setItemsForReview(itemsToAdd);
            setImportStatus({ type: 'success', message: `Loaded ${itemsToAdd.length} items from CSV. Please review and confirm below.` });

        } catch (error) {
            console.error("Import failed:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            setImportStatus({ type: 'error', message: `Import failed: ${errorMessage}` });
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        setImportStatus(null);
        setFileToImport(null);
        const file = event.target.files?.[0];
        if (file) {
            setFileToImport(file);
        } else if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const cancelImport = () => {
        setImportStatus({ type: 'info', message: 'Import cancelled by user.' });
        setFileToImport(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };
    
    const ImportReviewModal = () => {
        if (!itemsForReview) return null;

        const handleReviewItemChange = (index: number, field: keyof PurchaseItem | 'saleValue', value: string) => {
            const updatedItems = [...itemsForReview];
            const itemToUpdate = { ...updatedItems[index] };
            
            const numValue = parseFloat(value);
            if (!isNaN(numValue)) {
                 (itemToUpdate as any)[field] = numValue;
            } else {
                 (itemToUpdate as any)[field] = value;
            }
    
            updatedItems[index] = itemToUpdate;
            setItemsForReview(updatedItems);
        };
    
        const handleRemoveReviewItem = (index: number) => {
            setItemsForReview(itemsForReview.filter((_, i) => i !== index));
        };
    
        const handleConfirmImport = () => {
            setItems(prevItems => [...prevItems, ...itemsForReview]);
            setItemsForReview(null);
            setImportStatus({ type: 'success', message: `${itemsForReview.length} items successfully added to the purchase list.` });
        };
    
        const handleCancelReview = () => {
            setItemsForReview(null);
            setImportStatus({ type: 'info', message: 'Import review cancelled.' });
        };

        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                <Card title="Review Imported Stock" className="w-full max-w-3xl flex flex-col" style={{maxHeight: '90vh'}}>
                    <p className="text-sm text-gray-600 mb-4">Verify the details below. You can edit any field or remove items before adding them to the purchase.</p>
                    <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                        {itemsForReview.map((item, index) => (
                            <div key={index} className="p-3 bg-gray-50 rounded-lg border relative">
                                <button onClick={() => handleRemoveReviewItem(index)} className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-100 rounded-full">
                                    <Trash2 size={16} />
                                </button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                    <div>
                                        <label className="text-xs font-medium">Saree Code/ID</label>
                                        <input type="text" value={item.productId} onChange={e => handleReviewItemChange(index, 'productId', e.target.value)} className="w-full p-1 border rounded text-sm"/>
                                    </div>
                                     <div>
                                        <label className="text-xs font-medium">Saree Name</label>
                                        <input type="text" value={item.productName} onChange={e => handleReviewItemChange(index, 'productName', e.target.value)} className="w-full p-1 border rounded text-sm"/>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-medium">Quantity</label>
                                            <input type="number" value={item.quantity} onChange={e => handleReviewItemChange(index, 'quantity', e.target.value)} className="w-full p-1 border rounded text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium">GST %</label>
                                            <input type="number" value={item.gstPercent} onChange={e => handleReviewItemChange(index, 'gstPercent', e.target.value)} className="w-full p-1 border rounded text-sm"/>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-xs font-medium">Purchase Price</label>
                                            <input type="number" value={item.price} onChange={e => handleReviewItemChange(index, 'price', e.target.value)} className="w-full p-1 border rounded text-sm"/>
                                        </div>
                                        <div>
                                            <label className="text-xs font-medium">Sale Price</label>
                                            <input type="number" value={item.saleValue} onChange={e => handleReviewItemChange(index, 'saleValue', e.target.value)} className="w-full p-1 border rounded text-sm"/>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2 pt-4 mt-4 border-t">
                        <Button onClick={handleConfirmImport} className="w-full" disabled={itemsForReview.length === 0}>
                           Confirm & Add to Purchase
                        </Button>
                        <Button onClick={handleCancelReview} variant="secondary" className="w-full">
                            Cancel
                        </Button>
                    </div>
                </Card>
            </div>
        )
    };
    
     const QRScannerModal: React.FC = () => {
        const [scanStatus, setScanStatus] = useState<string>("Click 'Start Scanning' to activate camera.");
        const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

        const startScan = () => {
            if (!html5QrCodeRef.current) return;
            setScanStatus("Requesting camera permissions...");

            const qrCodeSuccessCallback = (decodedText: string) => {
                 if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().then(() => {
                        setIsScanning(false);
                        handleProductScanned(decodedText);
                    });
                }
            };
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCodeRef.current.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
                .then(() => setScanStatus("Scanning for QR Code..."))
                .catch(err => {
                    setScanStatus(`Camera Permission Error. Please allow camera access for this site in your browser's settings.`);
                    console.error("Camera start failed.", err);
                });
        };

        useEffect(() => {
            html5QrCodeRef.current = new Html5Qrcode("qr-reader-purchase");
            return () => {
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().catch(err => console.error("Cleanup stop scan failed.", err));
                }
            };
        }, []);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
                <Card title="Scan Product QR Code" className="w-full max-w-md relative">
                    <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                        <X size={20}/>
                     </button>
                    <div id="qr-reader-purchase" className="w-full mt-4"></div>
                    <p className="text-center text-sm my-2 text-gray-600">{scanStatus}</p>
                    <Button onClick={startScan} className="w-full">Start Scanning</Button>
                </Card>
            </div>
        );
    };

    const PaymentModal = () => {
        const purchase = state.purchases.find(p => p.id === paymentModalState.purchaseId);
        if (!paymentModalState.isOpen || !purchase) return null;
        const amountPaid = purchase.payments.reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = purchase.totalAmount - amountPaid;
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card title="Add Payment to Supplier" className="w-full max-w-sm">
                    <div className="space-y-4">
                        <p>Invoice Total: <span className="font-bold">₹{purchase.totalAmount.toLocaleString('en-IN')}</span></p>
                        <p>Amount Due: <span className="font-bold text-red-600">₹{dueAmount.toLocaleString('en-IN')}</span></p>
                        <input type="number" placeholder="Amount" value={paymentDetails.amount} onChange={e => setPaymentDetails({ ...paymentDetails, amount: e.target.value })} className="w-full p-2 border rounded" autoFocus/>
                        <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any })} className="w-full p-2 border rounded custom-select">
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CHEQUE">Cheque</option>
                        </select>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                            <input type="date" value={paymentDetails.date} onChange={e => setPaymentDetails({ ...paymentDetails, date: e.target.value })} className="w-full p-2 border rounded"/>
                        </div>
                        <div className="flex gap-2">
                           <Button onClick={handleAddPaymentToPurchase} className="w-full">Save Payment</Button>
                           <Button onClick={() => setPaymentModalState({isOpen: false, purchaseId: null})} variant="secondary" className="w-full">Cancel</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    };
    
    if (selectedSupplier && editedSupplier) {
        const supplierPurchases = state.purchases.filter(p => p.supplierId === selectedSupplier.id);
        const supplierReturns = state.returns.filter(r => r.type === 'SUPPLIER' && r.partyId === selectedSupplier.id);
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setEditedSupplier({ ...editedSupplier, [e.target.name]: e.target.value });
        };
        return (
            <div className="space-y-4">
                {paymentModalState.isOpen && <PaymentModal />}
                <Button onClick={() => setSelectedSupplier(null)}>&larr; Back to Purchases</Button>
                <Card>
                     <div className="flex justify-between items-start mb-4">
                        <h2 className="text-lg font-bold text-primary">Supplier Details: {selectedSupplier.name}</h2>
                        <div className="flex gap-2 items-center">
                          {isEditing ? (
                              <>
                                  <Button onClick={handleUpdateSupplier} className="h-9 px-3"><Save size={16} /> Save</Button>
                                  <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                                      <X size={20}/>
                                  </button>
                              </>
                          ) : (
                              <>
                                <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit</Button>
                                <Button onClick={() => handleDeleteSupplier(selectedSupplier.id)} variant="danger"><Trash2 size={16}/> Delete</Button>
                              </>
                          )}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <div><label className="text-sm font-medium">Name</label><input type="text" name="name" value={editedSupplier.name} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Phone</label><input type="text" name="phone" value={editedSupplier.phone} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Location</label><input type="text" name="location" value={editedSupplier.location} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
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
                                                <p className={`text-sm font-bold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isPaid ? 'Paid' : `Due: ₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                                </p>
                                            </div>
                                            <p className="font-bold text-lg text-primary">
                                                ₹{purchase.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                      </div>
                                       <div className="flex items-center ml-4 flex-shrink-0">
                                            <button onClick={() => setPurchaseToEdit(purchase)} className="p-2 rounded-full text-blue-500 hover:bg-blue-100 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDeletePurchase(purchase.id)} className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                       </div>
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
                        <p className="text-gray-500">No purchases recorded from this supplier.</p>
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
                                        <p className="font-semibold text-primary">Credit: ₹{ret.amount.toLocaleString('en-IN')}</p>
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
                        <p className="text-gray-500">No items have been returned to this supplier.</p>
                    )}
                </Card>
            </div>
        );
    }

    const canCompletePurchase = supplierId && items.length > 0;
    const canRecordPayment = supplierId && items.length === 0 && parseFloat(paymentAmount || '0') > 0;
    const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);

    const ImportStatusNotification = () => {
        if (!importStatus) return null;

        const baseClasses = "p-3 rounded-md text-sm flex items-start justify-between";
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
            <div className={`${baseClasses} ${variants[importStatus.type]}`}>
                <div className="flex items-start">
                    {icons[importStatus.type]}
                    <span>{importStatus.message}</span>
                </div>
                <button onClick={() => setImportStatus(null)} className="font-bold text-lg leading-none ml-4">&times;</button>
            </div>
        );
    };

    const ConfirmationNotification: React.FC<{ file: File; onConfirm: () => void; onCancel: () => void; }> = ({ file, onConfirm, onCancel }) => {
        return (
            <div className="p-3 rounded-md text-sm flex flex-col items-start justify-between bg-amber-100 text-amber-800 space-y-3">
                <div className="flex items-start">
                    <Info className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span>
                        Confirm import of file: <strong>{file.name}</strong>. This will add the items to the current purchase for review.
                    </span>
                </div>
                <div className="flex gap-2 self-end w-full sm:w-auto">
                    <Button onClick={onConfirm} variant="primary" className="py-1 px-3 text-sm flex-grow sm:flex-grow-0">Confirm</Button>
                    <Button onClick={onCancel} variant="secondary" className="py-1 px-3 text-sm flex-grow sm:flex-grow-0">Cancel</Button>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {isScanning && <QRScannerModal />}
            {itemsForReview && <ImportReviewModal />}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <h1 className="text-2xl font-bold text-primary">Purchases & Suppliers</h1>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-2">
                <Button className="w-full sm:w-auto" onClick={() => { setView('add_purchase'); setSelectedSupplier(null); clearPurchaseFormFields(); }}><Plus className="w-4 h-4 mr-2" />Add Purchase/Payment</Button>
                <Button className="w-full sm:w-auto" onClick={() => { setView('add_supplier'); setSelectedSupplier(null); }} variant="secondary"><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
            </div>
            
            {view === 'list' && (
                <Card title="Supplier Overview">
                    {state.suppliers.length > 0 ? (
                        <div className="space-y-3">
                            {state.suppliers.map(supplier => {
                                const supplierPurchases = state.purchases.filter(p => p.supplierId === supplier.id);
                                const totalPurchase = supplierPurchases.reduce((sum, p) => sum + p.totalAmount, 0);
                                const totalPaid = supplierPurchases.reduce((sum, p) => sum + (p.payments || []).reduce((pSum, payment) => pSum + payment.amount, 0), 0);
                                const totalDue = totalPurchase - totalPaid;

                                return (
                                    <Card 
                                        key={supplier.id} 
                                        className="cursor-pointer hover:shadow-lg transition-shadow"
                                        onClick={() => setSelectedSupplier(supplier)}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-lg text-primary">{supplier.name}</p>
                                                <p className="text-sm text-gray-500">{supplier.location}</p>
                                            </div>
                                             <div className="text-right flex-shrink-0 ml-4">
                                                <div className="flex items-center justify-end gap-1 text-blue-600">
                                                    <Package size={14} />
                                                    <span className="font-semibold">₹{totalPurchase.toLocaleString('en-IN')}</span>
                                                </div>
                                                 <div className={`flex items-center justify-end gap-1 ${totalDue > 0.01 ? 'text-red-600' : 'text-gray-600'}`}>
                                                    <IndianRupee size={14} />
                                                    <span className="font-semibold">₹{totalDue.toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500">No suppliers added yet. Click "Add Supplier" to start.</p>
                    )}
                </Card>
            )}

            {view === 'add_supplier' && (
                 <Card title="New Supplier">
                     <div className="space-y-2">
                         <input className="w-full p-2 border rounded" placeholder="Supplier Name" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                         <input className="w-full p-2 border rounded" placeholder="Phone" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                         <input className="w-full p-2 border rounded" placeholder="Location" value={newSupplier.location} onChange={e => setNewSupplier({...newSupplier, location: e.target.value})} />
                         <Button onClick={handleAddSupplier} className="w-full">Save Supplier</Button>
                         <Button onClick={() => setView('list')} variant="secondary" className="w-full">Cancel</Button>
                     </div>
                 </Card>
            )}
            
            {view === 'add_purchase' && (
                 <div className="space-y-4">
                     <Card>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                        <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full p-2 border rounded custom-select">
                            <option value="">Select Supplier</option>
                            {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </Card>
                     <Card title="Purchase Items">
                         {items.length > 0 && (
                            <div className="space-y-2 mb-4">
                                {items.map((item, index) => (
                                    <div key={index} className="p-2 bg-gray-100 rounded text-sm flex justify-between">
                                        <span>{item.productName} (x{item.quantity})</span>
                                        <span>@ ₹{item.price.toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                         ) }
                         <div className="pt-4 border-t space-y-3">
                            <h3 className="font-semibold">Add Items to Purchase</h3>
                            <p className="text-sm text-gray-600">You can add items manually below, or import multiple items from a CSV file.</p>
                            
                            <ImportStatusNotification />
                            {fileToImport && (
                                <ConfirmationNotification
                                    file={fileToImport}
                                    onConfirm={processImport}
                                    onCancel={cancelImport}
                                />
                            )}
                            
                            <input 
                              type="file" 
                              accept=".csv" 
                              ref={fileInputRef} 
                              className="hidden" 
                              onChange={handleFileSelect}
                            />
                            <div className="flex flex-col sm:flex-row gap-2">
                                <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full" disabled={!supplierId}>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import from CSV
                                </Button>
                                <Button onClick={handleDownloadTemplate} variant="secondary" className="w-full">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download Template
                                </Button>
                            </div>
                             {!supplierId && <p className="text-xs text-red-500 text-center">Please select a supplier to enable CSV import.</p>}
                        </div>
                         <div className="pt-4 border-t space-y-4 mt-4">
                            <h3 className="font-semibold">Add New Item Manually</h3>
                             <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                                <Button onClick={() => setIsScanning(true)} variant="secondary" className="w-full sm:w-auto">
                                    <QrCode size={16} className="mr-2"/> Scan Saree Code/ID
                                </Button>
                                <div className="flex-grow w-full">
                                    <label htmlFor="productId" className="block text-sm font-medium text-gray-700">Saree Code/ID</label>
                                    <input id="productId" type="text" placeholder="Enter code manually" value={newItem.productId} onChange={e => setNewItem({...newItem, productId: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                            <div>
                                <label htmlFor="productName" className="block text-sm font-medium text-gray-700">Saree Name</label>
                                <input id="productName" type="text" placeholder="e.g., Kanchipuram Silk" value={newItem.productName} onChange={e => setNewItem({...newItem, productName: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">Quantity</label>
                                    <input id="quantity" type="number" placeholder="e.g., 10" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700">Purchase Price</label>
                                    <input id="purchasePrice" type="number" placeholder="e.g., 5000" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label htmlFor="gstPercent" className="block text-sm font-medium text-gray-700">GST %</label>
                                    <input id="gstPercent" type="number" placeholder="e.g., 5" value={newItem.gstPercent} onChange={e => setNewItem({...newItem, gstPercent: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                                <div>
                                    <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700">Sale Price</label>
                                    <input id="salePrice" type="number" placeholder="e.g., 12000" value={newItem.saleValue} onChange={e => setNewItem({...newItem, saleValue: e.target.value})} className="w-full p-2 border rounded" />
                                </div>
                            </div>
                            <Button onClick={handleAddItem} className="w-full"><Plus className="mr-2" size={16}/>Add Item to Purchase</Button>
                         </div>
                    </Card>
                     <Card title={items.length > 0 ? 'Add Payment (Optional)' : 'Record Payment'}>
                        <div className="space-y-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={items.length > 0 ? `Total is ₹${totalAmount.toLocaleString('en-IN')}` : 'Enter amount paid'} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded custom-select">
                                    <option value="CASH">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                                <input 
                                    type="date" 
                                    value={paymentDate} 
                                    onChange={e => setPaymentDate(e.target.value)} 
                                    className="w-full p-2 border rounded"
                                />
                            </div>
                        </div>
                    </Card>
                    
                    <div className="space-y-2">
                        {canCompletePurchase ? (
                            <Button onClick={handleAddOrUpdatePurchase} className="w-full">
                                {purchaseToEdit ? 'Update Purchase' : 'Complete Purchase'}
                            </Button>
                        ) : canRecordPayment ? (
                            <Button onClick={handleRecordStandalonePayment} className="w-full">
                                <IndianRupee className="w-4 h-4 mr-2" />
                                Record Standalone Payment
                            </Button>
                        ) : (
                            <Button className="w-full" disabled>
                                {supplierId ? 'Add items or enter payment amount' : 'Select a supplier to begin'}
                            </Button>
                        )}
                        <Button onClick={resetPurchaseForm} variant="secondary" className="w-full">Cancel</Button>
                    </div>

                </div>
            )}
        </div>
    );
};

export default PurchasesPage;