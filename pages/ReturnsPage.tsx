import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Undo2, Users, Package, Plus, Share2, Edit, Save, X, Download } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Return, ReturnItem, Sale, Purchase } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type ReturnType = 'CUSTOMER' | 'SUPPLIER';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface ReturnsPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const ReturnsPage: React.FC<ReturnsPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [returnToEdit, setReturnToEdit] = useState<Return | null>(null);

    const [activeTab, setActiveTab] = useState<ReturnType>('CUSTOMER');
    const [partyId, setPartyId] = useState<string>('');
    const [referenceId, setReferenceId] = useState<string>('');
    const [itemsToReturn, setItemsToReturn] = useState<ReturnItem[]>([]);
    const [returnDate, setReturnDate] = useState(getLocalDateString());
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');
    const [returnNotes, setReturnNotes] = useState('');
    const isDirtyRef = useRef(false);

    useEffect(() => {
        const currentlyDirty = !!partyId || !!referenceId || itemsToReturn.length > 0;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [partyId, referenceId, itemsToReturn, setIsDirty]);

    // On unmount, we must always clean up.
    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);

    const resetForm = () => {
        setMode('add');
        setReturnToEdit(null);
        setPartyId('');
        setReferenceId('');
        setItemsToReturn([]);
        setReturnDate(getLocalDateString());
        setAmount('');
        setReason('');
        setReturnNotes('');
    };

    const handleEditClick = (returnItem: Return) => {
        setMode('edit');
        setReturnToEdit(returnItem);
        setActiveTab(returnItem.type);
        setPartyId(returnItem.partyId);
        setReferenceId(returnItem.referenceId);
        setItemsToReturn(returnItem.items);
        setReturnDate(getLocalDateString(new Date(returnItem.returnDate)));
        setAmount(String(returnItem.amount));
        setReason(returnItem.reason || '');
        setReturnNotes(returnItem.notes || '');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast('Editing Return. Make your changes and click "Update Return".', 'info');
    };

    const handleItemQuantityChange = (productId: string, productName: string, price: number, newQuantityStr: string) => {
        const newQuantity = parseInt(newQuantityStr, 10);
        if (isNaN(newQuantity) || newQuantity < 0) return;

        const originalInvoice = activeTab === 'CUSTOMER' 
            ? state.sales.find(s => s.id === referenceId)
            : state.purchases.find(p => p.id === referenceId);

        const originalItem = originalInvoice?.items.find(i => i.productId === productId);

        const maxQuantity = originalItem?.quantity || 0;

        if (newQuantity > maxQuantity) {
            alert(`Cannot return more than the purchased quantity of ${maxQuantity}.`);
            return;
        }

        const existingItemIndex = itemsToReturn.findIndex(item => item.productId === productId);
        if (newQuantity > 0) {
            const updatedItem: ReturnItem = { productId, productName, price, quantity: newQuantity };
            if (existingItemIndex > -1) {
                setItemsToReturn(itemsToReturn.map((item, index) => index === existingItemIndex ? updatedItem : item));
            } else {
                setItemsToReturn([...itemsToReturn, updatedItem]);
            }
        } else {
            if (existingItemIndex > -1) {
                setItemsToReturn(itemsToReturn.filter(item => item.productId !== productId));
            }
        }
    };
    
    const generateSupplierReturnPDF = async (newReturn: Return) => {
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
                `Rs. ${item.price.toLocaleString('en-IN')}`,
                `Rs. ${(item.quantity * item.price).toLocaleString('en-IN')}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [106, 13, 173] },
            columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Total Return Value:', 140, currentY, { align: 'right' });
        doc.text(`Rs. ${newReturn.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 196, currentY, { align: 'right' });
        
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

    const handleFormSubmit = async () => {
        if (!partyId || !referenceId || itemsToReturn.length === 0 || !amount) {
            alert('Please fill all required fields: select a party, an invoice, at least one item, and the return amount.');
            return;
        }

        if (mode === 'add') {
            const newReturn: Return = {
                id: `RET-${Date.now()}`,
                type: activeTab,
                partyId, referenceId, items: itemsToReturn,
                returnDate: new Date(returnDate).toISOString(),
                amount: parseFloat(amount),
                reason, notes: returnNotes,
            };

            if (activeTab === 'SUPPLIER') await generateSupplierReturnPDF(newReturn);

            dispatch({ type: 'ADD_RETURN', payload: newReturn });
            showToast(`${activeTab} return processed successfully!`);
        } else if (mode === 'edit' && returnToEdit) {
            const updatedReturn: Return = {
                ...returnToEdit,
                items: itemsToReturn,
                returnDate: new Date(returnDate).toISOString(),
                amount: parseFloat(amount),
                reason, notes: returnNotes,
            };
            dispatch({ type: 'UPDATE_RETURN', payload: { oldReturn: returnToEdit, updatedReturn }});
            showToast('Return updated successfully!');
        }
        resetForm();
    };

    const partyList = activeTab === 'CUSTOMER' ? state.customers : state.suppliers;
    const invoiceList = useMemo(() => {
        if (!partyId) return [];
        return activeTab === 'CUSTOMER'
            ? state.sales.filter(s => s.customerId === partyId)
            : state.purchases.filter(p => p.supplierId === partyId);
    }, [partyId, activeTab, state.sales, state.purchases]);

    const selectedInvoiceItems = useMemo(() => {
        if (!referenceId) return [];
        const invoice: Sale | Purchase | undefined = activeTab === 'CUSTOMER'
            ? state.sales.find(s => s.id === referenceId)
            : state.purchases.find(p => p.id === referenceId);
        return invoice?.items || [];
    }, [referenceId, activeTab, state.sales, state.purchases]);

    const invoiceFinancials = useMemo(() => {
        if (!referenceId) return null;

        const invoice: Sale | Purchase | undefined = activeTab === 'CUSTOMER'
            ? state.sales.find(s => s.id === referenceId)
            : state.purchases.find(p => p.id === referenceId);

        if (!invoice) return null;

        const totalAmount = invoice.totalAmount;
        const paidAmount = (invoice.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = totalAmount - paidAmount;

        return { totalAmount, paidAmount, dueAmount };
    }, [referenceId, activeTab, state.sales, state.purchases]);
    
    const allReturns = state.returns.slice().reverse();
    const pageTitle = mode === 'edit' ? `Editing Return: ${returnToEdit?.id}` : 'Process a New Return';

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Undo2 /> Returns Management</h1>

            <Card title={pageTitle}>
                {mode === 'add' ? (
                    <div className="mb-4 border-b">
                        <div className="flex">
                            <button onClick={() => { setActiveTab('CUSTOMER'); resetForm(); }} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'CUSTOMER' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Customer Return</button>
                            <button onClick={() => { setActiveTab('SUPPLIER'); resetForm(); }} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'SUPPLIER' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Return to Supplier</button>
                        </div>
                    </div>
                ) : (
                    <p className="mb-4 text-sm font-semibold text-gray-700">You are editing a {returnToEdit?.type.toLowerCase()} return.</p>
                )}
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}</label>
                        <select value={partyId} onChange={e => { setPartyId(e.target.value); setReferenceId(''); setItemsToReturn([]); }} className="w-full p-2 border rounded custom-select" disabled={mode === 'edit'}>
                            <option value="">Select {activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}</option>
                            {partyList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    {partyId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Original Invoice</label>
                            <select value={referenceId} onChange={e => { setReferenceId(e.target.value); setItemsToReturn([]); }} className="w-full p-2 border rounded custom-select" disabled={mode === 'edit'}>
                                <option value="">Select Invoice</option>
                                {invoiceList.map(inv => <option key={inv.id} value={inv.id}>{inv.id} - {new Date(inv.date).toLocaleDateString()}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {referenceId && invoiceFinancials && (
                        <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-800 space-y-1 my-4">
                            <div className="flex justify-between font-semibold">
                                <span>Invoice Total:</span> <span>₹{invoiceFinancials.totalAmount.toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    )}

                    {referenceId && (
                        <div>
                            <h3 className="text-md font-semibold text-gray-800 mb-2">Select Items to Return</h3>
                            <div className="space-y-3 max-h-60 overflow-y-auto p-2 bg-gray-50 rounded">
                                {selectedInvoiceItems.map(item => (
                                    <div key={item.productId} className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium">{item.productName}</p>
                                            <p className="text-xs text-gray-500">Purchased: {item.quantity} @ ₹{item.price.toLocaleString('en-IN')}</p>
                                        </div>
                                        <input 
                                            type="number" 
                                            min="0"
                                            value={itemsToReturn.find(i => i.productId === item.productId)?.quantity || ''}
                                            placeholder="Qty" 
                                            className="w-20 p-1 border rounded text-center"
                                            onChange={e => handleItemQuantityChange(item.productId, item.productName, item.price, e.target.value)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {itemsToReturn.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                             <div>
                                <label className="block text-sm font-medium text-gray-700">{activeTab === 'CUSTOMER' ? 'Amount Refunded' : 'Credit Note Value'}</label>
                                <input type="number" placeholder="e.g., 500.00" value={amount} onChange={e => setAmount(e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Return Date</label>
                                <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700">Reason (Optional)</label>
                                <input type="text" placeholder="e.g., Damaged item" value={reason} onChange={e => setReason(e.target.value)} className="w-full p-2 border rounded" />
                            </div>
                             {activeTab === 'SUPPLIER' && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700">Return Notes for PDF</label>
                                    <textarea
                                        placeholder="Enter any specific details to be included in the return invoice (Debit Note)..."
                                        value={returnNotes}
                                        onChange={e => setReturnNotes(e.target.value)}
                                        className="w-full p-2 border rounded"
                                        rows={3}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                        <Button onClick={handleFormSubmit} className="w-full" disabled={itemsToReturn.length === 0}>
                            {mode === 'add' ? (activeTab === 'SUPPLIER' ? <Share2 size={16} className="mr-2" /> : <Plus size={16} className="mr-2"/>) : <Save size={16} className="mr-2"/>}
                            {mode === 'add' ? (activeTab === 'CUSTOMER' ? 'Process Return' : 'Process & Generate Debit Note') : 'Update Return'}
                        </Button>
                        {mode === 'edit' && <Button onClick={resetForm} variant="secondary" className="w-full"><X size={16} className="mr-2"/> Cancel Edit</Button>}
                    </div>
                </div>
            </Card>
            
             <Card title="Recent Returns">
                {allReturns.length > 0 ? (
                    <div className="space-y-3">
                        {allReturns.map(ret => {
                            const party = ret.type === 'CUSTOMER'
                                ? state.customers.find(c => c.id === ret.partyId)
                                : state.suppliers.find(s => s.id === ret.partyId);
                            
                            return (
                                <div key={ret.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-grow pr-4">
                                            <p className={`font-bold text-sm ${ret.type === 'CUSTOMER' ? 'text-blue-600' : 'text-teal-600'}`}>{ret.type === 'CUSTOMER' ? 'Customer Return' : 'Return to Supplier'}</p>
                                            <p className="font-semibold">{party?.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">Date: {new Date(ret.returnDate).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500">Ref Invoice: {ret.referenceId}</p>
                                        </div>
                                        <div className="text-right flex items-center flex-shrink-0">
                                            <p className="font-bold text-lg text-primary mr-2">₹{ret.amount.toLocaleString('en-IN')}</p>
                                            <button onClick={() => handleEditClick(ret)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" aria-label="Edit Return">
                                                <Edit size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t">
                                        <p className="text-xs font-semibold text-gray-700">Items:</p>
                                        <ul className="text-xs list-disc list-inside text-gray-600">
                                            {ret.items.map((item, idx) => (
                                                <li key={idx}>{item.productName} (x{item.quantity})</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-gray-500">No returns have been processed yet.</p>
                )}
            </Card>
        </div>
    );
};

export default ReturnsPage;
