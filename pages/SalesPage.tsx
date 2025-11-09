import React, { useState } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee } from 'lucide-react';
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
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

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

    const resetForm = () => {
        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setPaymentAmount('');
        setPaymentMethod('CASH');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setNewItem({ productId: '', productName: '', quantity: '1', price: '' });
    };

    const handleRecordPayment = () => {
        if (!customerId) {
            alert('Please select a customer to record a payment for.');
            return;
        }

        const paidAmount = parseFloat(paymentAmount || '0');
        if (paidAmount <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }

        const outstandingSales = state.sales
            .filter(sale => {
                const paid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
                return sale.customerId === customerId && (sale.totalAmount - paid) > 0.01;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (outstandingSales.length === 0) {
            alert('This customer has no outstanding dues.');
            return;
        }

        const totalDueForCustomer = outstandingSales.reduce((total, sale) => {
            const paid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
            return total + (sale.totalAmount - paid);
        }, 0);

        if (paidAmount > totalDueForCustomer) {
            alert(`Payment amount of ₹${paidAmount.toLocaleString('en-IN')} exceeds the total due of ₹${totalDueForCustomer.toLocaleString('en-IN')}.`);
            return;
        }
        
        let remainingPayment = paidAmount;
        for (const sale of outstandingSales) {
            if (remainingPayment <= 0) break;

            const paid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const dueAmount = sale.totalAmount - paid;
            
            const amountToApply = Math.min(remainingPayment, dueAmount);

            const newPayment: Payment = {
                id: `PAY-${Date.now()}-${Math.random()}`,
                amount: amountToApply,
                method: paymentMethod,
                date: new Date(paymentDate).toISOString()
            };

            dispatch({ type: 'ADD_PAYMENT_TO_SALE', payload: { saleId: sale.id, payment: newPayment } });
            
            remainingPayment -= amountToApply;
        }
        
        alert(`Payment of ₹${paidAmount.toLocaleString('en-IN')} recorded successfully.`);
        resetForm();
    };

    const generateInvoicePDF = (sale: Sale, customer: Customer): Blob => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 150] // Receipt-like size
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        let yPos = 10;
        const margin = 5;

        // Background
        const bgSvg = `<svg width="80" height="150" viewBox="0 0 80 150" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff" /><g opacity="0.08" fill="#6a0dad"><path d="M10 10 C 15 0, 25 0, 30 10 S 40 20, 30 30 C 20 40, 10 40, 10 30 S 5 20, 10 10 Z" /><path d="M50 40 C 55 30, 65 30, 70 40 S 80 50, 70 60 C 60 70, 50 70, 50 60 S 45 50, 50 40 Z" /><path d="M20 70 C 25 60, 35 60, 40 70 S 50 80, 40 90 C 30 100, 20 100, 20 90 S 15 80, 20 70 Z" /><path d="M60 100 C 65 90, 75 90, 80 100 S 90 110, 80 120 C 70 130, 60 130, 60 120 S 55 110, 60 100 Z" /><path d="M5 130 C 10 120, 20 120, 25 130 S 35 140, 25 150 C 15 160, 5 160, 5 150 S 0 140, 5 130 Z" /></g></svg>`;
        const bgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(bgSvg)}`;
        doc.addImage(bgDataUrl, 'SVG', 0, 0, pageWidth, pageHeight);

        // Logo
        const logoSvg = `<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="512" height="512" rx="96" fill="#f3e5f5"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="300" font-family="Arial, sans-serif" fill="#6a0dad" font-weight="bold">B</text></svg>`;
        const logoDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(logoSvg)}`;
        doc.addImage(logoDataUrl, 'SVG', pageWidth / 2 - 10, yPos, 20, 20);
        yPos += 25;

        // Title
        doc.setFont('Times-Roman', 'bold');
        doc.setFontSize(16);
        doc.setTextColor('#6a0dad');
        doc.text('Bhavani Sarees', pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor('#333333');
        doc.text('Thank you for your business', pageWidth / 2, yPos, { align: 'center' });
        yPos += 8;

        // Divider
        doc.setDrawColor('#EAE0F5');
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;

        // Invoice Info
        doc.text(`Invoice: ${sale.id}`, margin, yPos);
        doc.text(`Date: ${new Date(sale.date).toLocaleString()}`, pageWidth - margin, yPos, { align: 'right' });
        yPos += 8;

        // Billed To
        doc.setFont('Times-Roman', 'bold');
        doc.text('Billed To:', margin, yPos);
        doc.setFont('helvetica', 'normal');
        yPos += 4;
        doc.text(customer.name, margin, yPos);
        yPos += 4;
        doc.text(`${customer.address}, ${customer.area}`, margin, yPos);
        yPos += 8;

        // Items Table
        const formatCurrency = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const tableRows = sale.items.map(item => [
            `${item.productName}\n  (x${item.quantity} @ ${formatCurrency(item.price)})`,
            formatCurrency(item.price * item.quantity)
        ]);
        
        autoTable(doc, {
            body: tableRows,
            startY: yPos,
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
            columnStyles: {
                0: { cellWidth: 45 },
                1: { halign: 'right' }
            }
        });

        yPos = (doc as any).lastAutoTable.finalY + 5;
        
        // Divider
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        // Totals
        const subtotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const amountDue = sale.totalAmount - amountPaid;

        const totals = [
            ['Subtotal', formatCurrency(subtotal)],
            ['GST', formatCurrency(sale.gstAmount)],
            ['Discount', `- ${formatCurrency(sale.discount)}`],
            ['Total', formatCurrency(sale.totalAmount)],
            ['Paid', formatCurrency(amountPaid)],
            ['Due', formatCurrency(amountDue)]
        ];
        
        doc.setFontSize(9);
        totals.forEach(([label, value], index) => {
            const isBold = index >= 3;
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(label, margin + 30, yPos);
            doc.text(`Rs. ${value}`, pageWidth - margin, yPos, { align: 'right' });
            yPos += 5;
        });

        return doc.output('blob');
    };

    const downloadPdf = (pdfBlob: Blob, saleId: string) => {
        const url = URL.createObjectURL(pdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Bhavani-Sarees-Invoice-${saleId}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const shareOrDownloadPdf = async (pdfBlob: Blob, saleId: string, customerName: string) => {
        const pdfFile = new File([pdfBlob], `Invoice-${saleId}.pdf`, { type: 'application/pdf' });
        
        const shareData = {
            files: [pdfFile],
            title: `Bhavani Sarees Invoice for ${customerName}`,
            text: `Dear ${customerName},\n\nThank you for your purchase! Here is your invoice: ${saleId}.\n\n- Bhavani Sarees`,
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                 if ((err as Error).name !== 'AbortError') {
                   alert('Could not share the invoice. It will be downloaded instead.');
                   downloadPdf(pdfBlob, saleId);
                }
            }
        } else {
            alert('Sharing is not supported on this device. The invoice will be downloaded.');
            downloadPdf(pdfBlob, saleId);
        }
    };


    const handleCreateSale = async () => {
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
                date: new Date(paymentDate).toISOString(),
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
        
        try {
            const customer = state.customers.find(c => c.id === customerId);
            if (customer) {
                const pdfBlob = generateInvoicePDF(newSale, customer);
                await shareOrDownloadPdf(pdfBlob, newSale.id, customer.name);
            } else {
                 throw new Error("Customer details not found, so invoice could not be shared.");
            }
        } catch (error) {
            console.error("Failed to generate or share PDF:", error);
            alert(`Sale created successfully, but the PDF invoice could not be generated or shared. Error: ${(error as Error).message}`);
        }

        resetForm();
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
    
    const canCreateSale = customerId && items.length > 0;
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentAmount || '0') > 0;

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
            <h1 className="text-2xl font-bold text-primary">New Sale / Payment</h1>
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
                    <h3 className="font-semibold text-gray-800">{items.length > 0 ? 'Add Payment (Optional)' : 'Record Payment'}</h3>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                        <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={items.length > 0 ? `Total is ₹${total.toFixed(2)}` : 'Enter amount received'} className="w-full p-2 border rounded" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                        <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded">
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
                <div className="w-full mt-4">
                    {canCreateSale ? (
                        <Button onClick={handleCreateSale} className="w-full">
                            <Share2 className="w-4 h-4 mr-2" />
                            Generate & Share Invoice
                        </Button>
                    ) : canRecordPayment ? (
                        <Button onClick={handleRecordPayment} className="w-full">
                            <IndianRupee className="w-4 h-4 mr-2" />
                            Record Standalone Payment
                        </Button>
                    ) : (
                        <Button className="w-full" disabled>
                            {customerId ? 'Add items or enter payment amount' : 'Select a customer to begin'}
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default SalesPage;