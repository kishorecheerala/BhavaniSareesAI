import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, User, Phone, MapPin, Search, Edit, Save, X, Trash2, IndianRupee, ShoppingCart, Download, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Payment, Sale } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';
import DeleteButton from '../components/DeleteButton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface CustomersPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newCustomer, setNewCustomer] = useState({ id: '', name: '', phone: '', address: '', area: '', reference: '' });
    
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const selectedCustomer = useMemo(() => {
        if (!selectedCustomerId) return null;
        return state.customers.find(c => c.id === selectedCustomerId) || null;
    }, [selectedCustomerId, state.customers]);

    const [isEditing, setIsEditing] = useState(false);
    const [editedCustomer, setEditedCustomer] = useState<Customer | null>(null);

    const [paymentModalState, setPaymentModalState] = useState<{ isOpen: boolean, saleId: string | null }>({ isOpen: false, saleId: null });
    const [paymentDetails, setPaymentDetails] = useState({
        amount: '',
        method: 'CASH' as 'CASH' | 'UPI' | 'CHEQUE',
        date: getLocalDateString(),
        reference: '',
    });
    
    const [confirmModalState, setConfirmModalState] = useState<{ isOpen: boolean, saleIdToDelete: string | null }>({ isOpen: false, saleIdToDelete: null });
    const [openSaleId, setOpenSaleId] = useState<string | null>(null);
    const isDirtyRef = useRef(false);

    useEffect(() => {
        if (state.selection && state.selection.page === 'CUSTOMERS') {
            setSelectedCustomerId(state.selection.id);
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, dispatch]);


    useEffect(() => {
        const currentlyDirty = (isAdding && !!(newCustomer.id || newCustomer.name || newCustomer.phone || newCustomer.address || newCustomer.area)) || isEditing;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [isAdding, newCustomer, isEditing, setIsDirty]);

    // On unmount, we must always clean up.
    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);
    
    // Effect to reset the editing form when the selected customer changes
    useEffect(() => {
        if (selectedCustomer) {
            setEditedCustomer(selectedCustomer);
        } else {
            setEditedCustomer(null);
        }
        setIsEditing(false);
        setOpenSaleId(null);
    }, [selectedCustomer]);


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
        setIsAdding(false);
        showToast("Customer added successfully!");
    };
    
    const handleUpdateCustomer = () => {
        if (editedCustomer) {
            if (window.confirm('Are you sure you want to save these changes to the customer details?')) {
                dispatch({ type: 'UPDATE_CUSTOMER', payload: editedCustomer });
                setIsEditing(false);
                showToast("Customer details updated successfully.");
            }
        }
    };

    const handleDeleteSale = (saleId: string) => {
        setConfirmModalState({ isOpen: true, saleIdToDelete: saleId });
    };

    const confirmDeleteSale = () => {
        if (confirmModalState.saleIdToDelete) {
            dispatch({ type: 'DELETE_SALE', payload: confirmModalState.saleIdToDelete });
            showToast('Sale deleted successfully.');
            setConfirmModalState({ isOpen: false, saleIdToDelete: null });
        }
    };
    
    const handleEditSale = (saleId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'SALES', id: saleId, action: 'edit' } });
        dispatch({ type: 'SET_CURRENT_PAGE', payload: 'SALES' });
    };

    const handleAddPayment = () => {
        const sale = state.sales.find(s => s.id === paymentModalState.saleId);
        if (!sale || !paymentDetails.amount) {
            alert("Please enter a valid amount.");
            return;
        }
        
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = sale.totalAmount - amountPaid;
        const newPaymentAmount = parseFloat(paymentDetails.amount);

        if(newPaymentAmount > dueAmount + 0.01) { // Epsilon for float
            alert(`Payment of ₹${newPaymentAmount.toLocaleString('en-IN')} exceeds due amount of ₹${dueAmount.toLocaleString('en-IN')}.`);
            return;
        }

        const payment: Payment = {
            id: `PAY-${Date.now()}`,
            amount: newPaymentAmount,
            method: paymentDetails.method,
            date: new Date(paymentDetails.date).toISOString(),
            reference: paymentDetails.reference.trim() || undefined,
        };

        dispatch({ type: 'ADD_PAYMENT_TO_SALE', payload: { saleId: sale.id, payment } });
        showToast('Payment added successfully!');
        
        setPaymentModalState({ isOpen: false, saleId: null });
        setPaymentDetails({ amount: '', method: 'CASH', date: getLocalDateString(), reference: '' });
    };

    const handleDownloadInvoice = (sale: Sale) => {
        if (!selectedCustomer) return;

        const renderContentOnDoc = (doc: jsPDF) => {
            const customer = selectedCustomer;
            const subTotal = sale.totalAmount + sale.discount;
            const paidAmountOnSale = sale.payments.reduce((sum, p) => sum + p.amount, 0);
            const dueAmountOnSale = sale.totalAmount - paidAmountOnSale;

            doc.addFont('Times-Roman', 'Times', 'normal');
            doc.addFont('Times-Bold', 'Times', 'bold');
            doc.addFont('Times-Italic', 'Times', 'italic');

            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;
            const margin = 5;
            const maxLineWidth = pageWidth - margin * 2;
            let y = 5;

            y = 10;
            doc.setFont('Times', 'italic');
            doc.setFontSize(12);
            doc.setTextColor('#000000');
            doc.text('Om Namo Venkatesaya', centerX, y, { align: 'center' });
            y += 7;
            
            doc.setFont('Times', 'bold');
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

            const totals = [
                { label: 'Subtotal', value: subTotal },
                { label: 'GST', value: sale.gstAmount },
                { label: 'Discount', value: -sale.discount },
                { label: 'Total', value: sale.totalAmount, bold: true },
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

        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [80, finalY + 5] });
        renderContentOnDoc(doc);
        
        doc.save(`${sale.id}.pdf`);
    };

    const handleShareDuesSummary = async () => {
        if (!selectedCustomer) return;

        const overdueSales = state.sales.filter(s => {
            const paid = (s.payments || []).reduce((sum, p) => sum + p.amount, 0);
            return s.customerId === selectedCustomer.id && (s.totalAmount - paid) > 0.01;
        });

        if (overdueSales.length === 0) {
            alert(`${selectedCustomer.name} has no outstanding dues.`);
            return;
        }

        const totalDue = overdueSales.reduce((total, sale) => {
            const paid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
            return total + (sale.totalAmount - paid);
        }, 0);
        
        const doc = new jsPDF();
        const profile = state.profile;
        let currentY = 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor('#6a0dad'); // Primary color
        doc.text('Customer Dues Summary', 105, currentY, { align: 'center' });
        currentY += 8;
        
        if (profile) {
            doc.setFontSize(12);
            doc.setTextColor('#333333');
            doc.text(profile.name, 105, currentY, { align: 'center' });
            currentY += 5;
        }
        
        currentY += 5;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#000000');
        doc.text(`Billed To: ${selectedCustomer.name}`, 14, currentY);
        currentY += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, currentY);
        currentY += 10;

        autoTable(doc, {
            startY: currentY,
            head: [['Invoice ID', 'Date', 'Total', 'Paid', 'Due']],
            body: overdueSales.map(sale => {
                const paid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
                const due = sale.totalAmount - paid;
                return [
                    sale.id,
                    new Date(sale.date).toLocaleDateString(),
                    `Rs. ${sale.totalAmount.toLocaleString('en-IN')}`,
                    `Rs. ${paid.toLocaleString('en-IN')}`,
                    `Rs. ${due.toLocaleString('en-IN')}`
                ];
            }),
            theme: 'grid',
            headStyles: { fillColor: [106, 13, 173] }, // Primary color
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#6a0dad');
        doc.text(
            `Total Outstanding Due: Rs. ${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            196, currentY, { align: 'right' }
        );

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `Dues-Summary-${selectedCustomer.id}.pdf`, { type: 'application/pdf' });

        if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: `Bhavani Sarees - Dues Summary for ${selectedCustomer.name}`,
            files: [pdfFile],
          });
        } else {
          doc.save(`Dues-Summary-${selectedCustomer.id}.pdf`);
        }
    };
    
    const customersWithDues = useMemo(() => {
        // ARCHITECTURAL FIX: Use a highly performant map-based aggregation (O(N+M))
        // This processes all sales in one pass, preventing the UI freeze.
        const salesSummary = new Map<string, { totalPurchase: number, totalPaid: number }>();

        // Step 1: Create a summary of all sales in a single pass (O(M))
        for (const sale of state.sales) {
            const summary = salesSummary.get(sale.customerId) || { totalPurchase: 0, totalPaid: 0 };
            summary.totalPurchase += sale.totalAmount;
            const paymentsTotal = (sale.payments || []).reduce((pSum, p) => pSum + p.amount, 0);
            summary.totalPaid += paymentsTotal;
            salesSummary.set(sale.customerId, summary);
        }

        // Step 2: Map over customers and do an instant lookup (O(N))
        return state.customers.map(customer => {
            const summary = salesSummary.get(customer.id) || { totalPurchase: 0, totalPaid: 0 };
            const totalDue = summary.totalPurchase - summary.totalPaid;
            
            return {
                ...customer,
                totalPurchase: summary.totalPurchase,
                totalDue
            };
        });
    }, [state.customers, state.sales]);


    const filteredCustomers = customersWithDues.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.area.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const PaymentModal = () => {
        const sale = state.sales.find(s => s.id === paymentModalState.saleId);
        if (!paymentModalState.isOpen || !sale) return null;
        
        const amountPaid = sale.payments.reduce((sum, p) => sum + p.amount, 0);
        const dueAmount = sale.totalAmount - amountPaid;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
                <Card title="Add Payment" className="w-full max-w-sm animate-scale-in">
                    <div className="space-y-4">
                        <p>Invoice Total: <span className="font-bold">₹{sale.totalAmount.toLocaleString('en-IN')}</span></p>
                        <p>Amount Due: <span className="font-bold text-red-600">₹{dueAmount.toLocaleString('en-IN')}</span></p>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Amount</label>
                            <input type="number" placeholder="Enter amount" value={paymentDetails.amount} onChange={e => setPaymentDetails({ ...paymentDetails, amount: e.target.value })} autoFocus/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Method</label>
                            <select value={paymentDetails.method} onChange={e => setPaymentDetails({ ...paymentDetails, method: e.target.value as any })} className="custom-select">
                                <option value="CASH">Cash</option>
                                <option value="UPI">UPI</option>
                                <option value="CHEQUE">Cheque</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
                            <input 
                                type="date" 
                                value={paymentDetails.date} 
                                onChange={e => setPaymentDetails({ ...paymentDetails, date: e.target.value })} 
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Payment Reference (Optional)</label>
                            <input 
                                type="text"
                                placeholder="e.g. UPI ID, Cheque No."
                                value={paymentDetails.reference}
                                onChange={e => setPaymentDetails({ ...paymentDetails, reference: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2">
                           <Button onClick={handleAddPayment} className="w-full">Save Payment</Button>
                           <Button onClick={() => setPaymentModalState({isOpen: false, saleId: null})} variant="secondary" className="w-full">Cancel</Button>
                        </div>
                    </div>
                </Card>
            </div>
        )
    };
    
    const salesByCustomer = useMemo(() => {
        const map = new Map<string, Sale[]>();
        for (const sale of state.sales) {
            if (!map.has(sale.customerId)) {
                map.set(sale.customerId, []);
            }
            map.get(sale.customerId)!.push(sale);
        }
        for (const sales of map.values()) {
            sales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        return map;
    }, [state.sales]);

    if (selectedCustomer && editedCustomer) {
        const customerSalesWithDues = useMemo(() => {
            const customerSales = salesByCustomer.get(selectedCustomer.id) || [];
            return customerSales.map(sale => {
                const amountPaid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
                const dueAmount = sale.totalAmount - amountPaid;
                return { ...sale, amountPaid, dueAmount };
            });
        }, [salesByCustomer, selectedCustomer.id]);
        
        const customerReturns = useMemo(() => state.returns.filter(r => r.type === 'CUSTOMER' && r.partyId === selectedCustomer.id), [state.returns, selectedCustomer.id]);
        
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setEditedCustomer({ ...editedCustomer, [e.target.name]: e.target.value });
        };

        return (
            <div className="space-y-4">
                <ConfirmationModal
                    isOpen={confirmModalState.isOpen}
                    onClose={() => setConfirmModalState({ isOpen: false, saleIdToDelete: null })}
                    onConfirm={confirmDeleteSale}
                    title="Confirm Sale Deletion"
                >
                    Are you sure you want to delete this sale? This action cannot be undone and will add the items back to stock.
                </ConfirmationModal>
                {paymentModalState.isOpen && <PaymentModal />}
                <Button onClick={() => setSelectedCustomerId(null)}>&larr; Back to List</Button>
                <Card>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-primary">Customer Details: {selectedCustomer.name}</h2>
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0">
                            {isEditing ? (
                                <>
                                    <Button onClick={handleUpdateCustomer} className="h-9 px-3"><Save size={16} /> Save</Button>
                                    <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                                        <X size={20}/>
                                    </button>
                                </>
                            ) : (
                                <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit</Button>
                            )}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-3">
                            <div><label className="text-sm font-medium">Name</label><input type="text" name="name" value={editedCustomer.name} onChange={handleInputChange} /></div>
                            <div><label className="text-sm font-medium">Phone</label><input type="text" name="phone" value={editedCustomer.phone} onChange={handleInputChange} /></div>
                            <div><label className="text-sm font-medium">Address</label><input type="text" name="address" value={editedCustomer.address} onChange={handleInputChange} /></div>
                            <div><label className="text-sm font-medium">Area</label><input type="text" name="area" value={editedCustomer.area} onChange={handleInputChange} /></div>
                            <div><label className="text-sm font-medium">Reference</label><input type="text" name="reference" value={editedCustomer.reference ?? ''} onChange={handleInputChange} /></div>
                        </div>
                    ) : (
                        <div className="space-y-1 text-gray-700">
                             <p><strong>ID:</strong> {selectedCustomer.id}</p>
                            <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                            <p><strong>Address:</strong> {selectedCustomer.address}</p>
                            <p><strong>Area:</strong> {selectedCustomer.area}</p>
                            {selectedCustomer.reference && <p><strong>Reference:</strong> {selectedCustomer.reference}</p>}
                        </div>
                    )}
                     <div className="mt-4 pt-4 border-t">
                        <Button onClick={handleShareDuesSummary} className="w-full">
                            <Share2 size={16} className="mr-2" />
                            Share Dues Summary
                        </Button>
                    </div>
                </Card>
                <Card title="Sales History">
                    {customerSalesWithDues.length > 0 ? (
                        <div className="space-y-4">
                            {customerSalesWithDues.map(sale => {
                                const { dueAmount } = sale;
                                const isPaid = dueAmount <= 0.01;
                                const isSaleOpen = openSaleId === sale.id;

                                return (
                                <div key={sale.id} className="bg-gray-50 rounded-lg border overflow-hidden">
                                    <button type="button" className="w-full flex justify-between items-start text-left p-3 transition-colors hover:bg-purple-50" onClick={() => setOpenSaleId(isSaleOpen ? null : sale.id)}>
                                        <div className="flex-grow pr-4">
                                            <p className="font-semibold">{new Date(sale.date).toLocaleString()}</p>
                                            <p className="text-xs text-gray-500">Invoice ID: {sale.id}</p>
                                            <p className={`text-sm font-bold ${isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                {isPaid ? 'Paid' : `Due: ₹${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg text-primary">
                                                ₹{sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="flex items-center ml-2 flex-shrink-0">
                                            {isSaleOpen ? <ChevronUp className="text-gray-500"/> : <ChevronDown className="text-gray-500"/>}
                                        </div>
                                    </button>
                                    <div
                                        style={{
                                            display: 'grid',
                                            gridTemplateRows: isSaleOpen ? '1fr' : '0fr',
                                            transition: 'grid-template-rows 0.4s ease-in-out'
                                        }}
                                    >
                                        <div className="overflow-hidden">
                                            <div className="p-3 border-t border-purple-100 bg-white space-y-3">
                                                <div className="flex items-center flex-wrap gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditSale(sale.id); }} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" aria-label="Edit Sale"><Edit size={16} /></button>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadInvoice(sale); }} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" aria-label="Download Invoice"><Download size={16} /></button>
                                                    <DeleteButton variant="delete" onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale.id); }} />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm text-gray-700 mb-1">Items Purchased:</h4>
                                                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                        {sale.items.map((item, index) => (
                                                            <li key={index}>
                                                                {item.productName} (x{item.quantity}) @ ₹{item.price.toLocaleString('en-IN')} each
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                {sale.payments.length > 0 && (
                                                    <div>
                                                        <h4 className="font-semibold text-sm text-gray-700 mb-1">Payments Made:</h4>
                                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                                            {sale.payments.map(payment => (
                                                                <li key={payment.id}>
                                                                    ₹{payment.amount.toLocaleString('en-IN')} {payment.method === 'RETURN_CREDIT' ? <span className="text-blue-600 font-semibold">(Return Credit)</span> : `via ${payment.method}`} on {new Date(payment.date).toLocaleDateString()}
                                                                    {payment.reference && <span className="text-xs text-gray-500 block">Ref: {payment.reference}</span>}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {!isPaid && (
                                                    <div className="pt-2">
                                                        <Button onClick={() => setPaymentModalState({ isOpen: true, saleId: sale.id })} className="w-full sm:w-auto">
                                                            <Plus size={16} className="mr-2"/> Add Payment
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <p className="text-gray-500">No sales recorded for this customer.</p>
                    )}
                </Card>
                 <Card title="Returns History">
                    {customerReturns.length > 0 ? (
                         <div className="space-y-3">
                            {customerReturns.slice().reverse().map(ret => (
                                <div key={ret.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">Return on {new Date(ret.returnDate).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500">Original Invoice: {ret.referenceId}</p>
                                        </div>
                                        <p className="font-semibold text-primary">Refunded: ₹{ret.amount.toLocaleString('en-IN')}</p>
                                    </div>
                                    <div className="mt-2 pt-2 border-t">
                                        <ul className="text-sm list-disc list-inside text-gray-600">
                                            {ret.items.map((item, idx) => (
                                                <li key={idx}>{item.productName} (x{item.quantity})</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No returns recorded for this customer.</p>
                    )}
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-primary">Customers</h1>
                <Button onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {isAdding ? 'Cancel' : 'Add Customer'}
                </Button>
            </div>

            {isAdding && (
                <Card title="New Customer Form" className="animate-fade-in-fast">
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
                                    className="rounded-l-none"
                                />
                            </div>
                        </div>
                        <input type="text" placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} />
                        <input type="text" placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} />
                        <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} />
                        <input type="text" placeholder="Area/Location" value={newCustomer.area} onChange={e => setNewCustomer({ ...newCustomer, area: e.target.value })} />
                        <input type="text" placeholder="Reference (Optional)" value={newCustomer.reference} onChange={e => setNewCustomer({ ...newCustomer, reference: e.target.value })} />
                        <Button onClick={handleAddCustomer} className="w-full">Save Customer</Button>
                    </div>
                </Card>
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search customers by name, phone, or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>

            <div className="space-y-3">
                {filteredCustomers.map((customer, index) => {
                    return (
                        <Card 
                            key={customer.id} 
                            className="cursor-pointer transition-shadow animate-slide-up-fade" 
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => setSelectedCustomerId(customer.id)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-primary flex items-center gap-2"><User size={16}/> {customer.name}</p>
                                    <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14}/> {customer.phone}</p>
                                    <p className="text-sm text-gray-500 flex items-center gap-2"><MapPin size={14}/> {customer.area}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <div className="flex items-center justify-end gap-1 text-green-600">
                                        <ShoppingCart size={14} />
                                        <span className="font-semibold">₹{customer.totalPurchase.toLocaleString('en-IN')}</span>
                                    </div>
                                     <div className={`flex items-center justify-end gap-1 ${customer.totalDue > 0.01 ? 'text-red-600' : 'text-gray-600'}`}>
                                        <IndianRupee size={14} />
                                        <span className="font-semibold">₹{customer.totalDue.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default CustomersPage;