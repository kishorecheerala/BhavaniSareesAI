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

    // UI/Modal state
    const [isSelectingProduct, setIsSelectingProduct] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [isAddingCustomer, setIsAddingCustomer] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ id: '', name: '', phone: '', address: '', area: '' });

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

    const generateInvoicePDF = async (sale: Sale, customer: Customer, isShare = false) => {
        const doc = new jsPDF();
        const date = new Date(sale.date).toLocaleString();

        doc.setFontSize(18);
        doc.text('Tax Invoice', 105, 15, { align: 'center' });
        doc.setFontSize(14);
        doc.text('Bhavani Sarees', 105, 22, { align: 'center' });

        doc.setFontSize(10);
        doc.text(`Invoice ID: ${sale.id}`, 14, 35);
        doc.text(`Date: ${date}`, 14, 40);

        doc.text(`Customer: ${customer.name}`, 14, 50);
        doc.text(`Phone: ${customer.phone}`, 14, 55);
        if (customer.address) doc.text(`Address: ${customer.address}, ${customer.area}`, 14, 60);

        autoTable(doc, {
            startY: 70,
            head: [['#', 'Item', 'Qty', 'Price', 'Amount']],
            body: sale.items.map((item, index) => [
                index + 1,
                item.productName,
                item.quantity,
                item.price.toFixed(2),
                (item.price * item.quantity).toFixed(2),
            ]),
            theme: 'striped',
            headStyles: { fillColor: [106, 13, 173] },
            columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } }
        });

        let finalY = (doc as any).lastAutoTable.finalY + 10;
        const rightAlignX = 196;

        doc.setFontSize(10);
        doc.text(`Subtotal:`, rightAlignX - 30, finalY);
        doc.text(`${subTotal.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });

        if (sale.discount > 0) {
            finalY += 5;
            doc.text(`Discount:`, rightAlignX - 30, finalY);
            doc.text(`-${sale.discount.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        }

        finalY += 5;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`Total Amount:`, rightAlignX - 30, finalY);
        doc.text(`₹ ${sale.totalAmount.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);

        const amountPaidInSale = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        if (amountPaidInSale > 0) {
            finalY += 5;
            doc.text(`Amount Paid:`, rightAlignX - 30, finalY);
            doc.text(`${amountPaidInSale.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        }
        
        const dueInSale = sale.totalAmount - amountPaidInSale;
        if(dueInSale > 0.01) {
            finalY += 5;
            doc.setFont('helvetica', 'bold');
            doc.text(`Balance Due:`, rightAlignX - 30, finalY);
            doc.text(`${dueInSale.toFixed(2)}`, rightAlignX, finalY, { align: 'right' });
        }


        if (isShare && navigator.share) {
            const blob = doc.output('blob');
            const file = new File([blob], `invoice-${sale.id}.pdf`, { type: 'application/pdf' });
            try {
                await navigator.share({
                    title: `Invoice ${sale.id}`,
                    text: `Invoice from Bhavani Sarees for ${customer.name}`,
                    files: [file],
                });
            } catch (error) {
                console.error('Error sharing:', error);
                alert("Could not share the file. It will be downloaded instead.");
                doc.save(`invoice-${sale.id}.pdf`);
            }
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
            reference: 'Sale Payment'
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
        generateInvoicePDF(newSale, customer, true);
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
                    reference: 'Due Payment'
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
        }, []);

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
              <div className="space-y-3">
                  <div className="flex items-center">
                    <span className="px-3 py-2 bg-gray-100 border rounded-l-md">CUST-</span>
                    <input type="text" placeholder="Unique ID" value={newCustomer.id} onChange={e => setNewCustomer({...newCustomer, id: e.target.value})} className="w-full p-2 border rounded-r-md" autoFocus />
                  </div>
                  <input type="text" placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="w-full p-2 border rounded" />
                  <input type="text" placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full p-2 border rounded" />
                  <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} className="w-full p-2 border rounded" />
                  <input type="text" placeholder="Area" value={newCustomer.area} onChange={e => setNewCustomer({...newCustomer, area: e.target.value})} className="w-full p-2 border rounded" />
                  <div className="flex gap-2">
                      <Button onClick={handleAddCustomer} className="w-full">Add Customer</Button>
                      <Button onClick={() => setIsAddingCustomer(false)} variant="secondary" className="w-full">Cancel</Button>
                  </div>
              </div>
          </Card>
        </div>
    );


    return (
        <div className="space-y-4">
             {isScanning && <QRScannerModal />}
             {isSelectingProduct && <ProductSearchModal />}
             {isAddingCustomer && <NewCustomerModal />}

             <h1 className="text-2xl font-bold text-primary">New Sale</h1>
             <Card>
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-grow">
                        <label className="block text-sm font-medium text-gray-700">Customer</label>
                        <select value={customerId} onChange={e => handleCustomerChange(e.target.value)} className="w-full p-2 border rounded custom-select">
                            <option value="">Select a Customer</option>
                            {state.customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.area}</option>)}
                        </select>
                    </div>
                    <div className="flex-shrink-0 self-end">
                        <Button onClick={() => setIsAddingCustomer(true)} variant="secondary"><UserPlus size={16} className="mr-2"/> New</Button>
                    </div>
                </div>
                {customerId && (
                    <div className="mt-2 text-sm text-red-600 font-semibold">
                        Current Dues: ₹{selectedCustomerDues.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                )}
             </Card>
             <Card title="Items in Cart">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                    <Button onClick={() => setIsSelectingProduct(true)}><Search size={16} className="mr-2"/> Select Product</Button>
                    <Button onClick={() => setIsScanning(true)} variant="secondary"><QrCode size={16} className="mr-2"/> Scan Product</Button>
                </div>
                <div className="space-y-2">
                    {cart.map(item => (
                        <div key={item.productId} className="flex items-center p-2 bg-gray-50 rounded">
                            <div className="flex-grow">
                                <p className="font-semibold">{item.productName}</p>
                                <p className="text-sm text-gray-500">@ ₹{item.price.toLocaleString('en-IN')}</p>
                            </div>
                            <input 
                                type="number" 
                                value={item.quantity} 
                                onChange={e => handleQuantityChange(item.productId, e.target.value)}
                                className="w-16 p-1 border rounded text-center mx-2"
                            />
                            <p className="w-24 text-right font-medium">₹{(item.price * item.quantity).toLocaleString('en-IN')}</p>
                            <DeleteButton variant="remove" onClick={() => handleRemoveItem(item.productId)} />
                        </div>
                    ))}
                    {cart.length === 0 && <p className="text-center text-gray-500">Cart is empty.</p>}
                </div>
             </Card>
             <Card title="Billing Summary">
                 <div className="space-y-2 text-right">
                     <p>Subtotal: <span className="font-semibold">₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                     <div className="flex justify-end items-center gap-2">
                        <label className="text-sm font-medium">Discount:</label>
                        <input type="number" placeholder="0.00" value={discount} onChange={e => setDiscount(e.target.value)} className="w-32 p-1 border rounded text-right" />
                     </div>
                     <p className="text-2xl font-bold text-primary">Total: <span >₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></p>
                 </div>
             </Card>
             <Card title="Payment Details">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Amount Paid Now</label>
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
                         <label className="block text-sm font-medium">Date</label>
                         <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full p-2 border rounded" />
                    </div>
                </div>
             </Card>
             <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={handleCreateSale} className="w-full" disabled={cart.length === 0 || !customerId}>Create Sale & Share Invoice</Button>
                <Button onClick={handleStandalonePayment} variant="secondary" className="w-full" disabled={cart.length > 0 || !customerId || !amountPaid}>Record Standalone Payment</Button>
             </div>
             <Button onClick={resetForm} variant="danger" className="w-full">Clear Form</Button>
        </div>
    );
};

export default SalesPage;
