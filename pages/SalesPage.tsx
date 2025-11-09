import React, { useState } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale, SaleItem, Customer, Product, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';

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
    
    const svgToPngDataUrl = (svgString: string, width: number, height: number): Promise<string> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const pngDataUrl = canvas.toDataURL('image/png');
                    URL.revokeObjectURL(url);
                    resolve(pngDataUrl);
                } else {
                    URL.revokeObjectURL(url);
                    reject(new Error('Could not get canvas context'));
                }
            };
            img.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(err);
            };
            img.src = url;
        });
    };

    const generateInvoicePDF = async (sale: Sale, customer: Customer): Promise<Blob> => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [80, 160] // A bit taller for the new header
        });
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 5;
        let yPos = 5;

        // Sacred Symbols from user-provided image
        const chakraSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6a0dad" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="4.93" y1="4.93" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.07" y2="19.07"/><line x1="4.93" y1="19.07" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.07" y2="4.93"/></svg>`;
        const tilakaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6a0dad" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C9.25 8 9.25 14 12 22"/><path d="M12 2c2.75 6 2.75 12 0 20"/><path d="M12 8v8"/></svg>`;
        const shankhaSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#6a0dad" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a3 3 0 013-3h1m5 0h1a3 3 0 013 3v2a3 3 0 01-3 3h-1m-5 0H7a3 3 0 01-3-3v-2m14-2a2 2 0 10-4 0 4 4 0 10-8 0 6 6 0 1012 0Z"/></svg>`;

        const logoSize = 10;
        const logoY = yPos;
        const totalLogoWidth = logoSize * 3 + 8; // 3 logos, 4mm padding between them
        let logoX = (pageWidth - totalLogoWidth) / 2;
        
        const chakraPng = await svgToPngDataUrl(chakraSvg, 100, 100);
        const tilakaPng = await svgToPngDataUrl(tilakaSvg, 100, 100);
        const shankhaPng = await svgToPngDataUrl(shankhaSvg, 100, 100);
        
        doc.addImage(chakraPng, 'PNG', logoX, logoY, logoSize, logoSize);
        logoX += logoSize + 4;
        doc.addImage(tilakaPng, 'PNG', logoX, logoY, logoSize, logoSize);
        logoX += logoSize + 4;
        doc.addImage(shankhaPng, 'PNG', logoX, logoY, logoSize, logoSize);
        yPos += logoSize + 4;
        
        // Invocation
        doc.setFont('Times-Roman', 'italic');
        doc.setFontSize(9);
        doc.setTextColor('#333333');
        doc.text('OM namo venkatesaya', pageWidth / 2, yPos, { align: 'center' });
        yPos += 7;

        // Title
        doc.setFont('Times-Roman', 'bold');
        doc.setFontSize(16);
        doc.setTextColor('#6a0dad');
        doc.text('Bhavani Sarees', pageWidth / 2, yPos, { align: 'center' });
        yPos += 6;
        
        // Divider
        doc.setDrawColor('#EAE0F5');
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        // Invoice Info
        doc.setFontSize(8);
        doc.text(`Invoice: ${sale.id}`, margin, yPos);
        yPos += 4;
        doc.text(`Date: ${new Date(sale.date).toLocaleString()}`, margin, yPos);
        yPos += 7;

        // Billed To
        doc.setFont('Times-Roman', 'bold');
        doc.text('Billed To:', margin, yPos);
        yPos += 4;
        doc.setFont('helvetica', 'normal');
        const customerDetails = doc.splitTextToSize(`${customer.name}\n${customer.address}, ${customer.area}`, pageWidth - margin * 2);
        doc.text(customerDetails, margin, yPos);
        yPos += (customerDetails.length * 4) + 4;

        // Purchase Details Header
        doc.setFont('Times-Roman', 'bold');
        doc.setFontSize(10);
        doc.text('Purchase Details', margin, yPos);
        yPos += 5;
        
        // Items Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Item', margin, yPos);
        doc.text('Total', pageWidth - margin, yPos, { align: 'right' });
        yPos += 1;
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 4;

        // Items List (Manual Layout)
        doc.setFont('helvetica', 'normal');
        sale.items.forEach(item => {
            const itemText = `${item.productName}\n(x${item.quantity} @ ${item.price.toLocaleString('en-IN', { minimumFractionDigits: 2 })})`;
            const itemLines = doc.splitTextToSize(itemText, 45); // Max width for item text
            
            const itemTotal = (item.price * item.quantity).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            
            doc.text(itemLines, margin, yPos);
            doc.text(itemTotal, pageWidth - margin, yPos, { align: 'right' });
            
            yPos += (itemLines.length * 4) + 2; // Move yPos down
        });
        
        yPos += 3;
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;

        // Totals
        const subtotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const amountDue = sale.totalAmount - amountPaid;

        const totals = [
            ['Subtotal', subtotal],
            ['GST', sale.gstAmount],
            ['Discount', -sale.discount],
            ['Total', sale.totalAmount],
            ['Paid', amountPaid],
            ['Due', amountDue]
        ];
        
        doc.setFontSize(9);
        totals.forEach(([label, value], index) => {
            const isBold = index >= 3;
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            doc.text(label, pageWidth / 2 - 2, yPos, { align: 'right' });
            doc.text(`Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, pageWidth - margin, yPos, { align: 'right' });
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

    const shareOrDownloadPdf = async (pdfBlob: Blob, sale: Sale, customer: Customer) => {
        const pdfFile = new File([pdfBlob], `Invoice-${sale.id}.pdf`, { type: 'application/pdf' });
        
        const formatCurrency = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const subtotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const amountDue = sale.totalAmount - amountPaid;

        const itemsText = sale.items.map(item => 
            `- ${item.productName} (x${item.quantity} @ ₹${formatCurrency(item.price)}) = ₹${formatCurrency(item.quantity * item.price)}`
        ).join('\n');

        const summaryText = `*Bhavani Sarees Invoice*
-----------------------------------
To: ${customer.name}
Phone: ${customer.phone}
Invoice ID: ${sale.id}
Date: ${new Date(sale.date).toLocaleDateString()}

*Items:*
${itemsText}

-----------------------------------
Subtotal: ₹${formatCurrency(subtotal)}
GST: ₹${formatCurrency(sale.gstAmount)}
Discount: - ₹${formatCurrency(sale.discount)}
-----------------------------------
*Total: ₹${formatCurrency(sale.totalAmount)}*
Paid: ₹${formatCurrency(amountPaid)}
*Due: ₹${formatCurrency(amountDue)}*
-----------------------------------
Thank you for your business!
OM namo venkatesaya`;

        const shareData = {
            files: [pdfFile],
            title: `Bhavani Sarees Invoice for ${customer.name}`,
            text: summaryText,
        };

        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            try {
                await navigator.share(shareData);
            } catch (err) {
                 if ((err as Error).name !== 'AbortError') {
                   alert('Could not share the invoice. It will be downloaded instead.');
                   downloadPdf(pdfBlob, sale.id);
                }
            }
        } else {
            alert('Sharing is not supported on this device. The invoice will be downloaded.');
            downloadPdf(pdfBlob, sale.id);
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
                const pdfBlob = await generateInvoicePDF(newSale, customer);
                await shareOrDownloadPdf(pdfBlob, newSale, customer);
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