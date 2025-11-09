import React, { useState, useEffect } from 'react';
import { Plus, User, Phone, MapPin, Search, Edit, Save, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Payment, Sale } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const CustomersPage: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newCustomer, setNewCustomer] = useState<Omit<Customer, 'id'>>({ name: '', phone: '', address: '', area: '', reference: '' });
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);

    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, saleId: string | null }>({ isOpen: false, saleId: null });
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: new Date().toISOString().split('T')[0] 
    });

    useEffect(() => {
        if (selectedCustomer) {
            setEditedCustomer(selectedCustomer);
        } else {
            setEditedCustomer(null);
        }
        setIsEditing(false);
    }, [selectedCustomer]);

    const handleAddCustomer = () => {
        if (newCustomer.name && newCustomer.phone && newCustomer.address && newCustomer.area) {
            const customerWithId: Customer = { ...newCustomer, id: `CUST-${Date.now()}` };
            dispatch({ type: 'ADD_CUSTOMER', payload: customerWithId });
            setNewCustomer({ name: '', phone: '', address: '', area: '', reference: '' });
            setIsAdding(false);
        } else {
            alert('Please fill all required fields.');
        }
    };
    
    const handleUpdateCustomer = () => {
        if (editedCustomer) {
            dispatch({ type: 'UPDATE_CUSTOMER', payload: editedCustomer });
            setSelectedCustomer(editedCustomer);
            setIsEditing(false);
            alert("Customer details updated successfully.");
        }
    };

    const handleAddPayment = () => {
        const sale = state.sales.find(s => s.id === paymentModalState.saleId);
        if (!sale || !paymentDetails.amount) {
            alert("Please enter a valid amount.");
            return;
        }
        
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = sale.totalAmount - amountPaid;
        const newPaymentAmount = parseFloat(paymentDetails.amount);

        if(newPaymentAmount > dueAmount) {
            alert(`Payment of ₹${newPaymentAmount.toLocaleString('en-IN')} exceeds due amount of ₹${dueAmount.toLocaleString('en-IN')}.`);
            return;
        }

        const payment: Payment = {
            id: `PAY-${Date.now()}`,
            amount: newPaymentAmount,
            method: paymentDetails.method,
            date: new Date(paymentDetails.date).toISOString()
        };

        dispatch({ type: 'ADD_PAYMENT_TO_SALE', payload: { saleId: sale.id, payment } });
        
        setPaymentModalState({ isOpen: false, saleId: null });
        setPaymentDetails({ amount: '', method: 'CASH', date: new Date().toISOString().split('T')[0] });
    };

    const filteredCustomers = state.customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.area.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const PaymentModal = () => {
        const sale = state.sales.find(s => s.id === paymentModalState.saleId);
        if (!paymentModalState.isOpen || !sale) return null;
        
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = sale.totalAmount - amountPaid;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <Card title="Add Payment" className="w-full max-w-sm">
                    <div className="space-y-4">
                        <p>Invoice Total: <span className="font-bold">₹{sale.totalAmount.toLocaleString('en-IN')}</span></p>
                        <p>Amount Due: <span className="font-bold text-red-600">₹{dueAmount.toLocaleString('en-IN')}</span></p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount</label>
                            <input type="number" placeholder="Enter amount" value={paymentDetails.amount} onChange={e => setPaymentDetails({ ...paymentDetails, amount: e.target.value })} className="w-full p-2 border rounded" autoFocus/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Method</label>
                            <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any })} className="w-full p-2 border rounded">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                            <input 
                                type="date" 
                                value={paymentDetails.date} 
                                onChange={e => setPaymentDetails({ ...paymentDetails, date: e.target.value })} 
                                className="w-full p-2 border rounded"
                            />
                        </div>
                        <div className="flex gap-2">
                           <Button onClick={handleAddPayment} className="w-full">Save Payment</Button>
                           <Button onClick={() => setPaymentModalState({isOpen: false, saleId: null})} variant="secondary" className="w-full">Cancel</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    };
    
    if (selectedCustomer && editedCustomer) {
        const customerSales = state.sales.filter(s => s.customerId === selectedCustomer.id);
        const customerReturns = state.returns.filter(r => r.type === 'CUSTOMER' && r.partyId === selectedCustomer.id);
        
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setEditedCustomer({ ...editedCustomer, [e.target.name]: e.target.value });
        };

        return (
            <div className="space-y-4">
                {paymentModalState.isOpen && <PaymentModal />}
                <Button onClick={() => setSelectedCustomer(null)}>&larr; Back to List</Button>
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-primary">Customer Details: {selectedCustomer.name}</h2>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <Button onClick={handleUpdateCustomer} className="h-9 px-3"><Save size={16} /> Save</Button>
                                <Button onClick={() => setIsEditing(false)} variant="secondary" className="h-9 px-3"><X size={16} /> Cancel</Button>
                            </div>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit</Button>
                        )}
                    </div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <div><label className="text-sm font-medium">Name</label><input type="text" name="name" value={editedCustomer.name} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Phone</label><input type="text" name="phone" value={editedCustomer.phone} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Address</label><input type="text" name="address" value={editedCustomer.address} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Area</label><input type="text" name="area" value={editedCustomer.area} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Reference</label><input type="text" name="reference" value={editedCustomer.reference} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                        </div>
                    ) : (
                        <div className="space-y-1 text-gray-700">
                             <p><strong>ID:</strong> {selectedCustomer.id}</p>
                            <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                            <p><strong>Address:</strong> {selectedCustomer.address}</p>
                            <p><strong>Area:</strong> {selectedCustomer.area}</p>
                            {selectedCustomer.reference && <p><strong>Reference:</strong> {selectedCustomer.reference}</p>}
                        </div>
                    )}
                </Card>
                <Card title="Sales History">
                    {customerSales.length > 0 ? (
                        <div className="space-y-4">
                            {customerSales.slice().reverse().map(sale => {
                                const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
                                const dueAmount = sale.totalAmount - amountPaid;
                                const isPaid = dueAmount <= 0.01; // Epsilon for float comparison

                                return (
                                <div key={sale.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">{new Date(sale.date).toLocaleString()}</p>
                                            <p className={`text-sm font-bold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPaid ? 'Paid' : `Due: ₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                            </p>
                                        </div>
                                        <p className="font-bold text-lg text-primary">
                                            ₹{sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="pl-4 mt-2 border-l-2 border-purple-200 space-y-3">
                                        <div>
                                            <h4 className="font-semibold text-sm text-gray-700 mb-1">Items Purchased:</h4>
                                            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                {sale.items.map((item, index) => (
                                                    <li key={index}>
                                                        {item.productName} (x{item.quantity}) @ ₹{item.price.toLocaleString('en-IN')} each
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        {sale.payments.length > 0 && (
                                            <div>
                                                <h4 className="font-semibold text-sm text-gray-700 mb-1">Payments Made:</h4>
                                                <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                    {sale.payments.map(payment => (
                                                        <li key={payment.id}>
                                                            ₹{payment.amount.toLocaleString('en-IN')} {payment.method === 'RETURN_CREDIT' ? <span className="text-blue-600 font-semibold">(Return Credit)</span> : `via ${payment.method}`} on {new Date(payment.date).toLocaleDateString()}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {!isPaid && (
                                            <div className="pt-2">
                                                <Button onClick={() => setPaymentModalState({ isOpen: true, saleId: sale.id })} className="w-full sm:w-auto">
                                                    <Plus size={16} className="mr-2"/> Add Payment
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <p className="text-gray-500">No sales recorded for this customer.</p>
                    )}
                </Card>
                 <Card title="Returns History">
                    {customerReturns.length > 0 ? (
                         <div className="space-y-3">
                            {customerReturns.slice().reverse().map(ret => (
                                <div key={ret.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">Return on {new Date(ret.returnDate).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500">Original Invoice: {ret.referenceId}</p>
                                        </div>
                                        <p className="font-semibold text-primary">Refunded: ₹{ret.amount.toLocaleString('en-IN')}</p>
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
                        <p className="text-gray-500">No returns recorded for this customer.</p>
                    )}
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-primary">Customers</h1>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {isAdding ? 'Cancel' : 'Add Customer'}
                </Button>
            </div>

            {isAdding && (
                <Card title="New Customer Form">
                    <div className="space-y-4">
                        <input type="text" placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Area/Location" value={newCustomer.area} onChange={e => setNewCustomer({ ...newCustomer, area: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Reference (Optional)" value={newCustomer.reference} onChange={e => setNewCustomer({ ...newCustomer, reference: e.target.value })} className="w-full p-2 border rounded" />
                        <Button onClick={handleAddCustomer} className="w-full">Save Customer</Button>
                    </div>
                </Card>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search customers by name, phone, or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg"
                />
            </div>

            <div className="space-y-3">
                {filteredCustomers.map(customer => (
                    <Card key={customer.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedCustomer(customer)}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg text-primary flex items-center gap-2"><User size={16}/> {customer.name}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14}/> {customer.phone}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-2"><MapPin size={14}/> {customer.area}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-500">&rarr;</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default CustomersPage;