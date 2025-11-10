import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee, QrCode } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale, SaleItem, Customer, Product, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Html5Qrcode } from 'html5-qrcode';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface SalesPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const SalesPage: React.FC<SalesPageProps> = ({ setIsDirty }) => {
    const { state, dispatch } = useAppContext();
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [newItem, setNewItem] = useState<{ productId: string; productName: string; quantity: string; price: string }>({ productId: '', productName: '', quantity: '1', price: '' });
    const [discount, setDiscount] = useState('0');
    
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CHEQUE'>('CASH');
    const [paymentDate, setPaymentDate] = useState(getLocalDateString());

    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        const formIsDirty = customerId !== '' || items.length > 0 || paymentAmount !== '';
        setIsDirty(formIsDirty);
        return () => {
            setIsDirty(false);
        };
    }, [customerId, items, paymentAmount, setIsDirty]);

    const resetForm = () => {
        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setPaymentAmount('');
        setPaymentMethod('CASH');
        setPaymentDate(getLocalDateString());
        setNewItem({ productId: '', productName: '', quantity: '1', price: '' });
    };

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

    const handleProductScanned = (decodedText: string) => {
        const product = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
            alert(`Product "${product.name}" selected.`);
        } else {
            alert(`Product with code "${decodedText}" not found in inventory.`);
        }
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
        if (paidAmount > totalDueForCustomer + 0.01) {
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

    const handleCreateSaleAndShare = async () => {
        if (!customerId || items.length === 0) {
            alert("Please select a customer and add items.");
            return;
        }

        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const gstTotal = items.reduce((sum, i) => {
            const product = state.products.find(p => p.id === i.productId);
            const gstPercent = product?.gstPercent || 0;
            return sum + (i.price * i.quantity * (gstPercent / 100));
        }, 0);
        const finalDiscount = parseFloat(discount) || 0;
        const totalAmount = subtotal + gstTotal - finalDiscount;

        const payments: Payment[] = [];
        const paidAmount = parseFloat(paymentAmount || '0');
        if (paidAmount > 0) {
            if (paidAmount > totalAmount + 0.01) {
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
        
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        
        const newSale: Sale = {
            id: `SALE-${dateStr}-${timeStr}`,
            customerId,
            items,
            discount: finalDiscount,
            gstAmount: gstTotal,
            totalAmount,
            date: now.toISOString(),
            payments,
        };

        dispatch({ type: 'ADD_SALE', payload: newSale });
        items.forEach(item => {
            dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -item.quantity } });
        });

        // --- PDF Generation ---
        try {
            const doc = new jsPDF({
                orientation: 'p',
                unit: 'mm',
                format: [80, 200]
            });
            const customer = state.customers.find(c => c.id === customerId)!;
            let currentY = 15;

            // Header
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text('OM namo venkatesaya', 40, currentY, { align: 'center' });
            currentY += 7;

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor('#6a0dad');
            doc.text('Bhavani Sarees', 40, currentY, { align: 'center' });
            currentY += 8;

            // Invoice Info
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.text(`Invoice: ${newSale.id}`, 5, currentY);
            currentY += 4;
            doc.text(`Date: ${new Date(newSale.date).toLocaleString()}`, 5, currentY);
            currentY += 6;

            // Billed to
            doc.setFont('helvetica', 'bold');
            doc.text('Billed To:', 5, currentY);
            currentY += 4;
            doc.setFont('helvetica', 'normal');
            doc.text(customer.name, 5, currentY);
            currentY += 4;
            doc.text(`${customer.address}, ${customer.area}`, 5, currentY);
            currentY += 6;
            
            // Items
            doc.setFont('helvetica', 'bold');
            doc.text('Purchase Details', 5, currentY);
            currentY += 2;
            doc.line(5, currentY, 75, currentY);
            currentY += 4;

            autoTable(doc, {
                startY: currentY,
                head: [['Item', 'Total']],
                body: newSale.items.map(item => [
                    { content: `${item.productName}\n(x${item.quantity} @ ₹${item.price.toLocaleString('en-IN')})`, styles: { fontSize: 8 } },
                    { content: `₹${(item.quantity * item.price).toLocaleString('en-IN')}`, styles: { halign: 'right', fontSize: 8 } }
                ]),
                theme: 'plain',
                styles: { textColor: [0,0,0], cellPadding: 1 },
                headStyles: { fontStyle: 'bold' },
                columnStyles: { 0: { cellWidth: 50 } }
            });
            currentY = (doc as any).lastAutoTable.finalY + 2;
            doc.line(5, currentY, 75, currentY);
            currentY += 5;

            // Totals
            const totals = [
                ['Subtotal', `₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`],
                ['GST', `₹${gstTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`],
                ['Discount', `- ₹${finalDiscount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`],
            ];
            autoTable(doc, {
                startY: currentY,
                body: totals,
                theme: 'plain',
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: 'right' } }
            });
            currentY = (doc as any).lastAutoTable.finalY;

            const finalTotals = [
                ['Total', `₹${totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`],
                ['Paid', `₹${paidAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`],
                ['Due', `₹${(totalAmount - paidAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}`]
            ];
            autoTable(doc, {
                startY: currentY,
                body: finalTotals,
                theme: 'plain',
                styles: { fontSize: 10, fontStyle: 'bold' },
                columnStyles: { 1: { halign: 'right' } }
            });
            currentY = (doc as any).lastAutoTable.finalY + 10;
            
            doc.setFontSize(8);
            doc.text('Thank you for your business!', 40, currentY, { align: 'center' });
            
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `BhavaniSarees-Invoice-${newSale.id}.pdf`, { type: 'application/pdf' });

            // --- WhatsApp Sharing ---
            let textSummary = `*Bhavani Sarees Invoice*\n\n`;
            textSummary += `*Invoice ID:* ${newSale.id}\n`;
            textSummary += `*Customer:* ${customer.name}\n`;
            textSummary += `*Date:* ${new Date(newSale.date).toLocaleString()}\n\n`;
            textSummary += `*Items:*\n`;
            newSale.items.forEach(item => {
                textSummary += `- ${item.productName} (x${item.quantity}) @ ₹${item.price.toLocaleString('en-IN')} = ₹${(item.quantity * item.price).toLocaleString('en-IN')}\n`;
            });
            textSummary += `\n*Subtotal:* ₹${subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            textSummary += `\n*GST:* ₹${gstTotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            textSummary += `\n*Discount:* - ₹${finalDiscount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            textSummary += `\n\n*Total:* ₹${totalAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            textSummary += `\n*Paid:* ₹${paidAmount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            textSummary += `\n*Due:* ₹${(totalAmount - paidAmount).toLocaleString('en-IN', {minimumFractionDigits: 2})}`;
            textSummary += `\n\nThank you for your business!`;

            if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: `Invoice ${newSale.id}`,
                    text: textSummary,
                });
            } else {
                doc.save(`BhavaniSarees-Invoice-${newSale.id}.pdf`);
                alert('Invoice downloaded. Sharing not supported on this device/browser.');
            }
            alert("Sale created successfully!");
            resetForm();
        } catch (error) {
            console.error("PDF generation/sharing error:", error);
            alert(`Sale created successfully, but the PDF invoice could not be generated or shared. Error: ${(error as Error).message}`);
            resetForm();
        }
    };
    
    const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
    const gstAmount = useMemo(() => items.reduce((sum, item) => {
        const product = state.products.find(p => p.id === item.productId);
        return sum + (item.price * item.quantity * ((product?.gstPercent || 0) / 100));
    }, 0), [items, state.products]);
    const totalAmount = subtotal + gstAmount - (parseFloat(discount) || 0);

    const filteredProducts = useMemo(() => state.products.filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.id.toLowerCase().includes(productSearchTerm.toLowerCase())), [productSearchTerm, state.products]);
    
    const canCreateSale = customerId && items.length > 0;
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentAmount || '0') > 0;

    const QRScannerModal = () => {
        const [scanStatus, setScanStatus] = useState<string>("Requesting camera permissions...");

        useEffect(() => {
            const html5QrCode = new Html5Qrcode("qr-reader-sales");

            const qrCodeSuccessCallback = (decodedText: string) => {
                html5QrCode.stop().then(() => {
                    setIsScanning(false);
                    handleProductScanned(decodedText);
                }).catch(err => {
                    console.error("Failed to stop scanning.", err);
                    setIsScanning(false);
                    handleProductScanned(decodedText);
                });
            };

            Html5Qrcode.getCameras().then(cameras => {
                if (cameras && cameras.length) {
                    html5QrCode.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        qrCodeSuccessCallback,
                        undefined
                    ).then(() => {
                        setScanStatus("Scanning for QR Code...");
                    }).catch(err => {
                         setScanStatus(`Failed to start camera. Error: ${err}`);
                    });
                } else {
                    setScanStatus("No cameras found on this device.");
                }
            }).catch(err => {
                setScanStatus(`Cannot access cameras. Please grant permissions. Error: ${err}`);
            });

            return () => {
                if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().catch(err => console.error("Cleanup stop failed.", err));
                }
            };
        }, []);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
                <Card title="Scan Product QR Code" className="w-full max-w-md">
                    <div id="qr-reader-sales" className="w-full"></div>
                    {scanStatus && <p className="text-center text-sm mt-2 text-gray-600">{scanStatus}</p>}
                    <Button onClick={() => setIsScanning(false)} variant="secondary" className="mt-4 w-full">Cancel Scan</Button>
                </Card>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            {isScanning && <QRScannerModal />}
            <h1 className="text-2xl font-bold text-primary">New Sale / Payment</h1>

            <Card>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select Customer</label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2 border rounded-lg">
                    <option value="">-- Select a Customer --</option>
                    {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.area}</option>)}
                </select>
            </Card>

            <Card title="Sale Items">
                {items.length > 0 && (
                    <div className="space-y-2 mb-4">
                        {items.map((item, index) => (
                            <div key={index} className="p-2 bg-gray-100 rounded text-sm flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{item.productName}</p>
                                    <p className="text-xs">x{item.quantity} @ ₹{item.price.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-semibold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                    <button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-1.5 bg-red-100 text-red-600 rounded-full hover:bg-red-200 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                 <div className="pt-4 border-t space-y-3">
                    <h3 className="font-semibold">Add New Item</h3>
                    <div className="flex flex-col sm:flex-row gap-2">
                         <Button onClick={() => setIsSelectingProduct(true)} variant="secondary" className="w-full sm:w-auto">
                            <Search size={16} className="mr-2"/> Select Product
                         </Button>
                         <Button onClick={() => setIsScanning(true)} variant="secondary" className="w-full sm:w-auto">
                            <QrCode size={16} className="mr-2"/> Scan Product QR
                         </Button>
                    </div>
                    {newItem.productId && (
                         <div className="p-3 bg-purple-50 rounded-lg space-y-3">
                            <p className="font-semibold text-primary">{newItem.productName}</p>
                             <div className="grid grid-cols-2 gap-2">
                                <input type="number" placeholder="Quantity" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="w-full p-2 border rounded" />
                                <input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                            <Button onClick={handleAddItem} className="w-full"><Plus className="mr-2" size={16}/>Add to Sale</Button>
                         </div>
                    )}
                </div>
            </Card>

            <Card title="Payment Details">
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-100 rounded-lg text-center">
                            <p className="text-sm font-medium text-gray-600">Subtotal</p>
                            <p className="font-bold text-lg">₹{subtotal.toLocaleString('en-IN')}</p>
                        </div>
                         <div className="p-3 bg-gray-100 rounded-lg text-center">
                            <p className="text-sm font-medium text-gray-600">GST</p>
                            <p className="font-bold text-lg">₹{gstAmount.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Discount</label>
                        <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                    <div className="p-3 bg-primary text-white rounded-lg text-center">
                        <p className="text-sm font-medium opacity-80">Total Amount</p>
                        <p className="font-bold text-2xl">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    </div>
                     <div className="pt-4 border-t">
                        <label className="block text-sm font-medium text-gray-700">{items.length > 0 ? 'Amount Paid (Optional)' : 'Amount Paid'}</label>
                        <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" className="w-full p-2 border rounded" />
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
                        <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                </div>
            </Card>

            {isSelectingProduct && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card title="Select Product from Stock" className="w-full max-w-lg">
                        <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                autoFocus
                                value={productSearchTerm}
                                onChange={e => setProductSearchTerm(e.target.value)}
                                className="w-full p-2 pl-10 border rounded-lg"
                            />
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2">
                            {filteredProducts.map(p => (
                                <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-2 border rounded-lg hover:bg-purple-50 cursor-pointer">
                                    <p className="font-semibold">{p.name}</p>
                                    <p className="text-sm text-gray-600">Code: {p.id} | Stock: {p.quantity}</p>
                                </div>
                            ))}
                        </div>
                        <Button onClick={() => setIsSelectingProduct(false)} variant="secondary" className="mt-4 w-full">Close</Button>
                    </Card>
                </div>
            )}
            
            <div className="space-y-2">
                 {canCreateSale ? (
                    <Button onClick={handleCreateSaleAndShare} className="w-full text-lg py-3">
                        <Share2 className="w-5 h-5 mr-2" />
                        Generate & Share Invoice
                    </Button>
                ) : canRecordPayment ? (
                    <Button onClick={handleRecordPayment} className="w-full text-lg py-3">
                        <IndianRupee className="w-5 h-5 mr-2" />
                        Record Standalone Payment
                    </Button>
                ) : (
                     <Button className="w-full text-lg py-3" disabled>
                        {customerId ? 'Add items or enter payment amount' : 'Select a customer to begin'}
                    </Button>
                )}
                <Button onClick={resetForm} variant="secondary" className="w-full">Reset Form</Button>
            </div>
        </div>
    );
};
export default SalesPage;
