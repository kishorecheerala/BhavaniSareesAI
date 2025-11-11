import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, UserPlus, QrCode, Search, IndianRupee, X } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Product, SaleItem, Payment, Sale } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { Html5Qrcode } from 'html5-qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import DeleteButton from '../components/DeleteButton';


// --- Divine Symbols (Detailed and Respectful SVG) ---
const tirunamamSvg = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M42 20 C42 40, 30 55, 25 70 C20 85, 20 95, 20 95" stroke="#6a0dad" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M58 20 C58 40, 70 55, 75 70 C80 85, 80 95, 80 95" stroke="#6a0dad" stroke-width="5" fill="none" stroke-linecap="round"/>
  <path d="M50 20 V 70" stroke="red" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M48 70 H 52" stroke="red" stroke-width="4" fill="none" stroke-linecap="round"/>
  <path d="M40 95 A 10 10 0 0 1 60 95" stroke="#6a0dad" stroke-width="4" fill="none"/>
</svg>`;

const sankuSvg = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M50,95 C70,95 85,80 85,60 C85,40 70,25 50,25 C30,25 15,40 15,60 C15,80 30,95 50,95 Z" fill="#f3e5f5" stroke="#6a0dad" stroke-width="4"/>
  <path d="M50,25 C40,25 30,20 30,10 C30,0 40,5 50,5 C60,5 70,0 70,10 C70,20 60,25 50,25" fill="#f3e5f5" stroke="#6a0dad" stroke-width="4"/>
  <path d="M30,60 C30,50 40,45 50,45 C60,45 70,50 70,60" fill="none" stroke="#6a0dad" stroke-width="3"/>
  <path d="M35,75 C35,68 42,65 50,65 C58,65 65,68 65,75" fill="none" stroke="#6a0dad" stroke-width="3"/>
</svg>`;

const chakraSvg = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <circle cx="50" cy="50" r="35" fill="#f3e5f5" stroke="#6a0dad" stroke-width="4"/>
  <circle cx="50" cy="50" r="10" fill="#6a0dad"/>
  <g transform="translate(50,50)">
    <line x1="0" y1="-35" x2="0" y2="35" stroke="#6a0dad" stroke-width="3"/>
    <line x1="-35" y1="0" x2="35" y2="0" stroke="#6a0dad" stroke-width="3"/>
    <line x1="-24.7" y1="-24.7" x2="24.7" y2="24.7" stroke="#6a0dad" stroke-width="3"/>
    <line x1="-24.7" y1="24.7" x2="24.7" y2="-24.7" stroke="#6a0dad" stroke-width="3"/>
  </g>
  <g transform="translate(50,50)">
    <path d="M0 -35 L -5 -45 L 5 -45 Z" fill="#6a0dad"/>
    <path d="M0 35 L -5 45 L 5 45 Z" fill="#6a0dad" transform="rotate(180)"/>
    <path d="M0 -35 L -5 -45 L 5 -45 Z" fill="#6a0dad" transform="rotate(90)"/>
    <path d="M0 35 L -5 45 L 5 45 Z" fill="#6a0dad" transform="rotate(270)"/>
  </g>
