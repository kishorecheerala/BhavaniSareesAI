import React, { useState, useMemo, useEffect } from 'react';
import { Undo2, Users, Package, Plus, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Return, ReturnItem, Sale, Purchase } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

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
    const { state, dispatch } = useAppContext();
    const [activeTab, setActiveTab] = useState<ReturnType>('CUSTOMER');
    const [partyId, setPartyId] = useState<string>('');
    const [referenceId, setReferenceId] = useState<string>('');
    const [itemsToReturn, setItemsToReturn] = useState<ReturnItem[]>([]);
    const [returnDate, setReturnDate] = useState(getLocalDateString());
    const [amount, setAmount] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        const formIsDirty = !!partyId || !!referenceId || itemsToReturn.length > 0;
        setIsDirty(formIsDirty);

        return () => {
            setIsDirty(false);
        };
    }, [partyId, referenceId, itemsToReturn, setIsDirty]);

    const resetForm = () => {
        setPartyId('');
        setReferenceId('');
        setItemsToReturn([]);
        setReturnDate(getLocalDateString());
        setAmount('');
        setReason('');
    };

    const handleItemQuantityChange = (productId: string, productName: string, price: number, newQuantity: number) => {
        const originalItem = activeTab === 'CUSTOMER' 
            ? (state.sales.find(s => s.id === referenceId)?.items.find(i => i.productId === productId))
            : (state.purchases.find(p => p.id === referenceId)?.items.find(i => i.productId === productId));

        if (!originalItem || newQuantity > originalItem.quantity) {
            alert(`Cannot return more than the purchased quantity of ${originalItem?.quantity}.`);
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
    
    const handleSubmitReturn = () => {
        if (!partyId || !referenceId || itemsToReturn.length === 0 || !amount) {
            alert('Please fill all required fields: select a party, an invoice, at least one item, and the return amount.');
            return;
        }
        
        const newReturn: Return = {
            id: `RET-${Date.now()}`,
            type: activeTab,
            partyId,
            referenceId,
            items: itemsToReturn,
            returnDate: new Date(returnDate).toISOString(),
            amount: parseFloat(amount),
            reason
        };

        dispatch({ type: 'ADD_RETURN', payload: newReturn });
        alert(`${activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'} return processed successfully!`);
        resetForm();
    };

    const handleDeleteReturn = (returnId: string) => {
        if (window.confirm('Are you sure you want to delete this return? This will revert the stock changes and remove the credit from the invoice.')) {
            dispatch({ type: 'DELETE_RETURN', payload: returnId });
            alert('Return record deleted successfully.');
        }
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

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2"><Undo2 /> Returns Management</h1>

            <Card title="Process a New Return">
                <div className="mb-4 border-b">
                    <div className="flex">
                        <button onClick={() => { setActiveTab('CUSTOMER'); resetForm(); }} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'CUSTOMER' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Customer Return</button>
                        <button onClick={() => { setActiveTab('SUPPLIER'); resetForm(); }} className={`px-4 py-2 text-sm font-semibold ${activeTab === 'SUPPLIER' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}>Return to Supplier</button>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">{activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}</label>
                        <select value={partyId} onChange={e => { setPartyId(e.target.value); setReferenceId(''); setItemsToReturn([]); }} className="w-full p-2 border rounded custom-select">
                            <option value="">Select {activeTab === 'CUSTOMER' ? 'Customer' : 'Supplier'}</option>
                            {partyList.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>

                    {partyId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Original Invoice</label>
                            <select value={referenceId} onChange={e => { setReferenceId(e.target.value); setItemsToReturn([]); }} className="w-full p-2 border rounded custom-select">
                                <option value="">Select Invoice</option>
                                {invoiceList.map(inv => <option key={inv.id} value={inv.id}>{inv.id} - {new Date(inv.date).toLocaleDateString()}</option>)}
                            </select>
                        </div>
                    )}
                    
                    {referenceId && invoiceFinancials && (
                        <div className="p-3 bg-purple-50 rounded-lg text-sm text-purple-800 space-y-1 my-4">
                            <div className="flex justify-between">
                                <span className="font-semibold">Invoice Total:</span>
                                <span>₹{invoiceFinancials.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-semibold">Amount Paid:</span>
                                <span className="text-green-600">₹{invoiceFinancials.paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                                <span className="font-semibold">Current Due:</span>
                                <span className="text-red-600">₹{invoiceFinancials.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
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
                                            max={item.quantity}
                                            placeholder="Qty" 
                                            className="w-20 p-1 border rounded text-center"
                                            onChange={e => handleItemQuantityChange(item.productId, item.productName, item.price, parseInt(e.target.value) || 0)}
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
                        </div>
                    )}

                    <Button onClick={handleSubmitReturn} className="w-full" disabled={itemsToReturn.length === 0}>
                        Process Return
                    </Button>
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
                                        <div>
                                            <p className={`font-bold text-sm ${ret.type === 'CUSTOMER' ? 'text-blue-600' : 'text-teal-600'}`}>{ret.type === 'CUSTOMER' ? 'Customer Return' : 'Return to Supplier'}</p>
                                            <p className="font-semibold">{party?.name || 'Unknown'}</p>
                                            <p className="text-xs text-gray-500">Date: {new Date(ret.returnDate).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500">Ref Invoice: {ret.referenceId}</p>
                                        </div>
                                        <div className="text-right flex items-start gap-2">
                                            <p className="font-bold text-lg text-primary">₹{ret.amount.toLocaleString('en-IN')}</p>
                                            <button onClick={() => handleDeleteReturn(ret.id)} className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors">
                                                <Trash2 size={16} />
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