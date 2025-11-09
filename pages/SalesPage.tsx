import React, { useState, useEffect } from 'react';
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

// Base64 encoded PNG of the user-provided sacred symbols image
const sacredSymbols_base64 = "data:image/png;base64,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4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4ECAAB0g6g+fr8MAAAAsP4ECAAB0g6g+fr8MAAAAsP4gAAACQEAQAABoB4";

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
    const [isScanning, setIsScanning] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    
    useEffect(() => {
        const formIsDirty = !!customerId || items.length > 0 || !!paymentAmount;
        setIsDirty(formIsDirty);

        return () => {
            setIsDirty(false);
        };
    }, [customerId, items, paymentAmount, setIsDirty]);

    const handleProductScanned = (decodedText: string) => {
        const product = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
            alert(`Product found: ${product.name}`);
        } else {
            alert(`Product with code "${decodedText}" not found in inventory.`);
        }
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
    
    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
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
        setPaymentDate(getLocalDateString());
        setNewItem({ productId: '', productName: '', quantity: '1', price: '' });
    };

    const handleRecordStandalonePayment = () => {
        if (!customerId) {
            alert('Please select a customer to record a payment for.');
            return;
        }
        const paidAmount = parseFloat(paymentAmount || '0');
        if (paidAmount <= 0) {
            alert('Please enter a valid payment amount.');
            return;
        }
        const outstandingSales = state.sales.filter(sale => {
            const paid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
            return sale.customerId === customerId && (sale.totalAmount - paid) > 0.01;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
         const customer = state.customers.find(c => c.id === customerId);
        if (!customer || items.length === 0) {
            alert('Please select a customer and add at least one item.');
            return;
        }
        const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const product = state.products.find(p => p.id === items[0].productId);
        const gstPercent = product?.gstPercent || 0;
        const gstAmount = subtotal * (gstPercent / 100);
        const totalAmount = subtotal + gstAmount - parseFloat(discount || '0');
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
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        const day = now.getDate().toString().padStart(2, '0');
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const seconds = now.getSeconds().toString().padStart(2, '0');
        const datePart = `${year}${month}${day}`;
        const timePart = `${hours}${minutes}${seconds}`;
        const saleId = `SALE-${datePart}-${timePart}`;
        const newSale: Sale = {
            id: saleId,
            customerId,
            items,
            discount: parseFloat(discount || '0'),
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
            const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 200] });
            doc.addImage(sacredSymbols_base64, 'PNG', 15, 5, 50, 8); 
            doc.setTextColor(0, 0, 0); 
            doc.setFont('helvetica');
            doc.setFontSize(8);
            doc.text('OM namo venkatesaya', 40, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text('Bhavani Sarees', 40, 27, { align: 'center' });
            doc.setDrawColor(200, 200, 200);
            doc.line(5, 34, 75, 34);
            doc.setFontSize(7);
            const saleDate = new Date(newSale.date);
            doc.text(`Invoice: ${newSale.id}`, 5, 39);
            doc.text(`Date: ${saleDate.toLocaleString()}`, 5, 43);
            doc.setFont('helvetica', 'bold');
            doc.text('Billed To:', 5, 49);
            doc.setFont('helvetica', 'normal');
            doc.text(customer.name, 5, 53);
            doc.text(`${customer.address}, ${customer.area}`, 5, 57);
            doc.line(5, 60, 75, 60);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('Purchase Details', 5, 65);
            doc.setFontSize(7);
            doc.line(5, 66, 75, 66);
            autoTable(doc, {
                startY: 68,
                head: [['Item', 'Total']],
                body: newSale.items.map(item => [
                    { content: `${item.productName}\n(x${item.quantity} @ ${item.price.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })})`, styles: { fontSize: 7, cellPadding: 1 } },
                    { content: (item.quantity * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 }), styles: { halign: 'right', fontSize: 7, cellPadding: 1 } }
                ]),
                theme: 'plain',
                styles: { textColor: '#000000', font: 'helvetica' },
                headStyles: { fontStyle: 'bold', fontSize: 8, textColor: '#000000' },
                margin: { left: 5, right: 5 },
            });
            let finalY = (doc as any).lastAutoTable.finalY + 3;
            doc.line(5, finalY, 75, finalY);
            finalY += 4;
            const totals = [
                ['Subtotal', subtotal],
                ['GST', newSale.gstAmount],
                ['Discount', -newSale.discount],
                ['Total', newSale.totalAmount],
                ['Paid', paidAmount],
                ['Due', newSale.totalAmount - paidAmount]
            ];
            doc.setFontSize(8);
            totals.forEach(([label, value]) => {
                doc.setFont('helvetica', (label === 'Total' || label === 'Due') ? 'bold' : 'normal');
                doc.text(label as string, 5, finalY);
                doc.text(`Rs. ${(value as number).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 75, finalY, { align: 'right' });
                finalY += 5;
            });
            finalY += 2;
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.text('Thank you for your business!', 40, finalY, { align: 'center' });
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `BhavaniSarees-Invoice-${newSale.id}.pdf`, { type: 'application/pdf' });
            const textSummary = `*Bhavani Sarees Invoice*\n\n` +
                `Invoice ID: ${newSale.id}\n` +
                `Date: ${saleDate.toLocaleDateString()}\n\n` +
                `*Billed To:*\n${customer.name}\n\n` +
                `*Items:*\n` +
                items.map(i => `- ${i.productName} (x${i.quantity}) @ ₹${i.price.toLocaleString('en-IN')} = ₹${(i.quantity * i.price).toLocaleString('en-IN')}`).join('\n') +
                `\n\n` +
                `Subtotal: ₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
                `GST: ₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
                `Discount: -₹${newSale.discount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
                `*Total: ₹${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n` +
                `Paid: ₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
                `*Due: ₹${(totalAmount - paidAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}*\n\n` +
                `Thank you!`;
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    title: 'Bhavani Sarees Invoice',
                    text: textSummary,
                    files: [pdfFile],
                });
            } else {
                 doc.save(`BhavaniSarees-Invoice-${newSale.id}.pdf`);
            }
            alert("Sale created successfully!");
            resetForm();
        } catch (error) {
            console.error("PDF generation or sharing failed:", error);
            alert(`Sale created successfully, but the PDF invoice could not be generated or shared. Error: ${(error as Error).message}`);
            resetForm();
        }
    };
    
    const QRScannerModal: React.FC = () => {
        const [scanStatus, setScanStatus] = useState<string>("Requesting camera permissions...");

        useEffect(() => {
            const html5QrCode = new Html5Qrcode("qr-reader");

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
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
                .then(() => {
                    setScanStatus("Scanning for QR Code...");
                })
                .catch(err => {
                    console.error("Camera start failed.", err);
                    setScanStatus(`Failed to start camera. Please grant camera permissions in your browser settings. Error: ${err}`);
                });

            return () => {
                 if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().catch(err => {
                        console.error("Failed to stop QR scanner on cleanup.", err);
                    });
                }
            };
        }, []);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4">
                <Card title="Scan Product QR Code" className="w-full max-w-md">
                    <div id="qr-reader" className="w-full"></div>
                    {scanStatus && <p className="text-center text-sm mt-2 text-gray-600">{scanStatus}</p>}
                    <Button onClick={() => setIsScanning(false)} variant="secondary" className="mt-4 w-full">Cancel Scan</Button>
                </Card>
            </div>
        );
    };

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const product = items.length > 0 ? state.products.find(p => p.id === items[0].productId) : null;
    const gstAmount = subtotal * ((product?.gstPercent || 0) / 100);
    const totalAmount = subtotal + gstAmount - parseFloat(discount || '0');
    
    const canCreateSale = customerId && items.length > 0;
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentAmount || '0') > 0;

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary">New Sale / Payment</h1>

            {isScanning && <QRScannerModal />}
            {isSelectingProduct && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                     <Card title="Select Product" className="w-full max-w-md max-h-[80vh] flex flex-col">
                         <div className="relative mb-4">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                value={productSearchTerm}
                                onChange={(e) => setProductSearchTerm(e.target.value)}
                                className="w-full p-2 pl-10 border rounded-lg"
                                autoFocus
                            />
                         </div>
                         <div className="flex-grow overflow-y-auto space-y-2">
                            {state.products
                                .filter(p => p.quantity > 0 && (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.id.toLowerCase().includes(productSearchTerm.toLowerCase())))
                                .map(p => (
                                <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 bg-gray-50 hover:bg-purple-100 rounded cursor-pointer">
                                    <p className="font-semibold">{p.name}</p>
                                    <p className="text-sm text-gray-500">Code: {p.id} | Stock: {p.quantity}</p>
                                </div>
                            ))}
                         </div>
                         <Button onClick={() => setIsSelectingProduct(false)} variant="secondary" className="mt-4 w-full">Close</Button>
                     </Card>
                 </div>
            )}

            <Card>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2 border rounded">
                    <option value="">Select Customer</option>
                    {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.area}</option>)}
                </select>
            </Card>

            <Card title="Sale Items">
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                            <div>
                                <p className="font-semibold">{item.productName}</p>
                                <p className="text-sm text-gray-600">x{item.quantity} @ ₹{item.price.toLocaleString('en-IN')}</p>
                            </div>
                            <Button onClick={() => handleRemoveItem(index)} variant="danger" className="p-2 h-8 w-8"><Trash2 size={16}/></Button>
                        </div>
                    ))}
                </div>

                <div className="pt-4 mt-4 border-t">
                    <h3 className="font-semibold mb-2">Add Item</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Button onClick={() => setIsSelectingProduct(true)} variant="secondary" className="w-full">
                            <Search size={16} className="mr-2"/>
                            Select from Stock
                        </Button>
                         <Button onClick={() => setIsScanning(true)} variant="secondary" className="w-full">
                            <QrCode size={16} className="mr-2"/>
                            Scan Product QR
                        </Button>
                    </div>

                    {newItem.productId && (
                        <div className="mt-2 p-3 bg-purple-50 rounded">
                            <p>Selected: <span className="font-bold">{newItem.productName}</span></p>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <input type="number" placeholder="Quantity" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="w-full p-2 border rounded" />
                                <input type="number" placeholder="Price" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                            <Button onClick={handleAddItem} className="w-full mt-2"><Plus size={16} className="mr-2"/> Add Item to Sale</Button>
                        </div>
                    )}
                </div>
            </Card>

            <Card title={items.length > 0 ? 'Payment & Summary' : 'Record Payment'}>
                 <div className="space-y-3">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                        <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={items.length > 0 ? 'Enter amount if paid' : 'Enter payment amount'} className="w-full p-2 border rounded" />
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
                    {items.length > 0 && (
                        <>
                        <div className="pt-3 border-t">
                            <label className="block text-sm font-medium text-gray-700">Discount</label>
                            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div className="space-y-1 text-right font-medium pt-3 border-t">
                            <p>Subtotal: ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            <p>GST ({product?.gstPercent || 0}%): ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            <p className="text-lg font-bold">Total: ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                        </>
                    )}
                </div>
            </Card>

            <div className="mt-4">
                 {canCreateSale ? (
                    <Button onClick={handleCreateSaleAndShare} className="w-full text-lg py-3">
                        <Share2 className="w-5 h-5 mr-2" />
                        Generate & Share Invoice
                    </Button>
                ) : canRecordPayment ? (
                    <Button onClick={handleRecordStandalonePayment} className="w-full text-lg py-3">
                        <IndianRupee className="w-5 h-5 mr-2" />
                        Record Standalone Payment
                    </Button>
                ) : (
                     <Button className="w-full text-lg py-3" disabled>
                        {customerId ? 'Add items to create a sale' : 'Select a customer to begin'}
                    </Button>
                )}
            </div>

        </div>
    );
};

export default SalesPage;