</svg>`;

// Helper to convert SVG string to PNG data URL
const svgToPng = (svgString: string, width: number, height: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        
        const image = new Image();
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(image, 0, 0, width, height);
                const pngDataUrl = canvas.toDataURL('image/png');
                URL.revokeObjectURL(url);
                resolve(pngDataUrl);
            } else {
                URL.revokeObjectURL(url);
                reject(new Error('Could not get canvas context'));
            }
        };
        image.onerror = (e) => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load SVG image for PDF conversion.'));
        };
        image.src = url;
    });
};


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
    
    // Form state
    const [customerId, setCustomerId] = useState('');
    const [cart, setCart] = useState<SaleItem[]>([]);
    const [discount, setDiscount] = useState('');
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CHEQUE'>('CASH');
    const [paymentDate, setPaymentDate] = useState(getLocalDateString());
    const [paymentReference, setPaymentReference] = useState('');

    // UI/Modal state
    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ id: '', name: '', phone: '', address: '', area: '' });

    // State for pre-rendered PDF images
    const [logoImages, setLogoImages] = useState({ tirunamam: '', sanku: '', chakra: '' });

    // Pre-render images on component mount for synchronous PDF generation later
    useEffect(() => {
        const convertImages = async () => {
            try {
                const [tirunamam, sanku, chakra] = await Promise.all([
                    svgToPng(tirunamamSvg, 100, 100),
                    svgToPng(sankuSvg, 100, 100),
                    svgToPng(chakraSvg, 100, 100)
                ]);
                setLogoImages({ tirunamam, sanku, chakra });
            } catch (error) {
                console.error("Failed to pre-convert logo images for PDF:", error);
            }
        };
        convertImages();
    }, []);

    useEffect(() => {
        const formIsDirty = !!customerId || cart.length > 0 || !!discount || !!amountPaid;
        setIsDirty(formIsDirty);

        return () => setIsDirty(false);
    }, [customerId, cart, discount, amountPaid, setIsDirty]);

    const resetForm = () => {
        setCustomerId('');
        setCart([]);
        setDiscount('');
        setAmountPaid('');
        setPaymentMethod('CASH');
        setPaymentDate(getLocalDateString());
        setPaymentReference('');
    };

    const handleCustomerChange = (id: string) => {
        if (cart.length > 0) {
            if (window.confirm("Changing the customer will clear the current cart. Are you sure?")) {
                setCart([]);
                setDiscount('');
            } else {
                return;
            }
        }
        setCustomerId(id);
    };

    const handleSelectProduct = (product: Product) => {
        const itemInCart = cart.find(item => item.productId === product.id);
        const availableStock = product.quantity - (itemInCart?.quantity || 0);

        if (availableStock <= 0) {
            alert(`${product.name} is out of stock or all available units are in the cart.`);
            return;
        }

        if (itemInCart) {
            const updatedCart = cart.map(item =>
                item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
            );
            setCart(updatedCart);
        } else {
            const newItem: SaleItem = {
                productId: product.id,
                productName: product.name,
                quantity: 1,
                price: product.salePrice,
            };
            setCart([...cart, newItem]);
        }
        setIsSelectingProduct(false);
        setProductSearchTerm('');
    };

    const handleQuantityChange = (productId: string, newQuantityStr: string) => {
        const newQuantity = parseInt(newQuantityStr, 10);
        const product = state.products.find(p => p.id === productId);
        if (!product) return;

        if (isNaN(newQuantity) || newQuantity <= 0) {
             setCart(cart.filter(item => item.productId !== productId));
             return;
        }

        if (newQuantity > product.quantity) {
            alert(`Cannot add more than available stock (${product.quantity}).`);
            setCart(cart.map(item => item.productId === productId ? { ...item, quantity: product.quantity } : item));
        } else {
            setCart(cart.map(item => item.productId === productId ? { ...item, quantity: newQuantity } : item));
        }
    };
    
    const handleRemoveItem = (productId: string) => {
        setCart(cart.filter(item => item.productId !== productId));
    }

    const handleProductScanned = (decodedText: string) => {
        const product = state.products.find(p => p.id.toLowerCase() === decodedText.toLowerCase());
        if (product) {
            handleSelectProduct(product);
        } else {
            alert("Product not found.");
        }
        setIsScanning(false);
    };

    const handleAddCustomer = () => {
        const trimmedId = newCustomer.id.trim();
        if (!trimmedId) return alert('Customer ID is required.');
        if (!newCustomer.name || !newCustomer.phone) return alert('Name and Phone are required.');

        const finalId = `CUST-${trimmedId}`;
        if (state.customers.some(c => c.id.toLowerCase() === finalId.toLowerCase())) {
            return alert(`Customer ID "${finalId}" is already taken.`);
        }
        
        const customerToAdd: Customer = { ...newCustomer, id: finalId, reference: '' };
        dispatch({ type: 'ADD_CUSTOMER', payload: customerToAdd });
        showToast("Customer added successfully!");
        setCustomerId(finalId);
        setIsAddingCustomer(false);
        setNewCustomer({ id: '', name: '', phone: '', address: '', area: '' });
    };

    const subTotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);
    const totalGst = useMemo(() => {
        return cart.reduce((sum, item) => {
            const product = state.products.find(p => p.id === item.productId);
            if (!product) return sum;
            const itemTotal = item.price * item.quantity;
            const gstAmount = itemTotal * (product.gstPercent / (100 + product.gstPercent)); // Assuming sale price is inclusive of GST
            return sum + gstAmount;
        }, 0);
    }, [cart, state.products]);

    const totalAmount = subTotal - (parseFloat(discount) || 0);

    const generateInvoicePDF = (sale: Sale, customer: Customer, isShare = false) => {
        // This function is now synchronous and uses pre-loaded images
        const doc = new jsPDF({
            unit: 'mm',
            format: [80, 297] // Thermal printer size
        });
        const date = new Date(sale.date).toLocaleString();
        
        if (logoImages.tirunamam) {
            doc.addImage(logoImages.tirunamam, 'PNG', 32.5, 5, 15, 15);
        }

        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.text('OM namo venkatesaya', 40, 26, { align: 'center' });
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text('Bhavani Sarees', 40, 34, { align: 'center' });
        
        if (logoImages.sanku) doc.addImage(logoImages.sanku, 'PNG', 12, 29, 8, 8);
        if (logoImages.chakra) doc.addImage(logoImages.chakra, 'PNG', 60, 29, 8, 8);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.text(`Invoice: ${sale.id}`, 5, 45);
        doc.text(`Date: ${date}`, 5, 50);

        doc.text(`Billed To:`, 5, 57);
        doc.setFont('helvetica', 'bold');
        doc.text(customer.name, 5, 62);
        doc.setFont('helvetica', 'normal');
        if (customer.address) doc.text(customer.address, 5, 67);


        autoTable(doc, {
            startY: 75,
            head: [['Item', 'Qty', 'Price', 'Total']],
            body: sale.items.map(item => [
                item.productName,
                item.quantity,
                item.price.toFixed(2),
                (item.price * item.quantity).toFixed(2),
            ]),
            theme: 'plain',
            styles: { fontSize: 8, cellPadding: 1 },
            headStyles: { fontStyle: 'bold' },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' } }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 5;
        const rightAlignX = 75;

        doc.setFontSize(9);
        doc.text(`Subtotal:`, rightAlignX - 25, finalY);
        doc.text(`Rs. ${subTotal.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });

        if (sale.discount > 0) {
            finalY += 5;
            doc.text(`Discount:`, rightAlignX - 25, finalY);
            doc.text(`Rs. -${sale.discount.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        }
        
        finalY += 5;
        doc.text(`GST Included:`, rightAlignX - 25, finalY);
        doc.text(`Rs. ${sale.gstAmount.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        
        finalY += 2;
        doc.line(5, finalY, 75, finalY); // separator
        finalY += 5;

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total:`, rightAlignX - 25, finalY);
        doc.text(`Rs. ${sale.totalAmount.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);

        const amountPaidInSale = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        if (amountPaidInSale > 0) {
            finalY += 5;
            doc.text(`Paid:`, rightAlignX - 25, finalY);
            doc.text(`Rs. ${amountPaidInSale.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        }
        
        const dueInSale = sale.totalAmount - amountPaidInSale;
        if(dueInSale > 0.01) {
            finalY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text(`Due:`, rightAlignX - 25, finalY);
            doc.text(`Rs. ${dueInSale.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        }


        if (isShare && navigator.share) {
            const blob = doc.output('blob');
            const file = new File([blob], `invoice-${sale.id}.pdf`, { type: 'application/pdf' });
            navigator.share({
                title: `Invoice ${sale.id}`,
                text: `Invoice from Bhavani Sarees for ${customer.name}`,
                files: [file],
            }).catch((error) => {
                if (error.name !== 'AbortError') {
                    console.error('Error sharing:', error);
                    alert("Sharing failed, downloading PDF instead.");
                    doc.save(`invoice-${sale.id}.pdf`);
                }
            });
        } else {
            doc.save(`invoice-${sale.id}.pdf`);
        }
    };

    const handleCreateSale = () => {
        if (!customerId || cart.length === 0) {
            return alert("Please select a customer and add items to the cart.");
        }
        
        const customer = state.customers.find(c => c.id === customerId);
        if (!customer) return alert("Selected customer not found.");

        const paid = parseFloat(amountPaid) || 0;
        if (paid > totalAmount + 0.01) {
            return alert("Paid amount cannot exceed the total amount.");
        }
        
        const now = new Date();
        const saleId = `SALE-${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}-${Date.now().toString().slice(-6)}`;

        const payment: Payment | null = paid > 0 ? {
            id: `PAY-S-${Date.now()}`,
            amount: paid,
            method: paymentMethod,
            date: new Date(paymentDate).toISOString(),
            reference: paymentReference || undefined,
        } : null;

        const newSale: Sale = {
            id: saleId,
            customerId,
            items: cart,
            discount: parseFloat(discount) || 0,
            gstAmount: totalGst,
            totalAmount: totalAmount,
            date: now.toISOString(),
            payments: payment ? [payment] : [],
        };

        dispatch({ type: 'ADD_SALE', payload: newSale });

        cart.forEach(item => {
            dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -item.quantity } });
        });
        
        showToast("Sale created successfully!");
        if (logoImages.tirunamam) {
            generateInvoicePDF(newSale, customer, true);
        } else {
            alert("Generating PDF... Logos are still loading. Please try again in a moment.");
        }
        resetForm();
    };

    const handleStandalonePayment = () => {
        if (!customerId) return alert("Please select a customer to record a payment for.");
        if (cart.length > 0) return alert("Cannot record a standalone payment when items are in the cart. Please clear the cart first.");
        
        const paid = parseFloat(amountPaid);
        if (isNaN(paid) || paid <= 0) return alert("Please enter a valid payment amount.");

        const customerSales = state.sales.filter(s => s.customerId === customerId).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        let remainingPayment = paid;

        for (const sale of customerSales) {
            if (remainingPayment <= 0) break;

            const paidOnSale = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const dueOnSale = sale.totalAmount - paidOnSale;

            if (dueOnSale > 0.01) {
                const paymentForThisSale = Math.min(remainingPayment, dueOnSale);
                const payment: Payment = {
                    id: `PAY-DUE-${Date.now()}`,
                    amount: paymentForThisSale,
                    method: paymentMethod,
                    date: new Date(paymentDate).toISOString(),
                    reference: paymentReference || 'Due Payment',
                };
                dispatch({ type: 'ADD_PAYMENT_TO_SALE', payload: { saleId: sale.id, payment } });
                remainingPayment -= paymentForThisSale;
            }
        }
        
        if (remainingPayment > 0.01) {
            showToast(`Recorded ₹${(paid - remainingPayment).toFixed(2)} towards dues. ₹${remainingPayment.toFixed(2)} could not be allocated as there are no more outstanding dues.`);
        } else {
            showToast(`Successfully recorded payment of ₹${paid.toFixed(2)}.`);
        }
        
        resetForm();
    };

    const selectedCustomerDues = useMemo(() => {
        if (!customerId) return 0;
        const customerSales = state.sales.filter(s => s.customerId === customerId);
        const totalPurchased = customerSales.reduce((sum, s) => sum + s.totalAmount, 0);
        const totalPaid = customerSales.reduce((sum, s) => sum + (s.payments || []).reduce((pSum, p) => pSum + p.amount, 0), 0);
        return totalPurchased - totalPaid;
    }, [customerId, state.sales]);

    const QRScannerModal: React.FC = () => {
        const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

        useEffect(() => {
            if (!isScanning) return;
            
            html5QrCodeRef.current = new Html5Qrcode("qr-reader-sales");
            
            const qrCodeSuccessCallback = (decodedText: string) => {
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().then(() => {
                        handleProductScanned(decodedText);
                    }).catch(err => console.error("Error stopping scanner", err));
                }
            };
            const config = { fps: 10, qrbox: { width: 250, height: 250 } };
            html5QrCodeRef.current.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, undefined)
                .catch(() => alert("Camera permission is required. Please allow and try again."));
            
            return () => {
                if (html5QrCodeRef.current?.isScanning) {
                    html5QrCodeRef.current.stop().catch(err => console.log("Failed to stop scanner on cleanup.", err));
                }
            };
        }, [isScanning]);

        return (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                <Card title="Scan Product" className="w-full max-w-md relative animate-scale-in">
                    <button onClick={() => setIsScanning(false)} className="absolute top-4 right-4 p-2"><X size={20}/></button>
                    <div id="qr-reader-sales" className="w-full mt-4"></div>
                </Card>
            </div>
        );
    };

    const ProductSearchModal = () => (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
        <Card className="w-full max-w-lg animate-scale-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Select Product</h2>
            <button onClick={() => setIsSelectingProduct(false)}><X size={20}/></button>
          </div>
          <input type="text" placeholder="Search products..." value={productSearchTerm} onChange={e => setProductSearchTerm(e.target.value)} className="w-full p-2 border rounded-lg mb-4" autoFocus/>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {state.products
              .filter(p => p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) && p.quantity > 0)
              .map(p => (
                <div key={p.id} onClick={() => handleSelectProduct(p)} className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-purple-100">
                  <p className="font-semibold">{p.name}</p>
                  <p className="text-sm text-gray-500">Code: {p.id} | Stock: {p.quantity}</p>
                </div>
              ))}
          </div>
        </Card>
      </div>
    );
    
    const NewCustomerModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Add New Customer" className="w-full max-w-md animate-scale-in">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium">Customer ID</label>
                        <div className="flex items-center mt-1">
                            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-gray-50 text-gray-500 text-sm">CUST-</span>
                            <input type="text" placeholder="Enter unique ID" value={newCustomer.id} onChange={e => setNewCustomer({ ...newCustomer, id: e.target.value })} className="w-full p-2 border rounded-r-md" autoFocus />
                        </div>
                    </div>
                    <input type="text" placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="text" placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full p-2 border rounded" />
                    <input type="text" placeholder="Area/Location" value={newCustomer.area} onChange={e => setNewCustomer({ ...newCustomer, area: e.target.value })} className="w-full p-2 border rounded" />
                    <div className="flex gap-2">
                        <Button onClick={handleAddCustomer} className="w-full">Save Customer</Button>
                        <Button onClick={() => setIsAddingCustomer(false)} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            </Card>
        </div>
    );

    return (
        <div className="space-y-4">
            {isAddingCustomer && <NewCustomerModal />}
            {isScanning && <QRScannerModal />}
            {isSelectingProduct && <ProductSearchModal />}
            
            <h1 className="text-2xl font-bold text-primary">New Sale / Payment</h1>
            
            <Card title="Customer">
                <div className="flex flex-col sm:flex-row gap-4 items-end">
                    <div className="w-full">
                        <label className="block text-sm font-medium text-gray-700">Select a Customer</label>
                        <select value={customerId} onChange={e => handleCustomerChange(e.target.value)} className="w-full p-2 border rounded-lg custom-select">
                            <option value="">-- Select a Customer --</option>
                            {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.area}</option>)}
                        </select>
                    </div>
                    <Button onClick={() => setIsAddingCustomer(true)} variant="secondary" className="w-full sm:w-auto flex-shrink-0">
                        <UserPlus className="w-4 h-4 mr-2" /> New Customer
                    </Button>
                </div>
                 {customerId && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg text-sm">
                        <p className="font-semibold text-red-600">Total Outstanding Dues: ₹{selectedCustomerDues.toLocaleString('en-IN')}</p>
                    </div>
                )}
            </Card>

            <Card title="Sale Items">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                     <Button onClick={() => setIsSelectingProduct(true)} className="w-full"><Search className="w-4 h-4 mr-2"/> Select Product from Stock</Button>
                     <Button onClick={() => setIsScanning(true)} variant="secondary" className="w-full"><QrCode className="w-4 h-4 mr-2"/> Scan Product QR</Button>
                </div>
                {cart.length > 0 && (
                    <div className="space-y-2">
                        {cart.map(item => (
                            <div key={item.productId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <div>
                                    <p className="font-semibold">{item.productName}</p>
                                    <p className="text-sm text-gray-600">@ ₹{item.price.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="number" value={item.quantity} onChange={e => handleQuantityChange(item.productId, e.target.value)} className="w-16 p-1 text-center border rounded"/>
                                    <span>x</span>
                                    <span className="font-semibold w-20 text-right">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                                    <DeleteButton variant="remove" onClick={() => handleRemoveItem(item.productId)} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card title="Billing & Payment">
                <div className="space-y-3">
                    <div className="flex justify-between items-center text-lg">
                        <span>Subtotal:</span>
                        <span className="font-semibold">₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                     <div className="flex justify-between items-center">
                        <span>Discount:</span>
                        <input type="number" placeholder="0" value={discount} onChange={e => setDiscount(e.target.value)} className="w-24 p-1 text-right border rounded"/>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                        <span>GST Included:</span>
                        <span>₹{totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <hr/>
                    <div className="flex justify-between items-center text-2xl font-bold text-primary">
                        <span>Total:</span>
                        <span>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                            <label className="block text-sm font-medium">Amount Paid</label>
                            <input type="number" placeholder={`Total is ₹${totalAmount.toLocaleString('en-IN')}`} value={amountPaid} onChange={e => setAmountPaid(e.target.value)} className="w-full p-2 border-2 border-green-300 rounded-lg shadow-inner focus:ring-green-500 focus:border-green-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Payment Method</label>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value as any)} className="w-full p-2 border rounded custom-select">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Payment Date</label>
                            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Payment Reference (Optional)</label>
                            <input type="text" placeholder="e.g. Transaction ID, Cheque No." value={paymentReference} onChange={e => setPaymentReference(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                    </div>
                </div>
            </Card>

            <div className="space-y-2">
                <Button onClick={handleCreateSale} className="w-full" disabled={cart.length === 0}>
                   <ShoppingCart className="w-4 h-4 mr-2"/> Create Sale & Share Invoice
                </Button>
                <Button onClick={handleStandalonePayment} variant="secondary" className="w-full" disabled={cart.length > 0 || !customerId}>
                   <IndianRupee className="w-4 h-4 mr-2"/> Record Standalone Payment for Dues
                </Button>
                <Button onClick={resetForm} variant="danger" className="w-full bg-gray-600 hover:bg-gray-700 focus:ring-gray-500">
                    Clear Form
                </Button>
            </div>
        </div>
    );
};

export default SalesPage;
