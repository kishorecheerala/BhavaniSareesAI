import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee, QrCode } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale, SaleItem, Customer, Product, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
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
    const [discount, setDiscount] = useState('0');
    
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CHEQUE'>('CASH');
    const [paymentDate, setPaymentDate] = useState(getLocalDateString());

    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);

    useEffect(() => {
        const formIsDirty = !!customerId || items.length > 0 || discount !== '0' || !!paymentAmount;
        setIsDirty(formIsDirty);

        return () => {
            setIsDirty(false);
        };
    }, [customerId, items, discount, paymentAmount, setIsDirty]);

    const resetForm = () => {
        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setPaymentAmount('');
        setPaymentMethod('CASH');
        setPaymentDate(getLocalDateString());
        setProductSearchTerm('');
        setIsSelectingProduct(false);
    };
    
    const handleSelectProduct = (product: Product) => {
        const newItem = {
            productId: product.id,
            productName: product.name,
            price: product.salePrice,
            quantity: 1,
        };

        const existingItem = items.find(i => i.productId === newItem.productId);
        if (existingItem) {
            if (existingItem.quantity + 1 > product.quantity) {
                 alert(`Not enough stock for ${product.name}. Only ${product.quantity} available.`);
                 return;
            }
            setItems(items.map(i => i.productId === newItem.productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
             if (1 > product.quantity) {
                 alert(`Not enough stock for ${product.name}. Only ${product.quantity} available.`);
                 return;
            }
            setItems([...items, newItem]);
        }
        
        setIsSelectingProduct(false);
        setProductSearchTerm('');
    };
    
    const handleProductScanned = (decodedText: string) => {
        const product = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
        } else {
            alert("Product not found in inventory.");
        }
    };

    const handleRemoveItem = (productId: string) => {
        setItems(items.filter(item => item.productId !== productId));
    };

    const calculations = useMemo(() => {
        const subTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const discountAmount = parseFloat(discount) || 0;
        
        const gstAmount = items.reduce((sum, item) => {
            const product = state.products.find(p => p.id === item.productId);
            if (product && product.gstPercent > 0) {
                const itemTotal = item.price * item.quantity;
                const gst = (itemTotal * product.gstPercent) / (100 + product.gstPercent);
                return sum + gst;
            }
            return sum;
        }, 0);

        const totalAmount = subTotal - discountAmount;
        return { subTotal, discountAmount, gstAmount, totalAmount };
    }, [items, discount, state.products]);

    const generateAndSharePDF = async (sale: Sale, customer: Customer) => {
      try {
        const doc = new jsPDF({
          orientation: 'p',
          unit: 'px',
          format: [240, 400]
        });

        // Add Fonts
        doc.addFont('Helvetica', 'normal', 'normal');
        
        // Header
        doc.setFontSize(8);
        doc.setTextColor('#000000');
        doc.text('OM namo venkatesaya', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor('#6a0dad');
        doc.setFont('Helvetica', 'bold');
        doc.text('Bhavani Sarees', doc.internal.pageSize.getWidth() / 2, 35, { align: 'center' });
        doc.setFont('Helvetica', 'normal');

        // Invoice Info
        doc.setFontSize(7);
        doc.setTextColor('#333333');
        const invoiceDate = new Date(sale.date);
        doc.text(`Invoice: ${sale.id}`, 15, 55);
        doc.text(`Date: ${invoiceDate.toLocaleDateString()}, ${invoiceDate.toLocaleTimeString()}`, 15, 65);

        // Billed To
        doc.text('Billed To:', 15, 80);
        doc.setFont('Helvetica', 'bold');
        doc.text(customer.name.toUpperCase(), 15, 90);
        doc.setFont('Helvetica', 'normal');
        doc.text(customer.address, 15, 100);

        // Purchase Details Header
        doc.setLineWidth(0.5);
        doc.line(15, 110, doc.internal.pageSize.getWidth() - 15, 110);
        doc.setFontSize(9);
        doc.setFont('Helvetica', 'bold');
        doc.text('Purchase Details', 15, 120);
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        
        // Manual Table
        let y = 135;
        sale.items.forEach(item => {
            doc.text(item.productName, 15, y);
            const itemTotal = (item.quantity * item.price).toLocaleString('en-IN', { minimumFractionDigits: 2 });
            doc.text(`Rs. ${itemTotal}`, doc.internal.pageSize.getWidth() - 15, y, { align: 'right' });
            y += 10;
            doc.setFontSize(7);
            doc.setTextColor('#666666');
            doc.text(`(x${item.quantity} @ ${item.price.toLocaleString('en-IN')})`, 15, y);
            doc.setFontSize(8);
            doc.setTextColor('#333333');
            y += 15;
        });

        // Totals
        doc.line(15, y, doc.internal.pageSize.getWidth() - 15, y);
        y += 15;
        
        const totals = [
            { label: 'Subtotal', value: calculations.subTotal },
            { label: 'GST', value: calculations.gstAmount },
            { label: 'Discount', value: -calculations.discountAmount },
            { label: 'Total', value: calculations.totalAmount, bold: true },
            { label: 'Paid', value: sale.payments.reduce((sum, p) => sum + p.amount, 0) },
            { label: 'Due', value: calculations.totalAmount - sale.payments.reduce((sum, p) => sum + p.amount, 0), bold: true },
        ];
        
        totals.forEach(({label, value, bold = false}) => {
            doc.setFont('Helvetica', bold ? 'bold' : 'normal');
            doc.text(label, doc.internal.pageSize.getWidth() / 2 - 10, y, { align: 'right' });
            doc.text(`Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, doc.internal.pageSize.getWidth() - 15, y, { align: 'right' });
            y += (bold ? 12 : 10);
        });

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `${sale.id}.pdf`, { type: 'application/pdf' });

        const whatsAppText = `Thank you for your purchase from Bhavani Sarees!\n\n*Invoice Summary:*\nInvoice ID: ${sale.id}\nDate: ${new Date(sale.date).toLocaleString()}\n\n*Items:*\n${sale.items.map(i => `- ${i.productName} (x${i.quantity}) - Rs. ${(i.price * i.quantity).toLocaleString('en-IN')}`).join('\n')}\n\n*Total: Rs. ${sale.totalAmount.toLocaleString('en-IN')}*\nPaid: Rs. ${sale.payments.reduce((s,p) => s+p.amount,0).toLocaleString('en-IN')}\nDue: Rs. {(sale.totalAmount - sale.payments.reduce((s,p) => s+p.amount,0)).toLocaleString('en-IN')}\n\nHave a blessed day!`;

        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: `Bhavani Sarees Invoice ${sale.id}`,
            text: whatsAppText,
            files: [pdfFile],
          });
        } else {
          doc.save(`${sale.id}.pdf`);
          alert("Invoice downloaded. Your device does not support direct sharing.");
        }
      } catch (error) {
        console.error("PDF generation or sharing failed:", error);
        alert(`Sale created successfully, but the PDF invoice could not be generated or shared. Error: ${(error as Error).message}`);
      }
    };


    const handleCompleteSale = async () => {
        if (!customerId || items.length === 0) {
            alert("Please select a customer and add at least one item.");
            return;
        }

        const customer = state.customers.find(c => c.id === customerId);
        if(!customer) {
            alert("Could not find the selected customer.");
            return;
        }
        
        const { totalAmount, gstAmount, discountAmount } = calculations;
        const paidAmount = parseFloat(paymentAmount) || 0;

        if (paidAmount > totalAmount + 0.01) {
            alert(`Paid amount (₹${paidAmount.toLocaleString('en-IN')}) cannot be greater than the total amount (₹${totalAmount.toLocaleString('en-IN')}).`);
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
        
        const now = new Date();
        const saleId = `SALE-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;

        const newSale: Sale = {
            id: saleId,
            customerId,
            items,
            discount: discountAmount,
            gstAmount: gstAmount,
            totalAmount,
            date: now.toISOString(),
            payments
        };

        dispatch({ type: 'ADD_SALE', payload: newSale });

        items.forEach(item => {
            dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -item.quantity } });
        });
        
        await generateAndSharePDF(newSale, customer);
        resetForm();
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
        
        let remainingPayment = paidAmount;
        for (const sale of outstandingSales) {
            if (remainingPayment <= 0) break;

            const paid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const dueAmount = sale.totalAmount - paid;
            
            const amountToApply = Math.min(remainingPayment, dueAmount);

            const newPayment: Payment = {
                id: `PAY-S-${Date.now()}-${Math.random()}`,
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


    const ProductSearchModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Select Product</h2>
            <Button onClick={() => setIsSelectingProduct(false)} variant="secondary" className="p-2 h-8 w-8"><X size={16}/></Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={productSearchTerm}
              onChange={e => setProductSearchTerm(e.target.value)}
              className="w-full p-2 pl-10 border rounded-lg"
              autoFocus
            />
          </div>
          <div className="mt-4 max-h-80 overflow-y-auto space-y-2">
            {state.products
              .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.id.toLowerCase().includes(productSearchTerm.toLowerCase()))
              .map(p => (
              <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-100 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-gray-500">Code: {p.id}</p>
                </div>
                <div className="text-right">
                    <p className="font-semibold">₹{p.salePrice.toLocaleString('en-IN')}</p>
                    <p className="text-sm">Stock: {p.quantity}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
    
     const QRScannerModal: React.FC = () => {
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
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            Html5Qrcode.getCameras().then(cameras => {
                if (cameras && cameras.length) {
                    html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
                        .then(() => setScanStatus("Scanning for QR Code..."))
                        .catch(err => setScanStatus(`Camera Error: ${err}. Please grant permissions.`));
                } else {
                    setScanStatus("No cameras found on this device.");
                }
            }).catch(err => {
                setScanStatus(`Camera Permission Error: ${err}. Please allow camera access in your browser settings.`);
            });

            return () => {
                if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().catch(err => console.error("Cleanup stop scan failed.", err));
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

    const canCreateSale = customerId && items.length > 0;
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentAmount || '0') > 0;

    return (
        <div className="space-y-4">
            {isSelectingProduct && <ProductSearchModal />}
            {isScanning && <QRScannerModal />}
            <h1 className="text-2xl font-bold text-primary">New Sale / Payment</h1>
            
            <Card>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2 border rounded">
                    <option value="">Select a Customer</option>
                    {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.area}</option>)}
                </select>
            </Card>

            <Card title="Sale Items">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => setIsSelectingProduct(true)} className="w-full sm:w-auto flex-grow">
                        <Search size={16} className="mr-2"/> Select Product from Stock
                    </Button>
                    <Button onClick={() => setIsScanning(true)} variant="secondary" className="w-full sm:w-auto flex-grow">
                         <QrCode size={16} className="mr-2"/> Scan Product QR
                    </Button>
                </div>
                {items.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {items.map(item => (
                            <div key={item.productId} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <div>
                                    <p className="font-semibold">{item.productName}</p>
                                    <p className="text-sm">{item.quantity} x ₹{item.price.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p>₹{(item.quantity * item.price).toLocaleString('en-IN')}</p>
                                    <button onClick={() => handleRemoveItem(item.productId)} className="p-2 rounded-full text-red-500 hover:bg-red-100 transition-colors">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {(items.length > 0 || customerId) && (
                <Card title={items.length > 0 ? 'Billing & Payment' : 'Record Standalone Payment'}>
                    {items.length > 0 && (
                        <div className="mb-4 pb-4 border-b space-y-2 text-right">
                            <p>Subtotal: ₹{calculations.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                            <div className="flex justify-end items-center gap-2">
                                <label>Discount:</label>
                                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-28 p-1 border rounded text-right" />
                            </div>
                            <p className="text-xs text-gray-500">(GST of ₹{calculations.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })} included)</p>
                            <p className="text-lg font-bold">Total: ₹{calculations.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                        </div>
                    )}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                            <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder={items.length > 0 ? `Total is ₹${calculations.totalAmount.toLocaleString('en-IN')}` : 'Enter amount to pay dues'} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                </Card>
            )}

            <div className="space-y-2">
                {canCreateSale ? (
                    <Button onClick={handleCompleteSale} className="w-full">
                        <Share2 className="w-4 h-4 mr-2"/>
                        Create Sale & Share Invoice
                    </Button>
                ) : canRecordPayment ? (
                     <Button onClick={handleRecordStandalonePayment} className="w-full">
                        <IndianRupee className="w-4 h-4 mr-2" />
                        Record Standalone Payment
                    </Button>
                ) : (
                     <Button className="w-full" disabled>
                        {customerId ? (items.length === 0 ? 'Add items or enter payment amount' : 'Add items to cart') : 'Select a customer to begin'}
                    </Button>
                )}
                <Button onClick={resetForm} variant="secondary" className="w-full">Clear Form</Button>
            </div>
        </div>
    );
};

export default SalesPage;