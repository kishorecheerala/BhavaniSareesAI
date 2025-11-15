import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Plus, Trash2, Share2, Search, X, IndianRupee, QrCode, Save, Edit } from 'lucide-react';
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

const fetchImageAsBase64 = (url: string): Promise<string> =>
  fetch(url)
    .then(response => response.blob())
    .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    }));

interface SalesPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const newCustomerInitialState = { id: '', name: '', phone: '', address: '', area: '', reference: '' };

const AddCustomerModal: React.FC<{
    newCustomer: typeof newCustomerInitialState;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSave: () => void;
    onCancel: () => void;
}> = React.memo(({ newCustomer, onInputChange, onSave, onCancel }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
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
                            name="id"
                            placeholder="Enter unique ID"
                            value={newCustomer.id}
                            onChange={onInputChange}
                            className="w-full p-2 border rounded-r-md"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input type="text" placeholder="Full Name" name="name" value={newCustomer.name} onChange={onInputChange} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input type="text" placeholder="Phone Number" name="phone" value={newCustomer.phone} onChange={onInputChange} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Address</label>
                    <input type="text" placeholder="Full Address" name="address" value={newCustomer.address} onChange={onInputChange} className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Area/Location</label>
                    <input type="text" placeholder="e.g. Ameerpet" name="area" value={newCustomer.area} onChange={onInputChange} className="w-full p-2 border rounded mt-1" />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Reference (Optional)</label>
                    <input type="text" placeholder="Referred by..." name="reference" value={newCustomer.reference} onChange={onInputChange} className="w-full p-2 border rounded mt-1" />
                </div>
                <div className="flex gap-2">
                    <Button onClick={onSave} className="w-full">Save Customer</Button>
                    <Button onClick={onCancel} variant="secondary" className="w-full">Cancel</Button>
                </div>
            </div>
        </Card>
    </div>
));

