import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee, QrCode } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Sale, SaleItem, Customer, Product, Payment } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import { Html5Qrcode } from 'html5-qrcode';
import DeleteButton from '../components/DeleteButton';


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
    const { state, dispatch, showToast } = useAppContext();
    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [discount, setDiscount] = useState('0');
    
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: getLocalDateString(),
        reference: '',
    });

    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    
    // State for the new "Add Customer" modal
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ id: '', name: '', phone: '', address: '', area: '', reference: '' });


    useEffect(() => {
        const formIsDirty = !!customerId || items.length > 0 || discount !== '0' || !!paymentDetails.amount;
        // FIX: Coerce the potentially string result of the logical OR to a boolean using `!!`
        const newCustomerFormIsDirty = isAddingCustomer && !!(newCustomer.id || newCustomer.name || newCustomer.phone || newCustomer.address || newCustomer.area);
        setIsDirty(formIsDirty || newCustomerFormIsDirty);

        return () => {
            setIsDirty(false);
        };
    }, [customerId, items, discount, paymentDetails.amount, isAddingCustomer, newCustomer, setIsDirty]);

    const resetForm = () => {
        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setPaymentDetails({
            amount: '',
            method: 'CASH',
            date: getLocalDateString(),
            reference: '',
        });
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
            const itemGstPercent = product ? product.gstPercent : 0;
            const itemTotalWithGst = item.price * item.quantity;
            const itemGst = itemTotalWithGst - (itemTotalWithGst / (1 + (itemGstPercent / 100)));
            return sum + itemGst;
        }, 0);

        const totalAmount = subTotal - discountAmount;
        return { subTotal, discountAmount, gstAmount, totalAmount };
    }, [items, discount, state.products]);

    const handleAddCustomer = () => {
        const trimmedId = newCustomer.id.trim();
        if (!trimmedId) {
            alert('Customer ID is required.');
            return;
        }
        if (!newCustomer.name || !newCustomer.phone || !newCustomer.address || !newCustomer.area) {
            alert('Please fill all required fields (Name, Phone, Address, Area).');
            return;
        }

        const finalId = `CUST-${trimmedId}`;
        const isIdTaken = state.customers.some(c => c.id.toLowerCase() === finalId.toLowerCase());

        if (isIdTaken) {
            alert(`Customer ID "${finalId}" is already taken. Please choose another one.`);
            return;
        }

        const customerWithId: Customer = {
            name: newCustomer.name,
            phone: newCustomer.phone,
            address: newCustomer.address,
            area: newCustomer.area,
            id: finalId,
            reference: newCustomer.reference || ''
        };
        dispatch({ type: 'ADD_CUSTOMER', payload: customerWithId });
        setNewCustomer({ id: '', name: '', phone: '', address: '', area: '', reference: '' });
        setIsAddingCustomer(false);
        setCustomerId(customerWithId.id); // Automatically select the new customer
        showToast("Customer added successfully!");
    };

    const generateAndSharePDF = async (sale: Sale, customer: Customer, paidAmountOnSale: number) => {
      try {
        const renderContentOnDoc = (doc: jsPDF) => {
          doc.addFont('Times-Roman', 'Times', 'normal');
          doc.addFont('Times-Bold', 'Times', 'bold');
          doc.addFont('Times-Italic', 'Times', 'italic');

          const pageWidth = doc.internal.pageSize.getWidth();
          const centerX = pageWidth / 2;
          const margin = 5;
          const maxLineWidth = pageWidth - margin * 2;
          let y = 12;

          // Divine Flourish
          doc.setLineWidth(0.2);
          doc.setDrawColor(106, 13, 173); // primary purple
          doc.line(centerX - 20, y, centerX - 5, y); // left line
          doc.line(centerX + 5, y, centerX + 20, y); // right line
          // Simple lotus-like shape in center
          doc.line(centerX, y - 2, centerX - 2, y);
          doc.line(centerX, y - 2, centerX + 2, y);
          doc.line(centerX, y + 2, centerX - 2, y);
          doc.line(centerX, y + 2, centerX + 2, y);
          y += 5;


          doc.setFont('Times', 'bold');
          doc.setFontSize(12);
          doc.setTextColor('#000000');
          doc.text('OM namo venkatesaya', centerX, y, { align: 'center' });
          y += 7;

          doc.setFont('Times', 'bold');
          doc.setFontSize(16);
          doc.setTextColor('#6a0dad');
          doc.text('Bhavani Sarees', centerX, y, { align: 'center' });
          y += 10;

          doc.setDrawColor('#cccccc');
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor('#000000');
          
          doc.text(`Invoice: ${sale.id}`, margin, y);
          y += 4;
          doc.text(`Date: ${new Date(sale.date).toLocaleString()}`, margin, y);
          y += 5;
          
          doc.setFont('Helvetica', 'bold');
          doc.text('Billed To:', margin, y);
          y += 4;
          doc.setFont('Helvetica', 'normal');
          doc.text(customer.name, margin, y);
          y += 4;
          const addressLines = doc.splitTextToSize(customer.address, maxLineWidth);
          doc.text(addressLines, margin, y);
          y += (addressLines.length * 4); // Adjust y based on number of lines
          y += 2; // Some padding

          doc.setDrawColor('#000000');
          doc.line(margin, y, pageWidth - margin, y); 
          y += 5;
          doc.setFont('Helvetica', 'bold');
          doc.text('Purchase Details', centerX, y, { align: 'center' });
          y += 5;
          doc.line(margin, y, pageWidth - margin, y); 
          y += 5;

          doc.setFont('Helvetica', 'bold');
          doc.text('Item', margin, y);
          doc.text('Total', pageWidth - margin, y, { align: 'right' });
          y += 2;
          doc.setDrawColor('#cccccc');
          doc.line(margin, y, pageWidth - margin, y);
          y += 5;
          
          doc.setFont('Helvetica', 'normal');
          sale.items.forEach(item => {
              const itemTotal = item.price * item.quantity;
              doc.setFontSize(9);
              const splitName = doc.splitTextToSize(item.productName, maxLineWidth - 20);
              doc.text(splitName, margin, y);
              doc.text(`Rs. ${itemTotal.toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
              y += (splitName.length * 4);
              doc.setFontSize(7);
              doc.setTextColor('#666666');
              doc.text(`(x${item.quantity} @ Rs. ${item.price.toLocaleString('en-IN')})`, margin, y);
              y += 6;
              doc.setTextColor('#000000');
          });
          
          y -= 2;
          doc.setDrawColor('#cccccc');
          doc.line(margin, y, pageWidth - margin, y); 
          y += 5;

          const dueAmountOnSale = sale.totalAmount - paidAmountOnSale;

          const totals = [
              { label: 'Subtotal', value: calculations.subTotal },
              { label: 'GST', value: calculations.gstAmount },
              { label: 'Discount', value: -calculations.discountAmount },
              { label: 'Total', value: calculations.totalAmount, bold: true },
              { label: 'Paid', value: paidAmountOnSale },
              { label: 'Due', value: dueAmountOnSale, bold: true },
          ];
          
          const totalsX = pageWidth - margin;
          totals.forEach(({label, value, bold = false}) => {
              doc.setFont('Helvetica', bold ? 'bold' : 'normal');
              doc.setFontSize(bold ? 10 : 8);
              doc.text(label, totalsX - 25, y, { align: 'right' });
              doc.text(`Rs. ${value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX, y, { align: 'right' });
              y += (bold ? 5 : 4);
          });
          
          return y;
        };
        
        // 1. Create a dummy doc to calculate the final height of the content
        const dummyDoc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 500] });
        const finalY = renderContentOnDoc(dummyDoc);

        // 2. Create the actual doc with the calculated height + padding
        const doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: [80, finalY + 5]
        });

        // 3. Render the content for real on the correctly sized doc
        renderContentOnDoc(doc);
        
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `${sale.id}.pdf`, { type: 'application/pdf' });
        const dueAmountOnSale = sale.totalAmount - paidAmountOnSale;
        
        const whatsAppText = `Thank you for your purchase from Bhavani Sarees!\n\n*Invoice Summary:*\nInvoice ID: ${sale.id}\nDate: ${new Date(sale.date).toLocaleString()}\n\n*Items:*\n${sale.items.map(i => `- ${i.productName} (x${i.quantity}) - Rs. ${(i.price * i.quantity).toLocaleString('en-IN')}`).join('\n')}\n\nSubtotal: Rs. ${calculations.subTotal.toLocaleString('en-IN')}\nGST: Rs. ${calculations.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\nDiscount: Rs. ${calculations.discountAmount.toLocaleString('en-IN')}\n*Total: Rs. ${sale.totalAmount.toLocaleString('en-IN')}*\nPaid: Rs. ${paidAmountOnSale.toLocaleString('en-IN')}\nDue: Rs. ${dueAmountOnSale.toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n\nHave a blessed day!`;
        
        if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
          try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
              await navigator.clipboard.writeText(whatsAppText);
              showToast('Invoice text copied to clipboard!');
            }
          } catch (err) {
            console.warn('Could not copy text to clipboard:', err);
          }
          await navigator.share({
            title: `Bhavani Sarees Invoice ${sale.id}`,
            text: whatsAppText,
            files: [pdfFile],
          });
        } else {
          doc.save(`${sale.id}.pdf`);
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
        const paidAmount = parseFloat(paymentDetails.amount) || 0;

        if (paidAmount > totalAmount + 0.01) {
            alert(`Paid amount (₹${paidAmount.toLocaleString('en-IN')}) cannot be greater than the total amount (₹${totalAmount.toLocaleString('en-IN')}).`);
            return;
        }

        const payments: Payment[] = [];
        if (paidAmount > 0) {
            payments.push({
                id: `PAY-S-${Date.now()}`,
                amount: paidAmount,
                method: paymentDetails.method,
                date: new Date(paymentDetails.date).toISOString(),
                reference: paymentDetails.reference.trim() || undefined,
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
        
        await generateAndSharePDF(newSale, customer, paidAmount);
        resetForm();
    };

     const handleRecordStandalonePayment = () => {
        if (!customerId) {
            alert('Please select a customer to record a payment for.');
            return;
        }

        const paidAmount = parseFloat(paymentDetails.amount || '0');
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
                method: paymentDetails.method,
                date: new Date(paymentDetails.date).toISOString(),
                reference: paymentDetails.reference.trim() || undefined,
            };

            dispatch({ type: 'ADD_PAYMENT_TO_SALE', payload: { saleId: sale.id, payment: newPayment } });
            
            remainingPayment -= amountToApply;
        }
        
        alert(`Payment of ₹${paidAmount.toLocaleString('en-IN')} recorded successfully.`);
        resetForm();
    };

    const AddCustomerModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Add New Customer" className="w-full max-w-md animate-scale-in">
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                        <div className="flex items-center mt-1">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                                CUST-
                            </span>
                            <input 
                                type="text" 
                                placeholder="Enter unique ID" 
                                value={newCustomer.id} 
                                onChange={e => setNewCustomer({ ...newCustomer, id: e.target.value })} 
                                className="w-full p-2 border rounded-r-md" 
                            />
                        </div>
                    </div>
                    <input type="text" placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full p-2 border rounded" autoFocus />
                    <input type="text" placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="text" placeholder="Area/Location" value={newCustomer.area} onChange={e => setNewCustomer({ ...newCustomer, area: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="text" placeholder="Reference (Optional)" value={newCustomer.reference} onChange={e => setNewCustomer({ ...newCustomer, reference: e.target.value })} className="w-full p-2 border rounded" />
                    <div className="flex gap-2">
                        <Button onClick={handleAddCustomer} className="w-full">Save Customer</Button>
                        <Button onClick={() => { setIsAddingCustomer(false); setNewCustomer({ id: '', name: '', phone: '', address: '', area: '', reference: '' }); }} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            </Card>
        </div>
    );

    const ProductSearchModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
        <Card className="w-full max-w-lg animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Select Product</h2>
            <button onClick={() => setIsSelectingProduct(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
              <X size={20}/>
            </button>
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
        const [scanStatus, setScanStatus] = useState<string>("Click 'Start Scanning' to activate camera.");
        const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

        const startScan = () => {
            if (!html5QrCodeRef.current) return;
            setScanStatus("Requesting camera permissions...");

            const qrCodeSuccessCallback = (decodedText: string) => {
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().then(() => {
                        setIsScanning(false);
                        handleProductScanned(decodedText);
                    });
                }
            };
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };

            html5QrCodeRef.current.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
                .then(() => setScanStatus("Scanning for QR Code..."))
                .catch(err => {
                    setScanStatus(`Camera Permission Error. Please allow camera access for this site in your browser's settings.`);
                    console.error("Camera start failed.", err);
                });
        };

        useEffect(() => {
            html5QrCodeRef.current = new Html5Qrcode("qr-reader-sales");
            return () => {
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().catch(err => console.error("Cleanup stop scan failed.", err));
                }
            };
        }, []);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50 p-4 animate-fade-in-fast">
                <Card title="Scan Product QR Code" className="w-full max-w-md relative animate-scale-in">
                     <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                        <X size={20}/>
                     </button>
                    <div id="qr-reader-sales" className="w-full mt-4"></div>
                    <p className="text-center text-sm my-2 text-gray-600">{scanStatus}</p>
                    <Button onClick={startScan} className="w-full">Start Scanning</Button>
                </Card>
            </div>
        );
    };

    const canCreateSale = customerId && items.length > 0;
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentDetails.amount || '0') > 0;

    return (
        <div className="space-y-4">
            {isAddingCustomer && <AddCustomerModal />}
            {isSelectingProduct && <ProductSearchModal />}
            {isScanning && <QRScannerModal />}
            <h1 className="text-2xl font-bold text-primary">New Sale / Payment</h1>
            
            <Card>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                <div className="flex gap-2 items-center">
                    <select value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full p-2 border rounded custom-select">
                        <option value="">Select a Customer</option>
                        {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.area}</option>)}
                    </select>
                    <Button onClick={() => setIsAddingCustomer(true)} variant="secondary" className="flex-shrink-0">
                        <Plus size={16}/> New Customer
                    </Button>
                </div>
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
                            <div key={item.productId} className="flex justify-between items-center p-2 bg-gray-50 rounded animate-fade-in-fast">
                                <div>
                                    <p className="font-semibold">{item.productName}</p>
                                    <p className="text-sm">{item.quantity} x ₹{item.price.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p>₹{(item.quantity * item.price).toLocaleString('en-IN')}</p>
                                    <DeleteButton variant="remove" onClick={() => handleRemoveItem(item.productId)} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {(items.length > 0 || customerId) && (
                <Card title={items.length > 0 ? 'Billing & Payment' : 'Record Standalone Payment'}>
                    {items.length > 0 && (
                        <div className="mb-4 space-y-2">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal:</span>
                                <span>₹{calculations.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                                <span>Discount:</span>
                                <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-28 p-1 border rounded text-right" />
                            </div>
                             <div className="flex justify-between text-gray-600">
                                <span>GST Included:</span>
                                <span>₹{calculations.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                             <div className="mt-4 pt-4 border-t">
                                <div className="p-4 bg-purple-50 rounded-lg text-center">
                                    <p className="text-sm font-semibold text-gray-600">Grand Total</p>
                                    <p className="text-4xl font-bold text-primary">
                                        ₹{calculations.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                            <input type="number" value={paymentDetails.amount} onChange={e => setPaymentDetails({...paymentDetails, amount: e.target.value })} placeholder={items.length > 0 ? `Total is ₹${calculations.totalAmount.toLocaleString('en-IN')}` : 'Enter amount to pay dues'} className="w-full p-2 border-2 border-red-300 rounded-lg shadow-inner focus:ring-red-500 focus:border-red-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                            <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any})} className="w-full p-2 border rounded custom-select">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                            <input type="date" value={paymentDetails.date} onChange={e => setPaymentDetails({ ...paymentDetails, date: e.target.value })} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Reference (Optional)</label>
                            <input type="text" value={paymentDetails.reference} onChange={e => setPaymentDetails({ ...paymentDetails, reference: e.target.value })} placeholder="e.g. Transaction ID, Cheque No." className="w-full p-2 border rounded" />
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