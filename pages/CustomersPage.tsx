import React, { useState, useEffect, useMemo } from 'react';
import { Plus, User, Phone, MapPin, Search, Edit, Save, X, Trash2, IndianRupee, ShoppingCart, Info } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Payment, Sale, Product, SaleItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface CustomersPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ setIsDirty }) => {
    const { state, dispatch } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newCustomer, setNewCustomer] = useState<Omit<Customer, 'id'>>({ name: '', phone: '', address: '', area: '', reference: '' });
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);
    
    const [editingSale, setEditingSale] = useState<Sale | null>(null);

    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, saleId: string | null }>({ isOpen: false, saleId: null });
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: getLocalDateString() 
    });
    
    useEffect(() => {
        const formIsDirty = (isAdding && (newCustomer.name || newCustomer.phone || newCustomer.address || newCustomer.area)) || isEditing || !!editingSale;
        setIsDirty(formIsDirty);

        return () => {
            setIsDirty(false);
        };
    }, [isAdding, newCustomer, isEditing, editingSale, setIsDirty]);

    useEffect(() => {
        if (selectedCustomer) {
            const currentCustomer = state.customers.find(c => c.id === selectedCustomer.id);
            setSelectedCustomer(currentCustomer || null);
            setEditedCustomer(currentCustomer || null);
        } else {
            setEditedCustomer(null);
        }
        setIsEditing(false);
    }, [selectedCustomer, state.customers, state.sales]);


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
            if (window.confirm('Are you sure you want to save these changes to the customer details?')) {
                dispatch({ type: 'UPDATE_CUSTOMER', payload: editedCustomer });
                setSelectedCustomer(editedCustomer);
                setIsEditing(false);
                alert("Customer details updated successfully.");
            }
        }
    };

    const handleDeleteCustomer = (customerId: string) => {
        const hasSales = state.sales.some(s => s.customerId === customerId);
        if (hasSales) {
            alert('This customer cannot be deleted because they have existing sales records. Please delete their sales first.');
            return;
        }
        if (window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) {
            dispatch({ type: 'DELETE_CUSTOMER', payload: customerId });
            setSelectedCustomer(null);
            alert('Customer deleted successfully.');
        }
    };


    const handleDeleteSale = (saleId: string) => {
        if (window.confirm('Are you sure you want to delete this sale? This action cannot be undone and will add the items back to stock.')) {
            dispatch({ type: 'DELETE_SALE', payload: saleId });
            alert('Sale deleted successfully.');
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

        if(newPaymentAmount > dueAmount + 0.01) { // Epsilon for float
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
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString() });
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
                            <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any })} className="w-full p-2 border rounded custom-select">
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
                {editingSale && <EditSaleModal sale={editingSale} onClose={() => setEditingSale(null)} />}
                <Button onClick={() => setSelectedCustomer(null)}>&larr; Back to List</Button>
                <Card>
                    <div className="flex justify-between items-start mb-4">
                         <h2 className="text-lg font-bold text-primary">Customer Details: {selectedCustomer.name}</h2>
                         <div className="flex gap-2 items-center">
                            {isEditing ? (
                                <>
                                    <Button onClick={handleUpdateCustomer} className="h-9 px-3"><Save size={16} /> Save</Button>
                                    <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                                        <X size={20}/>
                                    </button>
                                </>
                            ) : (
                                <>
                                 <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit</Button>
                                 <Button onClick={() => handleDeleteCustomer(selectedCustomer.id)} variant="danger"><Trash2 size={16}/> Delete</Button>
                                </>
                            )}
                         </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <div><label className="text-sm font-medium">Name</label><input type="text" name="name" value={editedCustomer.name} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Phone</label><input type="text" name="phone" value={editedCustomer.phone} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Address</label><input type="text" name="address" value={editedCustomer.address} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Area</label><input type="text" name="area" value={editedCustomer.area} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Reference</label><input type="text" name="reference" value={editedCustomer.reference ?? ''} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
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
                                const amountPaid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
                                const dueAmount = sale.totalAmount - amountPaid;
                                const isPaid = dueAmount <= 0.01; // Epsilon for float comparison

                                return (
                                <div key={sale.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                      <div className="flex-grow">
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
                                      </div>
                                      <div className="flex items-center ml-4 flex-shrink-0">
                                            <button onClick={() => setEditingSale(sale)} className="p-2 rounded-full text-blue-500 hover:bg-blue-100 transition-colors">
                                                <Edit size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteSale(sale.id)} className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                      </div>
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
                                        {(sale.payments || []).length > 0 && (
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
                {filteredCustomers.map(customer => {
                    const customerSales = state.sales.filter(s => s.customerId === customer.id);
                    const totalPurchase = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
                    const totalPaid = customerSales.reduce((sum, s) => sum + (s.payments || []).reduce((pSum, p) => pSum + p.amount, 0), 0);
                    const totalDue = totalPurchase - totalPaid;

                    return (
                        <Card key={customer.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedCustomer(customer)}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-primary flex items-center gap-2"><User size={16}/> {customer.name}</p>
                                    <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14}/> {customer.phone}</p>
                                    <p className="text-sm text-gray-500 flex items-center gap-2"><MapPin size={14}/> {customer.area}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <div className="flex items-center justify-end gap-1 text-green-600">
                                        <ShoppingCart size={14} />
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
        </div>
    );
};


const EditSaleModal: React.FC<{ sale: Sale; onClose: () => void }> = ({ sale, onClose }) => {
    const { state, dispatch } = useAppContext();
    const [items, setItems] = useState<SaleItem[]>(sale.items);
    const [discount, setDiscount] = useState<string>(sale.discount.toString());
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isSelectingProduct, setIsSelectingProduct] = useState(false);

    const calculations = useMemo(() => {
        const subTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discountAmount = parseFloat(discount) || 0;
        const gstAmount = items.reduce((sum, item) => {
            const product = state.products.find(p => p.id === item.productId);
            const itemGstPercent = product ? product.gstPercent : 0;
            const itemTotalWithGst = item.price * item.quantity;
            const itemGst = itemTotalWithGst - (itemTotalWithGst / (1 + (itemGstPercent / 100)));
            return sum + itemGst;
        }, 0);
        const totalAmount = subTotal - discountAmount;
        return { subTotal, discountAmount, gstAmount, totalAmount };
    }, [items, discount, state.products]);

    const handleItemChange = (productId: string, field: 'quantity' | 'price', value: string) => {
        const numValue = parseInt(value, 10);
        if (isNaN(numValue) && value !== '') return;

        setItems(prevItems => prevItems.map(item => {
            if (item.productId === productId) {
                const updatedItem = { ...item, [field]: numValue };
                if (field === 'quantity') {
                    const product = state.products.find(p => p.id === productId);
                    const originalSaleItem = sale.items.find(i => i.productId === productId);
                    const originalQuantity = originalSaleItem ? originalSaleItem.quantity : 0;
                    if (product && numValue > product.quantity + originalQuantity) {
                        alert(`Cannot sell more than available stock. Available: ${product.quantity + originalQuantity}`);
                        return { ...item, quantity: product.quantity + originalQuantity };
                    }
                }
                return updatedItem;
            }
            return item;
        }));
    };
    
     const handleSelectProduct = (product: Product) => {
        const newItem = {
            productId: product.id,
            productName: product.name,
            price: product.salePrice,
            quantity: 1,
        };
        const existingItem = items.find(i => i.productId === newItem.productId);
        if (!existingItem) {
            setItems([...items, newItem]);
        }
        setIsSelectingProduct(false);
        setProductSearchTerm('');
    };


    const handleRemoveItem = (productId: string) => setItems(items.filter(item => item.productId !== productId));

    const handleUpdateSale = () => {
        const { totalAmount, gstAmount, discountAmount } = calculations;
        const updatedSale: Sale = { ...sale, items, discount: discountAmount, gstAmount, totalAmount };
        
        if (window.confirm('Are you sure you want to save these changes? Stock levels will be adjusted accordingly.')) {
            dispatch({ type: 'UPDATE_SALE', payload: { oldSale: sale, newSale: updatedSale } });
            onClose();
            alert("Sale updated successfully!");
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <Card title={`Edit Sale: ${sale.id}`} className="w-full max-w-2xl flex flex-col" style={{maxHeight: '90vh'}}>
                <div className="flex-grow overflow-y-auto pr-2 space-y-4">
                    <p className="text-sm text-gray-600 flex items-center gap-2"><Info size={16}/> Payments are not editable here. Adjustments to payments can be made from the customer's sales history.</p>
                    {items.map(item => (
                        <div key={item.productId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                            <div className="flex-grow">
                                <p className="font-semibold">{item.productName}</p>
                                <p className="text-xs text-gray-500">{item.productId}</p>
                            </div>
                            <input type="number" value={item.quantity} onChange={e => handleItemChange(item.productId, 'quantity', e.target.value)} className="w-20 p-1 border rounded text-center" />
                            <input type="number" value={item.price} onChange={e => handleItemChange(item.productId, 'price', e.target.value)} className="w-24 p-1 border rounded text-right" />
                            <button onClick={() => handleRemoveItem(item.productId)} className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
                        </div>
                    ))}
                    <Button onClick={() => setIsSelectingProduct(true)} variant="secondary" className="w-full"><Plus size={16}/> Add Product</Button>
                     <div className="mt-4 pt-4 border-t space-y-2">
                            <div className="flex justify-between items-center text-gray-600">
                                <span>Discount:</span>
                                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-28 p-1 border rounded text-right" />
                            </div>
                         <div className="p-4 bg-purple-50 rounded-lg text-center">
                            <p className="text-sm font-semibold text-gray-600">New Grand Total</p>
                            <p className="text-3xl font-bold text-primary">₹{calculations.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                         </div>
                    </div>
                </div>
                 <div className="flex gap-2 pt-4 mt-4 border-t">
                    <Button onClick={handleUpdateSale} className="w-full">Save Changes</Button>
                    <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                </div>
                 {isSelectingProduct && (
                      <div className="absolute inset-0 bg-white p-4 flex flex-col">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="text-lg font-bold">Select Product</h3>
                             <button onClick={() => setIsSelectingProduct(false)} className="p-2"><X size={20}/></button>
                         </div>
                         <input type="text" placeholder="Search..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="w-full p-2 border rounded mb-2" autoFocus/>
                         <div className="flex-grow overflow-y-auto space-y-2">
                             {state.products
                                .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()))
                                .map(p => (
                                <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-purple-100">
                                    <p className="font-semibold">{p.name}</p>
                                    <p className="text-sm">Stock: {p.quantity}</p>
                                </div>
                             ))}
                         </div>
                      </div>
                 )}
            </Card>
        </div>
    );
};


export default CustomersPage;