const ProductSearchModal: React.FC<{
    products: Product[];
    onClose: () => void;
    onSelect: (product: Product) => void;
}> = ({ products, onClose, onSelect }) => {
    const [productSearchTerm, setProductSearchTerm] = useState('');

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
          <Card className="w-full max-w-lg animate-scale-in">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Select Product</h2>
              <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
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
              {products
                .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.id.toLowerCase().includes(productSearchTerm.toLowerCase()))
                .map(p => (
                <div key={p.id} onClick={() => onSelect(p)} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-100 flex justify-between items-center">
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
};
    
const QRScannerModal: React.FC<{
    onClose: () => void;
    onScanned: (decodedText: string) => void;
}> = ({ onClose, onScanned }) => {
    const [scanStatus, setScanStatus] = useState<string>("Click 'Start Scanning' to activate camera.");
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    const startScan = () => {
        if (!html5QrCodeRef.current) return;
        setScanStatus("Requesting camera permissions...");

        const qrCodeSuccessCallback = (decodedText: string) => {
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().then(() => {
                    onScanned(decodedText);
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
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex flex-col items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Scan Product QR Code" className="w-full max-w-md relative animate-scale-in">
                 <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                    <X size={20}/>
                 </button>
                <div id="qr-reader-sales" className="w-full mt-4"></div>
                <p className="text-center text-sm my-2 text-gray-600">{scanStatus}</p>
                <Button onClick={startScan} className="w-full">Start Scanning</Button>
            </Card>
        </div>
    );
};

const SalesPage: React.FC<SalesPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [saleToEdit, setSaleToEdit] = useState<Sale | null>(null);

    const [customerId, setCustomerId] = useState('');
    const [items, setItems] = useState<SaleItem[]>([]);
    const [discount, setDiscount] = useState('0');
    const [saleDate, setSaleDate] = useState(getLocalDateString());
    
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: getLocalDateString(),
        reference: '',
    });

    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState(newCustomerInitialState);
    const isDirtyRef = useRef(false);

    // Effect to handle switching to edit mode from another page
    useEffect(() => {
        if (state.selection?.page === 'SALES' && state.selection.action === 'edit') {
            const sale = state.sales.find(s => s.id === state.selection.id);
            if (sale) {
                setSaleToEdit(sale);
                setMode('edit');
                setCustomerId(sale.customerId);
                setItems(sale.items.map(item => ({...item}))); // Deep copy
                setDiscount(sale.discount.toString());
                setSaleDate(getLocalDateString(new Date(sale.date)));
                setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '' });
                dispatch({ type: 'CLEAR_SELECTION' });
            }
        }
    }, [state.selection, state.sales, dispatch]);

    useEffect(() => {
        const dateIsDirty = mode === 'add' && saleDate !== getLocalDateString();
        const formIsDirty = !!customerId || items.length > 0 || discount !== '0' || !!paymentDetails.amount || dateIsDirty;
        const newCustomerFormIsDirty = isAddingCustomer && !!(newCustomer.id || newCustomer.name || newCustomer.phone || newCustomer.address || newCustomer.area);
        const currentlyDirty = formIsDirty || newCustomerFormIsDirty;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [customerId, items, discount, paymentDetails.amount, isAddingCustomer, newCustomer, setIsDirty, saleDate, mode]);


    // On unmount, we must always clean up.
    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);

    const resetForm = () => {
        setCustomerId('');
        setItems([]);
        setDiscount('0');
        setSaleDate(getLocalDateString());
        setPaymentDetails({
            amount: '',
            method: 'CASH',
            date: getLocalDateString(),
            reference: '',
        });
        setIsSelectingProduct(false);
        setMode('add');
        setSaleToEdit(null);
    };
    
    const handleSelectProduct = (product: Product) => {
        const newItem = {
            productId: product.id,
            productName: product.name,
            price: product.salePrice,
            quantity: 1,
        };

        const existingItem = items.find(i => i.productId === newItem.productId);
        
        const originalQtyInSale = mode === 'edit' ? saleToEdit?.items.find(i => i.productId === product.id)?.quantity || 0 : 0;
        const availableStock = product.quantity + originalQtyInSale;

        if (existingItem) {
            if (existingItem.quantity + 1 > availableStock) {
                 alert(`Not enough stock for ${product.name}. Only ${availableStock} available for this sale.`);
                 return;
            }
            setItems(items.map(i => i.productId === newItem.productId ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
             if (1 > availableStock) {
                 alert(`Not enough stock for ${product.name}. Only ${availableStock} available for this sale.`);
                 return;
            }
            setItems([...items, newItem]);
        }
        
        setIsSelectingProduct(false);
    };
    
    const handleProductScanned = (decodedText: string) => {
        setIsScanning(false);
        const product = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
        } else {
            alert("Product not found in inventory.");
        }
    };

    const handleItemChange = (productId: string, field: 'quantity' | 'price', value: string) => {
        const numValue = parseFloat(value);
        if (isNaN(numValue) && value !== '') return;

        setItems(prevItems => prevItems.map(item => {
            if (item.productId === productId) {
                if (field === 'quantity') {
                    const product = state.products.find(p => p.id === productId);
                    const originalQtyInSale = mode === 'edit' ? saleToEdit?.items.find(i => i.productId === productId)?.quantity || 0 : 0;
                    const availableStock = (product?.quantity || 0) + originalQtyInSale;
                    if (numValue > availableStock) {
                        alert(`Not enough stock for ${item.productName}. Only ${availableStock} available for this sale.`);
                        return { ...item, quantity: availableStock };
                    }
                }
                return { ...item, [field]: numValue };
            }
            return item;
        }));
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

    const selectedCustomer = useMemo(() => customerId ? state.customers.find(c => c.id === customerId) : null, [customerId, state.customers]);

    const customerTotalDue = useMemo(() => {
        if (!customerId) return null;

        const customerSales = state.sales.filter(s => s.customerId === customerId);
        if (customerSales.length === 0) return 0;
        
        const totalBilled = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
        const totalPaid = customerSales.reduce((sum, sale) => {
            return sum + (sale.payments || []).reduce((paySum, payment) => paySum + payment.amount, 0);
        }, 0);

        return totalBilled - totalPaid;
    }, [customerId, state.sales]);

    const handleNewCustomerChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setNewCustomer(prev => ({...prev, [name]: value}));
    }, []);

    const handleCancelAddCustomer = useCallback(() => {
        setIsAddingCustomer(false);
        setNewCustomer(newCustomerInitialState);
    }, []);

    const handleAddCustomer = useCallback(() => {
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
        setNewCustomer(newCustomerInitialState);
        setIsAddingCustomer(false);
        setCustomerId(customerWithId.id);
        showToast("Customer added successfully!");
    }, [newCustomer, state.customers, dispatch, showToast]);


    const generateAndSharePDF = async (sale: Sale, customer: Customer, paidAmountOnSale: number) => {
      try {
        let qrCodeBase64: string | null = null;
        try {
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(sale.id)}&size=50x50&margin=0`;
            qrCodeBase64 = await fetchImageAsBase64(qrCodeUrl);
        } catch (error) {
            console.error("Failed to fetch QR code", error);
        }

        const renderContentOnDoc = (doc: jsPDF) => {
          const pageWidth = doc.internal.pageSize.getWidth();
          const centerX = pageWidth / 2;
          const margin = 5;
          const maxLineWidth = pageWidth - margin * 2;
          let y = 5;

          // Always render text header for invoice
          y = 10;
          doc.setFont('times', 'italic');
          doc.setFontSize(12);
          doc.setTextColor('#000000');
          doc.text('Om Namo Venkatesaya', centerX, y, { align: 'center' });
          y += 7;
          
          doc.setFont('times', 'bold');
          doc.setFontSize(16);
          doc.setTextColor('#6a0dad'); // Primary Color
          doc.text('Bhavani Sarees', centerX, y, { align: 'center' });
          y += 7;

          doc.setDrawColor('#cccccc');
          doc.line(margin, y, pageWidth - margin, y);
          y += 6;

          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor('#000000');
          
            const invoiceTextTopY = y - 3; // Approximate top of the text line
            doc.text(`Invoice: ${sale.id}`, margin, y);
            y += 4;
            doc.text(`Date: ${new Date(sale.date).toLocaleString()}`, margin, y);
            
            if (qrCodeBase64) {
                const qrSize = 15; // 15mm
                doc.addImage(qrCodeBase64, 'PNG', pageWidth - margin - qrSize, invoiceTextTopY, qrSize, qrSize);
                
                // Ensure y position is below the QR code for subsequent content
                const qrBottom = invoiceTextTopY + qrSize;
                if (qrBottom > y) {
                    y = qrBottom;
                }
            }
            y += 5;
          
          doc.setFont('Helvetica', 'bold');
          doc.text('Billed To:', margin, y);
          y += 4;
          doc.setFont('Helvetica', 'normal');
          doc.text(customer.name, margin, y);
          y += 4;
          const addressLines = doc.splitTextToSize(customer.address, maxLineWidth);
          doc.text(addressLines, margin, y);
          y += (addressLines.length * 4);
          y += 2;

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
        
        const dummyDoc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, 500] });
        const finalY = renderContentOnDoc(dummyDoc);

        const doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: [80, finalY + 5]
        });

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

    const handleSubmitSale = async () => {
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

        if (mode === 'add') {
            const paidAmount = parseFloat(paymentDetails.amount) || 0;
            if (paidAmount > totalAmount + 0.01) {
                alert(`Paid amount (₹${paidAmount.toLocaleString('en-IN')}) cannot be greater than the total amount (₹${totalAmount.toLocaleString('en-IN')}).`);
                return;
            }
            const payments: Payment[] = [];
            if (paidAmount > 0) {
                payments.push({
                    id: `PAY-S-${Date.now()}`, amount: paidAmount, method: paymentDetails.method,
                    date: new Date(paymentDetails.date).toISOString(), reference: paymentDetails.reference.trim() || undefined,
                });
            }
            
            const saleCreationDate = new Date();
            const saleDateWithTime = new Date(`${saleDate}T${saleCreationDate.toTimeString().split(' ')[0]}`);
            const saleId = `SALE-${saleCreationDate.getFullYear()}${(saleCreationDate.getMonth() + 1).toString().padStart(2, '0')}${saleCreationDate.getDate().toString().padStart(2, '0')}-${saleCreationDate.getHours().toString().padStart(2, '0')}${saleCreationDate.getMinutes().toString().padStart(2, '0')}${saleCreationDate.getSeconds().toString().padStart(2, '0')}`;
            
            const newSale: Sale = {
                id: saleId, customerId, items, discount: discountAmount, gstAmount, totalAmount,
                date: saleDateWithTime.toISOString(), payments
            };
            dispatch({ type: 'ADD_SALE', payload: newSale });
            items.forEach(item => {
                dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -item.quantity } });
            });
            showToast('Sale created successfully!');
            await generateAndSharePDF(newSale, customer, paidAmount);

        } else if (mode === 'edit' && saleToEdit) {
            const existingPayments = saleToEdit.payments || [];
            const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);

            if (totalAmount < totalPaid - 0.01) {
                alert(`The new total amount (₹${totalAmount.toLocaleString('en-IN')}) cannot be less than the amount already paid (₹${totalPaid.toLocaleString('en-IN')}).`);
                return;
            }

            const updatedSale: Sale = {
                ...saleToEdit, items, discount: discountAmount, gstAmount, totalAmount,
            };
            dispatch({ type: 'UPDATE_SALE', payload: { oldSale: saleToEdit, updatedSale } });
            showToast('Sale updated successfully!');
        }

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
        
        showToast(`Payment of ₹${paidAmount.toLocaleString('en-IN')} recorded successfully.`);
        resetForm();
    };

    const canCreateSale = customerId && items.length > 0 && mode === 'add';
    const canUpdateSale = customerId && items.length > 0 && mode === 'edit';
    const canRecordPayment = customerId && items.length === 0 && parseFloat(paymentDetails.amount || '0') > 0 && customerTotalDue != null && customerTotalDue > 0.01 && mode === 'add';
    const pageTitle = mode === 'edit' ? `Edit Sale: ${saleToEdit?.id}` : 'New Sale / Payment';

    return (
        <div className="space-y-4">
            {isAddingCustomer && 
                <AddCustomerModal 
                    newCustomer={newCustomer}
                    onInputChange={handleNewCustomerChange}
                    onSave={handleAddCustomer}
                    onCancel={handleCancelAddCustomer}
                />
            }
            {isSelectingProduct && 
                <ProductSearchModal 
                    products={state.products}
                    onClose={() => setIsSelectingProduct(false)}
                    onSelect={handleSelectProduct}
                />
            }
            {isScanning && 
                <QRScannerModal 
                    onClose={() => setIsScanning(false)}
                    onScanned={handleProductScanned}
                />
            }
            <h1 className="text-2xl font-bold text-primary">{pageTitle}</h1>
            
            <Card>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                        {!selectedCustomer ? (
                            <div className="flex gap-2 items-center">
                                <select 
                                    value={customerId} 
                                    onChange={e => setCustomerId(e.target.value)} 
                                    className="w-full p-2 border rounded custom-select"
                                    disabled={mode === 'edit'}
                                >
                                    <option value="">Select a Customer</option>
                                    {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.area}</option>)}
                                </select>
                                {mode === 'add' && (
                                    <Button onClick={() => setIsAddingCustomer(true)} variant="secondary" className="flex-shrink-0">
                                        <Plus size={16}/> New Customer
                                    </Button>
                                )}
                            </div>
                        ) : (
                             <div className="p-3 border rounded bg-gray-50 flex justify-between items-center">
                                <div>
                                    <p className="font-semibold text-gray-800">{selectedCustomer.name}</p>
                                    <p className="text-sm text-gray-500">{selectedCustomer.area}</p>
                                </div>
                                {mode === 'add' && items.length === 0 && (
                                        <button onClick={() => setCustomerId('')} className="text-sm text-blue-600 hover:underline font-semibold">Change</button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Sale Date</label>
                        <input 
                            type="date" 
                            value={saleDate} 
                            onChange={e => setSaleDate(e.target.value)} 
                            className="w-full p-2 border rounded mt-1"
                            disabled={mode === 'edit'}
                        />
                    </div>

                    {customerId && customerTotalDue !== null && mode === 'add' && (
                        <div className="p-2 bg-gray-50 rounded-lg text-center border">
                            <p className="text-sm font-medium text-gray-600">
                                Selected Customer's Total Outstanding Due:
                            </p>
                            <p className={`text-xl font-bold ${customerTotalDue > 0.01 ? 'text-red-600' : 'text-green-600'}`}>
                                ₹{customerTotalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    )}
                </div>
            </Card>


            <Card title="Sale Items">
                <div className="flex flex-col sm:flex-row gap-2">
                    <Button onClick={() => setIsSelectingProduct(true)} className="w-full sm:w-auto flex-grow" disabled={!customerId}>
                        <Search size={16} className="mr-2"/> Select Product
                    </Button>
                    <Button onClick={() => setIsScanning(true)} variant="secondary" className="w-full sm:w-auto flex-grow" disabled={!customerId}>
                        <QrCode size={16} className="mr-2"/> Scan Product
                    </Button>
                </div>
                <div className="mt-4 space-y-2">
                    {items.map(item => (
                        <div key={item.productId} className="p-2 bg-gray-50 rounded animate-fade-in-fast border">
                            <div className="flex justify-between items-start">
                                <p className="font-semibold flex-grow">{item.productName}</p>
                                <DeleteButton variant="remove" onClick={() => handleRemoveItem(item.productId)} />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-1">
                                <input type="number" value={item.quantity} onChange={e => handleItemChange(item.productId, 'quantity', e.target.value)} className="w-20 p-1 border rounded" placeholder="Qty"/>
                                <span>x</span>
                                <input type="number" value={item.price} onChange={e => handleItemChange(item.productId, 'price', e.target.value)} className="w-24 p-1 border rounded" placeholder="Price"/>
                                <span>= ₹{(item.quantity * item.price).toLocaleString('en-IN')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card title="Transaction Details">
                <div className="space-y-6">
                    {/* Section 1: Calculation Details */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-gray-700">
                            <span>Subtotal:</span>
                            <span>₹{calculations.subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-700">
                            <span>Discount:</span>
                            <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} className="w-28 p-1 border rounded text-right" />
                        </div>
                        <div className="flex justify-between items-center text-gray-700">
                            <span>GST Included:</span>
                            <span>₹{calculations.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Section 2: Grand Total */}
                    <div className="text-center">
                        <p className="text-sm text-gray-500">Grand Total</p>
                        <p className="text-4xl font-bold text-primary">
                            ₹{calculations.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>

                    {/* Section 3: Payment Details */}
                    {mode === 'add' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Amount Paid Now</label>
                                <input type="number" value={paymentDetails.amount} onChange={e => setPaymentDetails({...paymentDetails, amount: e.target.value })} placeholder={`Total is ₹${calculations.totalAmount.toLocaleString('en-IN')}`} className="w-full p-2 border-2 border-red-300 rounded-lg shadow-inner focus:ring-red-500 focus:border-red-500 mt-1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                                <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any})} className="w-full p-2 border rounded custom-select mt-1">
                                    <option value="CASH">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Payment Reference (Optional)</label>
                                <input type="text" placeholder="e.g. UPI ID, Cheque No." value={paymentDetails.reference} onChange={e => setPaymentDetails({...paymentDetails, reference: e.target.value })} className="w-full p-2 border rounded mt-1" />
                            </div>
                        </div>
                    ) : (
                        <div className="pt-4 border-t text-center">
                            <p className="text-sm text-gray-600">Payments for this invoice must be managed from the customer's details page.</p>
                        </div>
                    )}
                </div>
            </Card>
            
            {mode === 'add' && items.length === 0 && customerId && customerTotalDue != null && customerTotalDue > 0.01 && (
                <Card title="Record Payment for Dues">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount Paid</label>
                            <input type="number" value={paymentDetails.amount} onChange={e => setPaymentDetails({...paymentDetails, amount: e.target.value })} placeholder={'Enter amount to pay dues'} className="w-full p-2 border-2 border-red-300 rounded-lg shadow-inner focus:ring-red-500 focus:border-red-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                            <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any})} className="w-full p-2 border rounded custom-select">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                    </div>
                </Card>
            )}

            <div className="space-y-2">
                {canCreateSale ? (
                    <Button onClick={handleSubmitSale} variant="secondary" className="w-full">
                        <Share2 className="w-4 h-4 mr-2"/>
                        Create Sale & Share Invoice
                    </Button>
                ) : canUpdateSale ? (
                    <Button onClick={handleSubmitSale} className="w-full">
                        <Save className="w-4 h-4 mr-2"/>
                        Save Changes to Sale
                    </Button>
                ) : canRecordPayment ? (
                     <Button onClick={handleRecordStandalonePayment} className="w-full">
                        <IndianRupee className="w-4 h-4 mr-2" />
                        Record Standalone Payment
                    </Button>
                ) : (
                     <Button className="w-full" disabled>
                        {customerId ? (items.length === 0 ? 'Enter payment or add items' : 'Complete billing details') : 'Select a customer'}
                    </Button>
                )}
                <Button onClick={resetForm} variant="secondary" className="w-full bg-purple-300 hover:bg-purple-400 focus:ring-purple-300">
                    {mode === 'edit' ? 'Cancel Edit' : 'Clear Form'}
                </Button>
            </div>
        </div>
    );
};

export default SalesPage;