import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, IndianRupee, Percent, Save, Search, UserPlus } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Sale, SaleItem, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface SalesPageProps {
  setIsDirty: (isDirty: boolean) => void;
  navigate: (page: 'dashboard' | 'customers' | 'sales' | 'purchases' | 'products' | 'returns' | 'reports') => void;
}

const SalesPage: React.FC<SalesPageProps> = ({ setIsDirty, navigate }) => {
    const { state, dispatch } = useAppContext();
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [productSearch, setProductSearch] = useState('');
    const [discount, setDiscount] = useState('0');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CHEQUE'>('CASH');
    const [paymentDate, setPaymentDate] = useState(getLocalDateString());

    useEffect(() => {
        const formIsDirty = customerId !== '' || items.length > 0 || discount !== '0' || paymentAmount !== '';
        setIsDirty(formIsDirty);
        return () => { setIsDirty(false); };
    }, [customerId, items, discount, paymentAmount, setIsDirty]);
    
    const resetForm = () => {
        setCustomerId('');
        setItems([]);
        setProductSearch('');
        setDiscount('0');
        setPaymentAmount('');
        setPaymentMethod('CASH');
        setPaymentDate(getLocalDateString());
    };

    const handleAddItem = (productId: string) => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        const existingItem = items.find(i => i.productId === productId);
        if (existingItem) {
            handleQuantityChange(productId, existingItem.quantity + 1);
        } else {
            setItems([...items, { productId: product.id, productName: product.name, quantity: 1, price: product.salePrice }]);
        }
        setProductSearch('');
    };

    const handleQuantityChange = (productId: string, quantity: number) => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        if (quantity > product.quantity) {
            alert(`Cannot add more than available stock (${product.quantity}).`);
            return;
        }

        if (quantity <= 0) {
            handleRemoveItem(productId);
        } else {
            setItems(items.map(item => item.productId === productId ? { ...item, quantity } : item));
        }
    };
    
    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    const searchedProducts = useMemo(() => {
        if (!productSearch) return [];
        return state.products
            .filter(p => p.quantity > 0 && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.id.toLowerCase().includes(productSearch.toLowerCase())))
            .slice(0, 5); // Limit results for performance
    }, [productSearch, state.products]);

    const subTotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const gstAmount = items.reduce((sum, item) => {
        const product = state.products.find(p => p.id === item.productId);
        if (!product) return sum;
        const itemTotal = item.price * item.quantity;
        const gstForPrice = product.salePrice * (product.gstPercent / (100 + product.gstPercent)); // Assuming salePrice is inclusive of GST
        const itemGst = gstForPrice * item.quantity;
        return sum + itemGst;
    }, 0);
    const discountValue = parseFloat(discount) || 0;
    const totalAmount = subTotal - discountValue;
    const paidAmount = parseFloat(paymentAmount) || 0;
    const dueAmount = totalAmount - paidAmount;

    const handleCreateSale = () => {
        if (!customerId) {
            alert('Please select a customer.');
            return;
        }
        if (items.length === 0) {
            alert('Please add at least one item to the sale.');
            return;
        }
         if (paidAmount > totalAmount) {
            alert(`Paid amount (₹${paidAmount}) cannot be greater than the total amount (₹${totalAmount}).`);
            return;
        }

        const payments: Payment[] = [];
        if (paidAmount > 0) {
            payments.push({
                id: `PAY-S-${Date.now()}`,
                amount: paidAmount,
                method: paymentMethod,
                date: new Date(paymentDate).toISOString(),
            });
        }
        
        const newSale: Sale = {
            id: `SALE-${Date.now()}`,
            customerId,
            items,
            discount: discountValue,
            gstAmount: parseFloat(gstAmount.toFixed(2)),
            totalAmount: parseFloat(totalAmount.toFixed(2)),
            date: new Date().toISOString(),
            payments,
        };
        
        dispatch({ type: 'ADD_SALE', payload: newSale });
        alert('Sale created successfully!');
        resetForm();
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary">Create New Sale</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 space-y-4">
                    <Card title="Customer & Products">
                        <div className="space-y-4">
                           <div className="flex items-end gap-2">
                                <div className="flex-grow">
                                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2 border rounded">
                                        <option value="">Select a customer</option>
                                        {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.area}</option>)}
                                    </select>
                                </div>
                                <Button variant="secondary" onClick={() => navigate('customers')}>
                                    <UserPlus size={16} />
                                </Button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Add Product</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                                    <input 
                                        type="text"
                                        placeholder="Search by name or code..."
                                        value={productSearch}
                                        onChange={e => setProductSearch(e.target.value)}
                                        className="w-full p-2 pl-10 border rounded"
                                    />
                                    {searchedProducts.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                                            {searchedProducts.map(p => (
                                                <div key={p.id} onClick={() => handleAddItem(p.id)} className="p-2 hover:bg-gray-100 cursor-pointer">
                                                    <p className="font-semibold">{p.name}</p>
                                                    <p className="text-sm text-gray-500">Code: {p.id} | Stock: {p.quantity}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Sale Items">
                        {items.length === 0 ? (
                            <p className="text-gray-500 text-center py-4">No items added yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {items.map(item => (
                                    <div key={item.productId} className="flex items-center gap-4 p-2 bg-gray-50 rounded">
                                        <div className="flex-grow">
                                            <p className="font-semibold">{item.productName}</p>
                                            <p className="text-sm text-gray-600">₹{item.price.toLocaleString('en-IN')} each</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="number" 
                                                value={item.quantity}
                                                onChange={e => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                                                className="w-16 p-1 border rounded text-center"
                                            />
                                            <button onClick={() => handleRemoveItem(item.productId)} className="text-red-500 hover:text-red-700 p-1">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                <div className="space-y-4">
                    <Card title="Summary & Payment">
                        <div className="space-y-3">
                            <div className="flex justify-between"><span>Subtotal</span><span>₹{subTotal.toLocaleString('en-IN')}</span></div>
                            <div className="flex justify-between items-center">
                                <label className="flex items-center gap-1"><Percent size={14}/> Discount</label>
                                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 p-1 border rounded text-right" />
                            </div>
                            <hr />
                            <div className="flex justify-between font-bold text-lg"><span>Total</span><span>₹{totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</span></div>
                        </div>

                        <div className="mt-4 pt-4 border-t space-y-3">
                             <h3 className="font-semibold">Record Payment</h3>
                             <input type="number" placeholder="Amount Paid" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full p-2 border rounded" />
                             <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                             <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 border rounded" />
                             
                             {dueAmount > 0 && <div className="text-center font-semibold text-red-600">Due: ₹{dueAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</div>}
                             {dueAmount <= 0 && <div className="text-center font-semibold text-green-600">Fully Paid</div>}
                        </div>
                    </Card>
                    <Button onClick={handleCreateSale} className="w-full" disabled={items.length === 0 || !customerId}>
                        <Save className="mr-2" size={16} /> Complete Sale
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SalesPage;
