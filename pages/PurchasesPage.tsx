
import React, { useState, useEffect, useRef } from 'react';
import { Plus, IndianRupee, Edit, Save, X, Search, Package, Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Supplier, Purchase, Payment, Return, Page } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';
import DeleteButton from '../components/DeleteButton';
import PurchaseForm from '../components/AddPurchaseView';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Standalone PaymentModal component to prevent re-renders on parent state change
const PaymentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSubmit: () => void;
    purchase: Purchase | null | undefined;
    paymentDetails: { amount: string; method: 'CASH' | 'UPI' | 'CHEQUE'; date: string; reference: string; };
    setPaymentDetails: React.Dispatch<React.SetStateAction<{ amount: string; method: 'CASH' | 'UPI' | 'CHEQUE'; date: string; reference: string; }>>;
}> = ({ isOpen, onClose, onSubmit, purchase, paymentDetails, setPaymentDetails }) => {
    if (!isOpen || !purchase) return null;

    const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
    const dueAmount = Number(purchase.totalAmount) - amountPaid;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Add Payment" className="w-full max-w-sm animate-scale-in">
                <div className="space-y-4">
                    <p>Invoice Total: <span className="font-bold">₹{Number(purchase.totalAmount).toLocaleString('en-IN')}</span></p>
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
                       <Button onClick={onSubmit} className="w-full">Save Payment</Button>
                       <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

interface PurchasesPageProps {
  setIsDirty: (isDirty: boolean) => void;
  setCurrentPage: (page: Page) => void;
}

const PurchasesPage: React.FC<PurchasesPageProps> = ({ setIsDirty, setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [view, setView] = useState<'list' | 'add_supplier' | 'add_purchase' | 'edit_purchase'>('list');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [purchaseToEdit, setPurchaseToEdit] = useState<Purchase | null>(null);

    // State for 'add_supplier' view
    const [newSupplier, setNewSupplier] = useState({ id: '', name: '', phone: '', location: '', gstNumber: '', reference: '', account1: '', account2: '', upi: '' });
    
    // State for supplier detail view
    const [isEditing, setIsEditing] = useState(false);
    const [editedSupplier, setEditedSupplier] = useState<Supplier | null>(null);
    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, purchaseId: string | null }>({ isOpen: false, purchaseId: null });
    const [paymentDetails, setPaymentDetails] = useState({ amount: '', method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE', date: getLocalDateString(), reference: '' });
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, purchaseIdToDelete: string | null }>({ isOpen: false, purchaseIdToDelete: null });
    const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
    const [tempDueDates, setTempDueDates] = useState<string[]>([]);
    
    const isDirtyRef = useRef(false);

    useEffect(() => {
        if (state.selection && state.selection.page === 'PURCHASES') {
            if (state.selection.id === 'new') {
                setView('add_purchase');
                setSelectedSupplier(null);
            } else {
                const supplierToSelect = state.suppliers.find(s => s.id === state.selection.id);
                if (supplierToSelect) {
                    setSelectedSupplier(supplierToSelect);
                    setView('list'); // Ensure we are in list/detail view
                }
            }
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, state.suppliers, dispatch]);
    
    useEffect(() => {
        const addSupplierDirty = view === 'add_supplier' && !!(newSupplier.id || newSupplier.name || newSupplier.phone || newSupplier.location);
        const detailViewDirty = !!(selectedSupplier && (isEditing || editingScheduleId));
        const currentlyDirty = addSupplierDirty || detailViewDirty;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [view, newSupplier, selectedSupplier, isEditing, editingScheduleId, setIsDirty]);

    // On unmount, we must always clean up.
    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);
    
    // Effect to keep selectedSupplier data in sync with global state.
    // This runs if the global supplier data changes while viewing a supplier.
    useEffect(() => {
        if (selectedSupplier) {
            const currentSupplierData = state.suppliers.find(s => s.id === selectedSupplier.id);
            // Deep comparison to avoid re-render loops if data hasn't changed
            if (JSON.stringify(currentSupplierData) !== JSON.stringify(selectedSupplier)) {
                setSelectedSupplier(currentSupplierData || null);
            }
        }
    }, [selectedSupplier?.id, state.suppliers]);

    // Effect to reset the editing form for the supplier's details when the selected supplier changes.
    useEffect(() => {
        if (selectedSupplier) {
            setEditedSupplier(selectedSupplier);
        }
        setIsEditing(false); // Always reset edit mode when supplier changes
    }, [selectedSupplier]);
    
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
        
        const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const dueAmount = Number(purchase.totalAmount) - amountPaid;
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

    const handleEditReturn = (returnId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'RETURNS', id: returnId, action: 'edit' } });
        setCurrentPage('RETURNS');
    };
    
    const handleCompletePurchase = (purchaseData: Purchase) => {
        dispatch({ type: 'ADD_PURCHASE', payload: purchaseData });
        purchaseData.items.forEach(item => {
            dispatch({
                type: 'ADD_PRODUCT',
                payload: {
                    id: item.productId,
                    name: item.productName,
                    quantity: Number(item.quantity),
                    purchasePrice: Number(item.price),
                    salePrice: Number(item.saleValue),
                    gstPercent: Number(item.gstPercent),
                }
            });
        });

        showToast("Purchase recorded successfully! Inventory updated.");
        setView('list');
    };

    const handleUpdatePurchase = (updatedPurchase: Purchase) => {
        if (!purchaseToEdit) {
            showToast("Error updating purchase: Original data not found.", 'info');
            return;
        }

        dispatch({ type: 'UPDATE_PURCHASE', payload: { oldPurchase: purchaseToEdit, updatedPurchase } });
        showToast("Purchase updated successfully!");
        
        // Return to the supplier detail view by setting the view to 'list'.
        // The component will re-render, and since 'selectedSupplier' is still set,
        // it will correctly display the detail view with the updated data.
        setView('list');
        setPurchaseToEdit(null); // Clean up the state
    };
    
    const generateDebitNotePDF = async (newReturn: Return) => {
        const profile = state.profile;
        const supplier = state.suppliers.find(s => s.id === newReturn.partyId);

        if (!profile || !supplier) {
            alert("Could not generate PDF. Missing profile or supplier information.");
            return;
        }

        const doc = new jsPDF();
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('DEBIT NOTE', 105, 15, { align: 'center' });
        
        doc.setFontSize(12);
        doc.text(profile.name, 14, 25);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const addressLines = doc.splitTextToSize(profile.address, 80);
        doc.text(addressLines, 14, 30);
        let currentY = 30 + (addressLines.length * 5);
        if (profile.phone) doc.text(`Phone: ${profile.phone}`, 14, currentY);
        if (profile.gstNumber) { currentY += 5; doc.text(`GSTIN: ${profile.gstNumber}`, 14, currentY); }
        
        doc.setFont('helvetica', 'bold');
        doc.text('To:', 120, 25);
        doc.setFont('helvetica', 'normal');
        doc.text(supplier.name, 120, 30);
        const supplierAddressLines = doc.splitTextToSize(supplier.location, 80);
        doc.text(supplierAddressLines, 120, 35);

        currentY += 15;
        doc.setDrawColor(100);
        doc.line(14, currentY, 196, currentY);
        currentY += 8;

        doc.setFont('helvetica', 'bold');
        doc.text(`Debit Note No:`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(newReturn.id, 55, currentY);
        doc.setFont('helvetica', 'bold');
        doc.text(`Date:`, 120, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(new Date(newReturn.returnDate).toLocaleDateString(), 135, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'bold');
        doc.text(`Original Inv. No:`, 14, currentY);
        doc.setFont('helvetica', 'normal');
        doc.text(newReturn.referenceId, 55, currentY);
        currentY += 10;
        
        autoTable(doc, {
            startY: currentY,
            head: [['#', 'Description', 'Qty', 'Rate', 'Amount']],
            body: newReturn.items.map((item, index) => [
                index + 1,
                item.productName,
                item.quantity,
                `Rs. ${Number(item.price).toLocaleString('en-IN')}`,
                `Rs. ${(Number(item.quantity) * Number(item.price)).toLocaleString('en-IN')}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] },
            columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Return Value:', 140, currentY, { align: 'right' });
        doc.text(`Rs. ${Number(newReturn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 196, currentY, { align: 'right' });
        
        if (newReturn.notes) {
            currentY += 15;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text('Notes:', 14, currentY);
            doc.setFont('helvetica', 'normal');
            currentY += 5;
            const notesLines = doc.splitTextToSize(newReturn.notes, 182);
            doc.text(notesLines, 14, currentY);
        }
        
        currentY = doc.internal.pageSize.height - 30;
        doc.line(130, currentY, 196, currentY);
        currentY += 5;
        doc.text('Authorised Signatory', 163, currentY, { align: 'center' });

        doc.save(`DebitNote-${newReturn.id}.pdf`);
    };

    // --- Main Component Render Logic ---

    // Highest priority views: forms for adding/editing purchases
    if (view === 'add_purchase' || view === 'edit_purchase') {
       return (
            <PurchaseForm
                mode={view === 'add_purchase' ? 'add' : 'edit'}
                initialData={purchaseToEdit}
                suppliers={state.suppliers}
                products={state.products}
                onSubmit={view === 'add_purchase' ? handleCompletePurchase : handleUpdatePurchase}
                onBack={() => { setView('list'); setPurchaseToEdit(null); }}
                setIsDirty={setIsDirty}
                dispatch={dispatch}
                showToast={showToast}
            />
        );
    }

    // View for adding a new supplier
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
                        <input type="text" placeholder="Name*" value={newSupplier.name} onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Phone*" value={newSupplier.phone} onChange={e => setNewSupplier({ ...newSupplier, phone: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Location*" value={newSupplier.location} onChange={e => setNewSupplier({ ...newSupplier, location: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="GST Number (Optional)" value={newSupplier.gstNumber} onChange={e => setNewSupplier({ ...newSupplier, gstNumber: e.target.value })} className="w-full p-2 border rounded" />
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
    
    // View for a selected supplier's details
    if (selectedSupplier) {
        const supplierPurchases = state.purchases.filter(p => p.supplierId === selectedSupplier.id);
        const supplierReturns = state.returns.filter(r => r.type === 'SUPPLIER' && r.partyId === selectedSupplier.id);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            if (editedSupplier) {
                setEditedSupplier({ ...editedSupplier, [e.target.name]: e.target.value });
            }
        };
        
        const handleEditScheduleClick = (purchase: Purchase) => {
            setEditingScheduleId(purchase.id);
            setTempDueDates(purchase.paymentDueDates || []);
        };
        
        const handleTempDateChange = (index: number, value: string) => {
            const newDates = [...tempDueDates];
            newDates[index] = value;
            setTempDueDates(newDates);
        };

        const addTempDate = () => {
            setTempDueDates([...tempDueDates, getLocalDateString()]);
        };

        const removeTempDate = (index: number) => {
            setTempDueDates(tempDueDates.filter((_, i) => i !== index));
        };
        
        const handleSaveSchedule = (purchaseToUpdate: Purchase) => {
            const updatedPurchase: Purchase = {
                ...purchaseToUpdate,
                paymentDueDates: tempDueDates.filter(date => date).sort(),
            };

            const oldPurchase = state.purchases.find(p => p.id === purchaseToUpdate.id);
            if (!oldPurchase) {
                showToast("Could not find original purchase to update.", "info");
                return;
            }

            dispatch({ type: 'UPDATE_PURCHASE', payload: { oldPurchase, updatedPurchase } });
            showToast("Payment schedule updated successfully.");
            setEditingScheduleId(null);
            setTempDueDates([]);
        };

        return (
            <div className="space-y-4">
                <ConfirmationModal isOpen={confirmModalState.isOpen} onClose={() => setConfirmModalState({isOpen: false, purchaseIdToDelete: null})} onConfirm={confirmDeletePurchase} title="Confirm Purchase Deletion">
                    Are you sure you want to delete this purchase? This will remove the items from your stock. This action cannot be undone.
                </ConfirmationModal>
                <PaymentModal
                    isOpen={paymentModalState.isOpen}
                    onClose={() => setPaymentModalState({isOpen: false, purchaseId: null})}
                    onSubmit={handleAddPayment}
                    purchase={state.purchases.find(p => p.id === paymentModalState.purchaseId)}
                    paymentDetails={paymentDetails}
                    setPaymentDetails={setPaymentDetails}
                />
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
                            <div><label className="text-sm font-medium">Reference</label><input type="text" name="reference" value={editedSupplier.reference || ''} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Account 1</label><input type="text" name="account1" value={editedSupplier.account1 || ''} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Account 2</label><input type="text" name="account2" value={editedSupplier.account2 || ''} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">UPI ID</label><input type="text" name="upi" value={editedSupplier.upi || ''} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                        </div>
                    ) : (
                        <div className="space-y-1 text-gray-700">
                             <p><strong>ID:</strong> {selectedSupplier.id}</p>
                            <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
                            <p><strong>Location:</strong> {selectedSupplier.location}</p>
                            {selectedSupplier.gstNumber && <p><strong>GSTIN:</strong> {selectedSupplier.gstNumber}</p>}
                            {selectedSupplier.reference && <p><strong>Reference:</strong> {selectedSupplier.reference}</p>}
                            {selectedSupplier.account1 && <p><strong>Account 1:</strong> {selectedSupplier.account1}</p>}
                            {selectedSupplier.account2 && <p><strong>Account 2:</strong> {selectedSupplier.account2}</p>}
                            {selectedSupplier.upi && <p><strong>UPI ID:</strong> {selectedSupplier.upi}</p>}
                        </div>
                    )}
                </Card>
                <Card title="Purchase History">
                    {supplierPurchases.length > 0 ? (
                        <div className="space-y-4">
                            {supplierPurchases.slice().reverse().map(purchase => {
                                const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                                const dueAmount = Number(purchase.totalAmount) - amountPaid;
                                const isPaid = dueAmount <= 0.01;
                                const isEditingThisSchedule = editingScheduleId === purchase.id;

                                const totalGst = purchase.items.reduce((sum, item) => {
                                    const itemTotal = Number(item.price) * Number(item.quantity);
                                    const itemGst = itemTotal - (itemTotal / (1 + (Number(item.gstPercent) / 100)));
                                    return sum + itemGst;
                                }, 0);
                                const subTotal = Number(purchase.totalAmount) - totalGst;

                                return (
                                <div key={purchase.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">{new Date(purchase.date).toLocaleString([], { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</p>
                                            <p className="text-xs text-gray-500 mt-1">Internal ID: {purchase.id}</p>
                                            {purchase.supplierInvoiceId && <p className="text-xs text-gray-500">Supplier Invoice: {purchase.supplierInvoiceId}</p>}
                                            <p className={`font-bold mt-1 text-red-600`}>
                                                Due: ₹{dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <div className="flex items-center gap-1">
                                                <p className="font-bold text-lg text-primary">₹{Number(purchase.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                                                <button onClick={() => { setPurchaseToEdit(purchase); setView('edit_purchase'); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" aria-label="Edit Purchase">
                                                    <Edit size={16} />
                                                </button>
                                                <DeleteButton 
                                                    variant="delete" 
                                                    onClick={(e) => { e.stopPropagation(); handleDeletePurchase(purchase.id); }} 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-1">Items:</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                {purchase.items.map((item, index) => (
                                                    <li key={index}>
                                                        {item.productName} (x{item.quantity}) @ ₹{Number(item.price).toLocaleString('en-IN')}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="p-2 bg-white rounded-md text-sm border">
                                            <h4 className="font-semibold text-gray-700 mb-2">Transaction Details:</h4>
                                            <div className="space-y-1">
                                                <div className="flex justify-between"><span>Subtotal (excl. GST):</span> <span>₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                <div className="flex justify-between"><span>GST Amount:</span> <span>+ ₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                                <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Grand Total:</span> <span>₹{Number(purchase.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                            </div>
                                        </div>

                                        <div className="p-2 bg-white rounded-md text-sm border">
                                            <h4 className="font-semibold text-gray-700 mb-2">Payment Schedule</h4>
                                            {isEditingThisSchedule ? (
                                                <div className="space-y-2">
                                                    {tempDueDates.map((date, index) => (
                                                        <div key={index} className="flex items-center gap-2">
                                                            <input type="date" value={date} onChange={(e) => handleTempDateChange(index, e.target.value)} className="w-full p-2 border rounded" />
                                                            <DeleteButton variant="remove" onClick={() => removeTempDate(index)} />
                                                        </div>
                                                    ))}
                                                    <Button onClick={addTempDate} variant="secondary" className="w-full py-1 text-xs">
                                                        <Plus size={14} className="mr-1"/> Add Date
                                                    </Button>
                                                    <div className="flex gap-2 pt-2 border-t mt-2">
                                                        <Button onClick={() => handleSaveSchedule(purchase)} className="flex-grow py-1">Save</Button>
                                                        <Button onClick={() => setTempDueDates([])} variant="secondary" className="bg-red-100 text-red-700 hover:bg-red-200 py-1">Clear All</Button>
                                                        <Button onClick={() => { setEditingScheduleId(null); setTempDueDates([]); }} variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300 py-1">Cancel</Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex justify-between items-start">
                                                    {(purchase.paymentDueDates && purchase.paymentDueDates.length > 0) ? (
                                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                            {purchase.paymentDueDates.map((dateStr, index) => {
                                                                const today = new Date(); today.setHours(0, 0, 0, 0);
                                                                const dueDate = new Date(dateStr + 'T00:00:00');
                                                                const isOverdue = dueDate < today;
                                                                return (
                                                                    <li key={index} className={`${isOverdue ? 'text-red-600 font-bold' : ''}`}>
                                                                        {dueDate.toLocaleDateString('en-IN')} {isOverdue && '(Overdue)'}
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    ) : <p className="text-xs text-gray-500">No due dates scheduled.</p>}
                                                    <Button onClick={() => handleEditScheduleClick(purchase)} variant="secondary" className="py-1 px-2 text-xs">
                                                        <Edit size={14}/> Edit
                                                    </Button>
                                                </div>
                                            )}
                                        </div>

                                        {(purchase.payments || []).length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-700 mb-1">Payments Made:</h4>
                                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                    {(purchase.payments || []).map(p => (
                                                    <li key={p.id}>
                                                        ₹{Number(p.amount).toLocaleString('en-IN')} {p.method === 'RETURN_CREDIT' ? <span className="text-blue-600 font-semibold">(Return Credit)</span> : `via ${p.method}`} on {new Date(p.date).toLocaleDateString()}
                                                        {p.reference && <span className="text-xs text-gray-500 block">Ref: {p.reference}</span>}
                                                    </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        
                                        {!isPaid && (
                                            <div className="pt-2">
                                                <Button onClick={() => setPaymentModalState({ isOpen: true, purchaseId: purchase.id })} className="w-full">
                                                    <Plus size={16} className="mr-2"/> Add Payment
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : <p className="text-gray-500">No purchases recorded for this supplier.</p>}
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
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-primary">Credit: ₹{Number(ret.amount).toLocaleString('en-IN')}</p>
                                            <button 
                                                onClick={() => handleEditReturn(ret.id)}
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" 
                                                aria-label="Edit Return"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => generateDebitNotePDF(ret)} 
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" 
                                                aria-label="Download Debit Note"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
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
    
    // Default 'list' view: Show supplier list
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
                        const totalSpent = supplierPurchases.reduce((sum, p) => sum + Number(p.totalAmount), 0);
                        const totalPaid = supplierPurchases.reduce((sum, p) => sum + (p.payments || []).reduce((pSum, payment) => pSum + Number(payment.amount), 0), 0);
                        const totalDue = totalSpent - totalPaid;

                        return (
                            <div 
                                key={supplier.id} 
                                onClick={() => setSelectedSupplier(supplier)} 
                                className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-teal-50 border animate-slide-up-fade"
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
