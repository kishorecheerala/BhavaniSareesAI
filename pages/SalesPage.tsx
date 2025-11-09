import React, { useState } from 'react';
import { Plus, Trash2, QrCode, Share2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale, SaleItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const SalesPage: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [newItem, setNewItem] = useState<{ productId: string; productName: string; quantity: string; price: string }>({ productId: '', productName: '', quantity: '1', price: '' });
    const [discount, setDiscount] = useState('0');

    const handleAddItem = () => {
        if (newItem.productId && newItem.productName && parseInt(newItem.quantity) > 0 && parseFloat(newItem.price) > 0) {
            const product = state.products.find(p => p.id === newItem.productId);
            if (!product || product.quantity < parseInt(newItem.quantity)) {
                alert('Not enough stock available!');
                return;
            }
            setItems([...items, { ...newItem, quantity: parseInt(newItem.quantity), price: parseFloat(newItem.price) }]);
            setNewItem({ productId: '', productName: '', quantity: '1', price: '' });
        } else {
            alert('Please fill all item details correctly.');
        }
    };

    const handleProductScan = () => {
        const product = state.products.find(p => p.id === newItem.productId);
        if (product) {
            setNewItem({ ...newItem, productName: product.name, price: product.salePrice.toString() });
        } else {
            alert('Product not found in stock.');
            setNewItem({ ...newItem, productName: '' });
        }
    };

    const handleCreateSale = () => {
        if (!customerId || items.length === 0) {
            alert('Please select a customer and add items.');
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const gstAmount = items.reduce((sum, item) => {
            const product = state.products.find(p => p.id === item.productId);
            const gst = product ? product.gstPercent : 0;
            return sum + (item.price * item.quantity * (gst / 100));
        }, 0);
        
        const totalAmount = subtotal + gstAmount - parseFloat(discount);
        const saleId = `SALE-${Date.now()}`;

        const newSale: Sale = {
            id: saleId,
            customerId,
            items,
            discount: parseFloat(discount),
            gstAmount,
            totalAmount,
            date: new Date().toISOString(),
            isPaid: false,
        };

        dispatch({ type: 'ADD_SALE', payload: newSale });
        
        items.forEach(item => {
            dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -item.quantity } });
        });
        
        // --- WhatsApp Sharing Logic ---
        const customer = state.customers.find(c => c.id === customerId);
        if (customer) {
            const itemsText = items.map(item => `- ${item.productName} (x${item.quantity}): ₹${(item.price * item.quantity).toFixed(2)}`).join('\n');
            
            const invoiceText = `*Bhavani Sarees Invoice*\n\n` +
                `*Invoice ID:* ${saleId}\n` +
                `*Date:* ${new Date(newSale.date).toLocaleDateString()}\n` +
                `*Customer:* ${customer.name}\n\n` +
                `*Items:*\n${itemsText}\n\n` +
                `*Subtotal:* ₹${subtotal.toFixed(2)}\n` +
                `*GST:* ₹${gstAmount.toFixed(2)}\n` +
                `*Discount:* -₹${parseFloat(discount).toFixed(2)}\n` +
                `--------------------\n` +
                `*Total Amount: ₹${totalAmount.toFixed(2)}*\n\n` +
                `Thank you for your business!`;

            if (window.confirm(`Sale created successfully! Total: ₹${totalAmount.toFixed(2)}\n\nDo you want to share the invoice on WhatsApp?`)) {
                const encodedText = encodeURIComponent(invoiceText);
                // Using wa.me link without phone number to let user choose the contact
                const whatsappUrl = `https://wa.me/?text=${encodedText}`;
                window.open(whatsappUrl, '_blank');
            }
        } else {
            alert(`Sale created successfully! Total: ₹${totalAmount.toFixed(2)}`);
        }

        // Reset form
        setCustomerId('');
        setItems([]);
        setDiscount('0');
    };
    
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const gstTotal = items.reduce((sum, item) => {
      const product = state.products.find(p => p.id === item.productId);
      const gst = product ? product.gstPercent : 0;
      return sum + (item.price * item.quantity * (gst / 100));
    }, 0);
    const total = subtotal + gstTotal - parseFloat(discount || '0');
    const product = state.products.find(p => p.id === newItem.productId);


    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary">New Sale</h1>
            <Card>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Customer</label>
                        <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">Select Customer</option>
                            {state.customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <Card title="Sale Items">
                <div className="space-y-2">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span>{item.productName} (x{item.quantity})</span>
                            <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                            <Button variant="danger" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-1 h-auto"><Trash2 size={16}/></Button>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <input type="text" placeholder="Saree Code / Scan QR" value={newItem.productId} onChange={e => setNewItem({ ...newItem, productId: e.target.value })} className="w-full p-2 border rounded pr-10" />
                            <button onClick={handleProductScan} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-primary"><QrCode size={20} /></button>
                        </div>
                        {product && <div className="p-2 bg-purple-100 text-purple-800 rounded">Stock: {product.quantity}</div>}
                    </div>
                     <input type="text" placeholder="Saree Name" value={newItem.productName} onChange={e => setNewItem({ ...newItem, productName: e.target.value })} className="w-full p-2 border rounded" />
                    <div className="grid grid-cols-2 gap-4">
                        <input type="number" placeholder="Quantity" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-2 border rounded" />
                    </div>
                    <Button onClick={handleAddItem} className="w-full"><Plus className="mr-2" size={16}/> Add Item</Button>
                </div>
            </Card>

            <Card title="Summary">
                <div className="space-y-2">
                    <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>GST:</span><span>₹{gstTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center">
                        <span>Discount:</span>
                        <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 p-1 border rounded text-right"/>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total:</span><span>₹{total.toFixed(2)}</span></div>
                </div>
                 <Button onClick={handleCreateSale} className="w-full mt-4">
                    <Share2 className="w-4 h-4 mr-2" />
                    Create Sale & Share Invoice
                </Button>
            </Card>
        </div>
    );
};

export default SalesPage;