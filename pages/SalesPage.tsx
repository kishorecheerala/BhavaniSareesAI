import React, { useState } from 'react';
import { Plus, Trash2, Share2, Search, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale, SaleItem, Customer, Product, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const SalesPage: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [newItem, setNewItem] = useState<{ productId: string; productName: string; quantity: string; price: string }>({ productId: '', productName: '', quantity: '1', price: '' });
    const [discount, setDiscount] = useState('0');
    
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CHEQUE'>('CASH');

    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');


    const handleAddItem = () => {
        if (newItem.productId && newItem.productName && parseInt(newItem.quantity) > 0 && parseFloat(newItem.price) >= 0) {
            const product = state.products.find(p => p.id.toLowerCase() === newItem.productId.toLowerCase());
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
    
    const handleSelectProduct = (product: Product) => {
        setNewItem({
            productId: product.id,
            productName: product.name,
            price: product.salePrice.toString(),
            quantity: '1',
        });
        setIsSelectingProduct(false);
        setProductSearchTerm('');
    };


    const generateInvoicePDF = (sale: Sale, customer: Customer) => {
        const doc = new jsPDF();
        const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
        const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();

        doc.setFontSize(26);
        doc.setFont('helvetica', 'bold');
        doc.text('Bhavani Sarees Invoice', pageWidth / 2, 22, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(`Invoice ID: ${sale.id}`, 20, 40);
        doc.text(`Date: ${new Date(sale.date).toLocaleDateString()}`, 20, 46);

        doc.setFont('helvetica', 'bold');
        doc.text('Billed To:', 20, 60);
        doc.setFont('helvetica', 'normal');
        doc.text(customer.name, 20, 66);
        doc.text(customer.phone, 20, 72);
        doc.text(`${customer.address}, ${customer.area}`, 20, 78);

        const tableColumn = ["#", "Item", "Qty", "Price", "Total"];
        const tableRows: (string | number)[][] = [];

        const formatCurrency = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        sale.items.forEach((item, index) => {
            const rowData = [
                index + 1,
                item.productName,
                item.quantity,
                formatCurrency(item.price),
                formatCurrency(item.price * item.quantity)
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 90,
            theme: 'grid',
            headStyles: { fillColor: [106, 13, 173], textColor: [255, 255, 255] },
            columnStyles: {
                0: { halign: 'center', cellWidth: 10 },
                2: { halign: 'center' },
                3: { halign: 'right' },
                4: { halign: 'right' },
            }
        });

        const finalY = (doc as any).lastAutoTable.finalY || 150;
        const subtotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const amountDue = sale.totalAmount - amountPaid;
        
        const totalsData = [
            ['Subtotal:', `Rs. ${formatCurrency(subtotal)}`],
            ['GST:', `Rs. ${formatCurrency(sale.gstAmount)}`],
            ['Discount:', `- Rs. ${formatCurrency(sale.discount)}`],
            ['Total:', `Rs. ${formatCurrency(sale.totalAmount)}`],
            ['Amount Paid:', `Rs. ${formatCurrency(amountPaid)}`],
            ['Amount Due:', `Rs. ${formatCurrency(amountDue)}`]
        ];
        
        autoTable(doc, {
            body: totalsData,
            startY: finalY + 10,
            theme: 'plain',
            tableWidth: 'wrap',
            margin: { left: pageWidth - 90 },
            styles: { fontSize: 12, cellPadding: 1.5, overflow: 'visible' },
            columnStyles: {
                0: { halign: 'right', cellWidth: 30 },
                1: { halign: 'right', cellWidth: 'auto' },
            },
            didDrawCell: (data) => {
                if (data.row.index >= 3) { // Style Total, Paid, and Due
                    doc.setFont('helvetica', 'bold');
                }
            },
        });

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Thank you for your business!', pageWidth / 2, pageHeight - 20, { align: 'center' });

        const today = new Date();
        const dateString = today.toISOString().split('T')[0];
        const randomNumber = Math.floor(1000 + Math.random() * 9000);
        doc.save(`BhavaniSarees-Invoice-${dateString}-${randomNumber}.pdf`);
    };

    const handleCreateSale = () => {
        if (!customerId || items.length === 0) {
            alert('Please select a customer and add items.');
            return;
        }

        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const gstAmount = items.reduce((sum, item) => {
            const product = state.products.find(p => p.id.toLowerCase() === item.productId.toLowerCase());
            const gst = product ? product.gstPercent : 0;
            return sum + (item.price * item.quantity * (gst / 100));
        }, 0);
        
        const totalAmount = subtotal + gstAmount - parseFloat(discount);
        const saleId = `SALE-${Date.now()}`;

        const payments: Payment[] = [];
        const paidAmount = parseFloat(paymentAmount || '0');
        if (paidAmount > 0) {
            if (paidAmount > totalAmount) {
                alert(`Paid amount (₹${paidAmount}) cannot be greater than the total amount (₹${totalAmount}).`);
                return;
            }
            payments.push({
                id: `PAY-${Date.now()}`,
                amount: paidAmount,
                method: paymentMethod,
                date: new Date().toISOString(),
            });
        }

        const newSale: Sale = {
            id: saleId,
            customerId,
            items,
            discount: parseFloat(discount),
            gstAmount,
            totalAmount,
            date: new Date().toISOString(),
            payments,
        };

        dispatch({ type: 'ADD_SALE', payload: newSale });
        
        items.forEach(item => {
            dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -item.quantity } });
        });
        
        const customer = state.customers.find(c => c.id === customerId);
        if (customer) {
            generateInvoicePDF(newSale, customer);
            
            const itemsText = items.map(item => `- ${item.productName} (x${item.quantity}): ₹${(item.price * item.quantity).toFixed(2)}`).join('\n');
            const amountDue = totalAmount - paidAmount;
            
            const invoiceText = `*Bhavani Sarees Invoice Summary*\n\n` +
                `*Invoice ID:* ${saleId}\n` +
                `*Date:* ${new Date(newSale.date).toLocaleDateString()}\n` +
                `*Customer:* ${customer.name}\n\n` +
                `*Items:*\n${itemsText}\n\n` +
                `*Subtotal:* ₹${subtotal.toFixed(2)}\n` +
                `*GST:* ₹${gstAmount.toFixed(2)}\n` +
                `*Discount:* -₹${parseFloat(discount).toFixed(2)}\n` +
                `--------------------\n` +
                `*Total Amount: ₹${totalAmount.toFixed(2)}*\n` +
                `*Amount Paid: ₹${paidAmount.toFixed(2)}*\n` +
                `*Balance Due: ₹${amountDue.toFixed(2)}*\n\n` +
                `Thank you for your business!`;

            if (window.confirm(`Sale created successfully! Invoice PDF has been downloaded.\n\nTotal: ₹${totalAmount.toFixed(2)}\nDue: ₹${amountDue.toFixed(2)}\n\nDo you want to share a summary on WhatsApp?`)) {
                const encodedText = encodeURIComponent(invoiceText);
                const whatsappUrl = `https://wa.me/?text=${encodedText}`;
                window.open(whatsappUrl, '_blank');
            }
        } else {
             alert(`Sale created successfully! Total: ₹${totalAmount.toFixed(2)}. Customer details not found for sharing.`);
        }

        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setPaymentAmount('');
        setPaymentMethod('CASH');
    };
    
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const gstTotal = items.reduce((sum, item) => {
      const product = state.products.find(p => p.id.toLowerCase() === item.productId.toLowerCase());
      const gst = product ? product.gstPercent : 0;
      return sum + (item.price * item.quantity * (gst / 100));
    }, 0);
    const total = subtotal + gstTotal - parseFloat(discount || '0');

    const inStockProducts = state.products.filter(p => 
        p.quantity > 0 &&
        (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || 
         p.id.toLowerCase().includes(productSearchTerm.toLowerCase()))
    );
    
    const ProductSelectionModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
                    <h2 className="text-xl font-bold text-primary">Select a Product</h2>
                    <Button onClick={() => setIsSelectingProduct(false)} className="p-1 h-auto" variant="secondary">
                        <X size={20}/>
                    </Button>
                </div>
                <div className="p-4 border-b sticky top-0 bg-white">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input 
                            type="text"
                            placeholder="Search by name or code..."
                            value={productSearchTerm}
                            onChange={e => setProductSearchTerm(e.target.value)}
                            className="w-full p-2 pl-10 border rounded-lg"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="overflow-y-auto flex-grow p-4">
                    <div className="space-y-2">
                        {inStockProducts.length > 0 ? inStockProducts.map(p => (
                            <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 border rounded-lg cursor-pointer hover:bg-purple-50 transition-colors">
                                <p className="font-semibold text-primary">{p.name}</p>
                                <div className="text-sm text-gray-600 flex justify-between">
                                    <span>Code: {p.id}</span>
                                    <span className="font-medium">Stock: {p.quantity}</span>
                                </div>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 py-8">No products in stock or matching your search.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4">
            {isSelectingProduct && <ProductSelectionModal />}
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
                            <div>
                                <p className="font-semibold">{item.productName}</p>
                                <p className="text-sm text-gray-600">x{item.quantity} @ ₹{item.price.toFixed(2)}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-medium">₹{(item.price * item.quantity).toFixed(2)}</span>
                                <Button variant="danger" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-1 h-auto"><Trash2 size={16}/></Button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="mt-4 pt-4 border-t space-y-3">
                     {newItem.productId ? (
                        <div>
                            <div className="p-3 bg-purple-100 rounded-lg mb-3 text-purple-900">
                                <p className="font-bold">{newItem.productName}</p>
                                <p className="text-sm">Code: {newItem.productId}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 mb-3">
                                <input type="number" placeholder="Quantity" value={newItem.quantity} onChange={e => setNewItem({ ...newItem, quantity: e.target.value })} className="w-full p-2 border rounded" />
                                <input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} className="w-full p-2 border rounded" />
                            </div>
                             <div className="flex gap-2">
                                <Button onClick={handleAddItem} className="w-full"><Plus className="mr-2" size={16}/> Add Item</Button>
                                <Button variant="secondary" onClick={() => setNewItem({ productId: '', productName: '', quantity: '1', price: '' })} className="w-full">Change</Button>
                            </div>
                        </div>
                    ) : (
                        <Button onClick={() => setIsSelectingProduct(true)} className="w-full">
                            <Plus className="mr-2" size={16}/> Select Product from Stock
                        </Button>
                    )}
                </div>
            </Card>

            <Card title="Summary & Payment">
                <div className="space-y-2">
                    <div className="flex justify-between"><span>Subtotal:</span><span>₹{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>GST:</span><span>₹{gstTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between items-center">
                        <span>Discount:</span>
                        <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 p-1 border rounded text-right"/>
                    </div>
                    <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total:</span><span>₹{total.toFixed(2)}</span></div>
                </div>
                 <div className="pt-4 mt-4 border-t space-y-3">
                    <h3 className="font-semibold text-gray-800">Add Payment (Optional)</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                        <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={`Total is ₹${total.toFixed(2)}`} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded">
                            <option value="CASH">Cash</option>
                            <option value="UPI">UPI</option>
                            <option value="CHEQUE">Cheque</option>
                        </select>
                    </div>
                </div>
                 <Button onClick={handleCreateSale} className="w-full mt-4">
                    <Share2 className="w-4 h-4 mr-2" />
                    Create Sale & Generate Invoice
                </Button>
            </Card>
        </div>
    );
};

export default SalesPage;
