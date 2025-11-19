
import React, { useState, useEffect, useRef } from 'react';
import { Plus, User, Phone, MapPin, Search, Edit, Save, X, Trash2, IndianRupee, ShoppingCart, Download, Share2, ChevronDown } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Payment, Sale, Page } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import ConfirmationModal from '../components/ConfirmationModal';
import DeleteButton from '../components/DeleteButton';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useOnClickOutside } from '../hooks/useOnClickOutside';
import { logoBase64 } from '../utils/logo';
import PaymentModal from '../components/PaymentModal';
import AddCustomerModal from '../components/AddCustomerModal';

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

interface CustomersPageProps {
  setIsDirty: (isDirty: boolean) => void;
  setCurrentPage: (page: Page) => void;
}

const CustomersPage: React.FC<CustomersPageProps> = ({ setIsDirty, setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    
    // Replaced local isAdding form state with modal state
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [activeSaleId, setActiveSaleId] = useState<string | null>(null);
    const [actionMenuSaleId, setActionMenuSaleId] = useState<string | null>(null);

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
    const isDirtyRef = useRef(false);
    const actionMenuRef = useRef<HTMLDivElement>(null);

    useOnClickOutside(actionMenuRef, () => setActionMenuSaleId(null));

    useEffect(() => {
        if (state.selection && state.selection.page === 'CUSTOMERS') {
            if (state.selection.id === 'new') {
                setIsAddCustomerModalOpen(true);
                setSelectedCustomer(null); // Ensure we are not in detail view
            } else {
                const customerToSelect = state.customers.find(c => c.id === state.selection.id);
                if (customerToSelect) {
                    setSelectedCustomer(customerToSelect);
                }
            }
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, state.customers, dispatch]);

    useEffect(() => {
        const currentlyDirty = isEditing;
        if (currentlyDirty !== isDirtyRef.current) {
            isDirtyRef.current = currentlyDirty;
            setIsDirty(currentlyDirty);
        }
    }, [isEditing, setIsDirty]);

    // On unmount, we must always clean up.
    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);

    // Effect to keep selectedCustomer data in sync with global state
    useEffect(() => {
        if (selectedCustomer) {
            const currentCustomerData = state.customers.find(c => c.id === selectedCustomer.id);
            // Deep comparison to avoid re-render if data is the same
            if (JSON.stringify(currentCustomerData) !== JSON.stringify(selectedCustomer)) {
                setSelectedCustomer(currentCustomerData || null);
            }
        }
    }, [selectedCustomer?.id, state.customers]);

    // Effect to reset the editing form when the selected customer changes
    useEffect(() => {
        if (selectedCustomer) {
            setEditedCustomer(selectedCustomer);
            setActiveSaleId(null); // Close any open accordion when customer changes
        }
        setIsEditing(false);
    }, [selectedCustomer]);


    const handleAddCustomer = (customer: Customer) => {
        dispatch({ type: 'ADD_CUSTOMER', payload: customer });
        showToast("Customer added successfully!");
    };
    
    const handleUpdateCustomer = () => {
        if (editedCustomer) {
            if (window.confirm('Are you sure you want to save these changes to the customer details?')) {
                dispatch({ type: 'UPDATE_CUSTOMER', payload: editedCustomer });
                setSelectedCustomer(editedCustomer);
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
        setCurrentPage('SALES');
    };

    const handleEditReturn = (returnId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'RETURNS', id: returnId, action: 'edit' } });
        setCurrentPage('RETURNS');
    };

    const handleAddPayment = () => {
        const sale = state.sales.find(s => s.id === paymentModalState.saleId);
        if (!sale || !paymentDetails.amount) {
            alert("Please enter a valid amount.");
            return;
        }
        
        const amountPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const dueAmount = Number(sale.totalAmount) - amountPaid;
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

    const handleDownloadThermalReceipt = async (sale: Sale) => {
        if (!selectedCustomer) return;

        let qrCodeBase64: string | null = null;
        try {
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(sale.id)}&size=50x50&margin=0`;
            qrCodeBase64 = await fetchImageAsBase64(qrCodeUrl);
        } catch (error) {
            console.error("Failed to fetch QR code", error);
        }

        const renderContentOnDoc = (doc: jsPDF) => {
            const customer = selectedCustomer;
            const subTotal = Number(sale.totalAmount) + Number(sale.discount);
            const paidAmountOnSale = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const dueAmountOnSale = Number(sale.totalAmount) - paidAmountOnSale;

            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;
            const margin = 5;
            const maxLineWidth = pageWidth - margin * 2;
            // FIX: Removed logo from thermal receipt to match sample image and improve layout.
            let y = 10;

            doc.setFont('times', 'italic');
            doc.setFontSize(12);
            doc.setTextColor('#000000');
            doc.text('Om Namo Venkatesaya', centerX, y, { align: 'center' });
            y += 7;
            
            doc.setFont('times', 'bold');
            doc.setFontSize(20);
            doc.setTextColor('#0d9488'); // Primary Color
            doc.text(state.profile?.name || 'Business Manager', centerX, y, { align: 'center' });
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
                const itemTotal = Number(item.price) * Number(item.quantity);
                doc.setFontSize(9);
                const splitName = doc.splitTextToSize(item.productName, maxLineWidth - 20);
                doc.text(splitName, margin, y);
                doc.text(`Rs. ${itemTotal.toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
                y += (splitName.length * 4);
                doc.setFontSize(7);
                doc.setTextColor('#666666');
                doc.text(`(x${item.quantity} @ Rs. ${Number(item.price).toLocaleString('en-IN')})`, margin, y);
                y += 6;
                doc.setTextColor('#000000');
            });
            
            y -= 2;
            doc.setDrawColor('#cccccc');
            doc.line(margin, y, pageWidth - margin, y); 
            y += 5;

            const totals = [
                { label: 'Subtotal', value: subTotal },
                { label: 'GST', value: Number(sale.gstAmount) },
                { label: 'Discount', value: -Number(sale.discount) },
                { label: 'Total', value: Number(sale.totalAmount), bold: true },
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

    const generateA4InvoicePdf = async (sale: Sale, customer: Customer) => {
        const doc = new jsPDF();
        const profile = state.profile;
        let currentY = 15;

        // The logo image (an SVG) was causing a "corrupt PNG" error and has been removed to fix PDF generation.
        // doc.addImage(logoBase64, 'PNG', 14, 10, 25, 25);
    
        if (profile) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor('#0d9488');
            doc.text(profile.name, 105, currentY, { align: 'center' });
            currentY += 8;
            doc.setFontSize(10);
            doc.setTextColor('#333333');
            const addressLines = doc.splitTextToSize(profile.address, 180);
            doc.text(addressLines, 105, currentY, { align: 'center' });
            currentY += (addressLines.length * 5);
            doc.text(`Phone: ${profile.phone} | GSTIN: ${profile.gstNumber}`, 105, currentY, { align: 'center' });
        }
    
        // Removed positioning logic for the logo and added padding.
        currentY += 5;
        
        doc.setDrawColor('#cccccc');
        doc.line(14, currentY, 196, currentY);
        currentY += 10;
        
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('TAX INVOICE', 105, currentY, { align: 'center' });
        currentY += 10;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Billed To:', 14, currentY);
        doc.text('Invoice Details:', 120, currentY);
        currentY += 5;
    
        doc.setFont('helvetica', 'normal');
        doc.text(customer.name, 14, currentY);
        doc.text(`Invoice ID: ${sale.id}`, 120, currentY);
        currentY += 5;
        
        const customerAddressLines = doc.splitTextToSize(customer.address, 80);
        doc.text(customerAddressLines, 14, currentY);
        doc.text(`Date: ${new Date(sale.date).toLocaleString()}`, 120, currentY);
        currentY += (customerAddressLines.length * 5) + 5;
        
        const subTotal = Number(sale.totalAmount) + Number(sale.discount);
        autoTable(doc, {
            startY: currentY,
            head: [['#', 'Item Description', 'Qty', 'Rate', 'Amount']],
            body: sale.items.map((item, index) => [
                index + 1,
                item.productName,
                item.quantity,
                `Rs. ${Number(item.price).toLocaleString('en-IN')}`,
                `Rs. ${(Number(item.quantity) * Number(item.price)).toLocaleString('en-IN')}`
            ]),
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] },
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 10;
        
        const paidAmount = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
        const dueAmount = Number(sale.totalAmount) - paidAmount;
        
        const totalsX = 196;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text('Subtotal:', totalsX - 30, currentY, { align: 'right' });
        doc.text(`Rs. ${subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX, currentY, { align: 'right' });
        currentY += 7;
    
        doc.text('Discount:', totalsX - 30, currentY, { align: 'right' });
        doc.text(`- Rs. ${Number(sale.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX, currentY, { align: 'right' });
        currentY += 7;
    
        doc.text('GST Included:', totalsX - 30, currentY, { align: 'right' });
        doc.text(`Rs. ${Number(sale.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX, currentY, { align: 'right' });
        currentY += 7;
        
        doc.setFont('helvetica', 'bold');
        doc.text('Grand Total:', totalsX - 30, currentY, { align: 'right' });
        doc.text(`Rs. ${Number(sale.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX, currentY, { align: 'right' });
        currentY += 7;
    
        doc.setFont('helvetica', 'normal');
        doc.text('Paid:', totalsX - 30, currentY, { align: 'right' });
        doc.text(`Rs. ${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX, currentY, { align: 'right' });
        currentY += 7;
    
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(dueAmount > 0.01 ? '#dc2626' : '#16a34a');
        doc.text('Amount Due:', totalsX - 30, currentY, { align: 'right' });
        doc.text(`Rs. ${dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, totalsX, currentY, { align: 'right' });
        
        currentY = doc.internal.pageSize.height - 20;
        doc.setFontSize(10);
        doc.setTextColor('#888888');
        doc.text('Thank you for your business!', 105, currentY, { align: 'center' });
    
        return doc;
    };
    
    const handlePrintA4Invoice = async (sale: Sale) => {
        if (!selectedCustomer) return;
        const doc = await generateA4InvoicePdf(sale, selectedCustomer);
        doc.autoPrint();
        const pdfUrl = doc.output('bloburl');
        window.open(pdfUrl, '_blank');
    };

    const handleShareInvoice = async (sale: Sale) => {
        if (!selectedCustomer) return;
        
        let qrCodeBase64: string | null = null;
        try {
            const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(sale.id)}&size=50x50&margin=0`;
            qrCodeBase64 = await fetchImageAsBase64(qrCodeUrl);
        } catch (error) {
            console.error("Failed to fetch QR code", error);
        }

        const renderContentOnDoc = (doc: jsPDF) => {
            const customer = selectedCustomer;
            const subTotal = Number(sale.totalAmount) + Number(sale.discount);
            const paidAmountOnSale = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
            const dueAmountOnSale = Number(sale.totalAmount) - paidAmountOnSale;
            const pageWidth = doc.internal.pageSize.getWidth();
            const centerX = pageWidth / 2;
            const margin = 5;
            const maxLineWidth = pageWidth - margin * 2;
            // FIX: Removed logo from thermal receipt to match sample image and improve layout.
            let y = 10;

            doc.setFont('times', 'italic');
            doc.setFontSize(12);
            doc.text('Om Namo Venkatesaya', centerX, y, { align: 'center' });
            y += 7;
            doc.setFont('times', 'bold');
            doc.setFontSize(20);
            doc.setTextColor('#0d9488');
            doc.text(state.profile?.name || 'Business Manager', centerX, y, { align: 'center' });
            y += 7;
            doc.setDrawColor('#cccccc');
            doc.line(margin, y, pageWidth - margin, y);
            y += 6;
            doc.setFont('Helvetica', 'normal');
            doc.setFontSize(8);
            const invoiceTextTopY = y - 3;
            doc.text(`Invoice: ${sale.id}`, margin, y);
            y += 4;
            doc.text(`Date: ${new Date(sale.date).toLocaleString()}`, margin, y);
            if (qrCodeBase64) {
                const qrSize = 15;
                doc.addImage(qrCodeBase64, 'PNG', pageWidth - margin - qrSize, invoiceTextTopY, qrSize, qrSize);
                const qrBottom = invoiceTextTopY + qrSize;
                if (qrBottom > y) y = qrBottom;
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
            y += (addressLines.length * 4) + 2;
            doc.setDrawColor('#000000');
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;
            doc.setFont('Helvetica', 'bold');
            doc.text('Purchase Details', centerX, y, { align: 'center' });
            y += 5;
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;
            doc.text('Item', margin, y);
            doc.text('Total', pageWidth - margin, y, { align: 'right' });
            y += 2;
            doc.setDrawColor('#cccccc');
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;
            doc.setFont('Helvetica', 'normal');
            sale.items.forEach(item => {
                const itemTotal = Number(item.price) * Number(item.quantity);
                doc.setFontSize(9);
                const splitName = doc.splitTextToSize(item.productName, maxLineWidth - 20);
                doc.text(splitName, margin, y);
                doc.text(`Rs. ${itemTotal.toLocaleString('en-IN')}`, pageWidth - margin, y, { align: 'right' });
                y += (splitName.length * 4);
                doc.setFontSize(7);
                doc.setTextColor('#666666');
                doc.text(`(x${item.quantity} @ Rs. ${Number(item.price).toLocaleString('en-IN')})`, margin, y);
                y += 6;
                doc.setTextColor('#000000');
            });
            y -= 2;
            doc.setDrawColor('#cccccc');
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;
            const totals = [
                { label: 'Subtotal', value: subTotal },
                { label: 'GST', value: Number(sale.gstAmount) },
                { label: 'Discount', value: -Number(sale.discount) },
                { label: 'Total', value: Number(sale.totalAmount), bold: true },
                { label: 'Paid', value: paidAmountOnSale },
                { label: 'Due', value: dueAmountOnSale, bold: true },
            ];
            const totalsX = pageWidth - margin;
            totals.forEach(({ label, value, bold = false }) => {
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
        
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `Receipt-${sale.id}.pdf`, { type: 'application/pdf' });
        const businessName = state.profile?.name || 'Invoice';

        if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
                title: `${businessName} - Receipt ${sale.id}`,
                files: [pdfFile],
            });
        } else {
            doc.save(`Receipt-${sale.id}.pdf`);
        }
    };


    const handleShareDuesSummary = async () => {
        if (!selectedCustomer) return;

        const overdueSales = state.sales.filter(s => {
            const paid = (s.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            return s.customerId === selectedCustomer.id && (Number(s.totalAmount) - paid) > 0.01;
        });

        if (overdueSales.length === 0) {
            alert(`${selectedCustomer.name} has no outstanding dues.`);
            return;
        }

        const totalDue = overdueSales.reduce((total, sale) => {
            const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            return total + (Number(sale.totalAmount) - paid);
        }, 0);
        
        const doc = new jsPDF();
        const profile = state.profile;
        let currentY = 15;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor('#0d9488'); // Primary color
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
                const paid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                const due = Number(sale.totalAmount) - paid;
                return [
                    sale.id,
                    new Date(sale.date).toLocaleDateString(),
                    `Rs. ${Number(sale.totalAmount).toLocaleString('en-IN')}`,
                    `Rs. ${paid.toLocaleString('en-IN')}`,
                    `Rs. ${due.toLocaleString('en-IN')}`
                ];
            }),
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] }, // Primary color
            columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } }
        });
        
        currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#0d9488');
        doc.text(
            `Total Outstanding Due: Rs. ${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            196, currentY, { align: 'right' }
        );

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], `Dues-Summary-${selectedCustomer.id}.pdf`, { type: 'application/pdf' });
        const businessName = state.profile?.name || 'Dues Summary';

        if (navigator.share && navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            title: `${businessName} - Dues for ${selectedCustomer.name}`,
            files: [pdfFile],
          });
        } else {
          doc.save(`Dues-Summary-${selectedCustomer.id}.pdf`);
        }
    };


    const filteredCustomers = state.customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.area.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    const selectedSale = state.sales.find(s => s.id === paymentModalState.saleId);
    const selectedSaleAmountPaid = selectedSale ? selectedSale.payments.reduce((sum, p) => sum + Number(p.amount), 0) : 0;
    const selectedSaleDueAmount = selectedSale ? Number(selectedSale.totalAmount) - selectedSaleAmountPaid : 0;

    if (selectedCustomer && editedCustomer) {
        const customerSales = state.sales.filter(s => s.customerId === selectedCustomer.id);
        const customerReturns = state.returns.filter(r => r.type === 'CUSTOMER' && r.partyId === selectedCustomer.id);
        
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
                
                <PaymentModal
                    isOpen={paymentModalState.isOpen}
                    onClose={() => setPaymentModalState({isOpen: false, saleId: null})}
                    onSubmit={handleAddPayment}
                    totalAmount={selectedSale ? Number(selectedSale.totalAmount) : 0}
                    dueAmount={selectedSaleDueAmount}
                    paymentDetails={paymentDetails}
                    setPaymentDetails={setPaymentDetails}
                />
                
                <Button onClick={() => setSelectedCustomer(null)}>&larr; Back to List</Button>
                <Card>
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h2 className="text-lg font-bold text-primary">Customer Details: {selectedCustomer.name}</h2>
                        </div>
                        <div className="flex gap-2 items-center flex-shrink-0">
                            {isEditing ? (
                                <>
                                    <Button onClick={handleUpdateCustomer} className="h-9 px-3"><Save size={16} /> Save</Button>
                                    <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
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
                            <div><label className="text-sm font-medium dark:text-gray-300">Name</label><input type="text" name="name" value={editedCustomer.name} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-sm font-medium dark:text-gray-300">Phone</label><input type="text" name="phone" value={editedCustomer.phone} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-sm font-medium dark:text-gray-300">Address</label><input type="text" name="address" value={editedCustomer.address} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-sm font-medium dark:text-gray-300">Area</label><input type="text" name="area" value={editedCustomer.area} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-sm font-medium dark:text-gray-300">Reference</label><input type="text" name="reference" value={editedCustomer.reference ?? ''} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                        </div>
                    ) : (
                        <div className="space-y-1 text-gray-700 dark:text-gray-300">
                             <p><strong>ID:</strong> {selectedCustomer.id}</p>
                            <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                            <p><strong>Address:</strong> {selectedCustomer.address}</p>
                            <p><strong>Area:</strong> {selectedCustomer.area}</p>
                            {selectedCustomer.reference && <p><strong>Reference:</strong> {selectedCustomer.reference}</p>}
                        </div>
                    )}
                     <div className="mt-4 pt-4 border-t dark:border-slate-700">
                        <Button onClick={handleShareDuesSummary} className="w-full">
                            <Share2 size={16} className="mr-2" />
                            Share Dues Summary
                        </Button>
                    </div>
                </Card>
                <Card title="Sales History">
                    {customerSales.length > 0 ? (
                        <div className="space-y-2">
                            {customerSales.slice().reverse().map(sale => {
                                const amountPaid = sale.payments.reduce((sum, p) => sum + Number(p.amount), 0);
                                const dueAmount = Number(sale.totalAmount) - amountPaid;
                                const isPaid = dueAmount <= 0.01;
                                const subTotal = Number(sale.totalAmount) + Number(sale.discount);
                                const isExpanded = activeSaleId === sale.id;

                                return (
                                <div key={sale.id} className="bg-gray-50 dark:bg-slate-700/30 rounded-lg border dark:border-slate-700 overflow-hidden transition-all duration-300">
                                    <button 
                                        onClick={() => setActiveSaleId(isExpanded ? null : sale.id)}
                                        className="w-full text-left p-3 flex justify-between items-center hover:bg-gray-100 dark:hover:bg-slate-700 focus:outline-none focus:bg-gray-100 dark:focus:bg-slate-700 transition-colors"
                                    >
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-800 dark:text-gray-200">{sale.id}</p>
                                            <p className="text-xs text-gray-600 dark:text-gray-400">{new Date(sale.date).toLocaleString()}</p>
                                        </div>
                                        <div className="text-right mx-2">
                                            <p className="font-bold text-lg text-primary">₹{Number(sale.totalAmount).toLocaleString('en-IN')}</p>
                                            <p className={`text-sm font-semibold ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                {isPaid ? 'Paid' : `Due: ₹${dueAmount.toLocaleString('en-IN')}`}
                                            </p>
                                        </div>
                                        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isExpanded && (
                                        <div className="p-3 border-t dark:border-slate-700 bg-white dark:bg-slate-800 animate-slide-down-fade">
                                            <div className="flex justify-end items-start mb-2">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleEditSale(sale.id)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full" aria-label="Edit Sale"><Edit size={16} /></button>
                                                     <div className="relative" ref={actionMenuSaleId === sale.id ? actionMenuRef : undefined}>
                                                        <button onClick={() => setActionMenuSaleId(sale.id)} className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full" aria-label="Share or Download Invoice">
                                                            <Share2 size={16} />
                                                        </button>
                                                        {actionMenuSaleId === sale.id && (
                                                            <div className="absolute top-full right-0 mt-1 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 text-text dark:text-slate-200 z-10 animate-scale-in origin-top-right">
                                                                <button onClick={() => { handlePrintA4Invoice(sale); setActionMenuSaleId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700">Print (A4)</button>
                                                                <button onClick={() => { handleDownloadThermalReceipt(sale); setActionMenuSaleId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700">Download Receipt</button>
                                                                <button onClick={() => { handleShareInvoice(sale); setActionMenuSaleId(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-slate-700">Share Invoice</button>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <DeleteButton 
                                                        variant="delete" 
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteSale(sale.id); }} 
                                                    />
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div>
                                                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">Items Purchased:</h4>
                                                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                        {sale.items.map((item, index) => (
                                                            <li key={index}>
                                                                {item.productName} (x{item.quantity}) @ ₹{Number(item.price).toLocaleString('en-IN')} each
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                                <div className="p-2 bg-white dark:bg-slate-700 rounded-md text-sm border dark:border-slate-600">
                                                    <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Transaction Details:</h4>
                                                    <div className="space-y-1 text-gray-600 dark:text-gray-300">
                                                        <div className="flex justify-between"><span>Subtotal:</span> <span>₹{subTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                                        <div className="flex justify-between"><span>Discount:</span> <span>- ₹{Number(sale.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                                        <div className="flex justify-between"><span>GST Included:</span> <span>₹{Number(sale.gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                                        <div className="flex justify-between font-bold border-t dark:border-slate-500 pt-1 mt-1 text-gray-800 dark:text-white"><span>Grand Total:</span> <span>₹{Number(sale.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-1">Payments Made:</h4>
                                                    {sale.payments.length > 0 ? (
                                                        <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                                                            {sale.payments.map(payment => (
                                                                <li key={payment.id}>
                                                                    ₹{Number(payment.amount).toLocaleString('en-IN')} {payment.method === 'RETURN_CREDIT' ? <span className="text-blue-600 dark:text-blue-400 font-semibold">(Return Credit)</span> : `via ${payment.method}`} on {new Date(payment.date).toLocaleDateString()}
                                                                    {payment.reference && <span className="text-xs text-gray-500 dark:text-gray-500 block">Ref: {payment.reference}</span>}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <p className="text-sm text-gray-500 dark:text-gray-400">No payments made yet.</p>}
                                                </div>
                                                {!isPaid && (
                                                    <div className="pt-2">
                                                        <Button onClick={() => setPaymentModalState({ isOpen: true, saleId: sale.id })} className="w-full">
                                                            <Plus size={16} className="mr-2"/> Add Payment
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )})}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">No sales recorded for this customer.</p>
                    )}
                </Card>
                 <Card title="Returns History">
                    {customerReturns.length > 0 ? (
                         <div className="space-y-3">
                            {customerReturns.slice().reverse().map(ret => (
                                <div key={ret.id} className="p-3 bg-gray-50 dark:bg-slate-700/30 rounded-lg border dark:border-slate-700">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold dark:text-slate-200">Return on {new Date(ret.returnDate).toLocaleDateString()}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Original Invoice: {ret.referenceId}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold text-primary">Refunded: ₹{Number(ret.amount).toLocaleString('en-IN')}</p>
                                            <Button onClick={() => handleEditReturn(ret.id)} variant="secondary" className="p-2 h-auto">
                                                <Edit size={16} />
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="mt-2 pt-2 border-t dark:border-slate-600">
                                        <ul className="text-sm list-disc list-inside text-gray-600 dark:text-gray-400">
                                            {ret.items.map((item, idx) => (
                                                <li key={idx}>{item.productName} (x{item.quantity})</li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 dark:text-gray-400">No returns recorded for this customer.</p>
                    )}
                </Card>
            </div>
        );
    }


    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-primary">Customers</h1>
                <Button onClick={() => setIsAddCustomerModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Customer
                </Button>
            </div>

            {isAddCustomerModalOpen && (
                <AddCustomerModal
                    isOpen={isAddCustomerModalOpen}
                    onClose={() => setIsAddCustomerModalOpen(false)}
                    onAdd={handleAddCustomer}
                    existingCustomers={state.customers}
                />
            )}

            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search customers by name, phone, or area..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                />
            </div>

            <div className="space-y-3">
                {filteredCustomers.map((customer, index) => {
                    const customerSales = state.sales.filter(s => s.customerId === customer.id);
                    const totalPurchase = customerSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                    const totalPaid = customerSales.reduce((sum, s) => sum + s.payments.reduce((pSum, p) => pSum + Number(p.amount), 0), 0);
                    const totalDue = totalPurchase - totalPaid;

                    return (
                        <Card 
                            key={customer.id} 
                            className="cursor-pointer transition-shadow animate-slide-up-fade" 
                            style={{ animationDelay: `${index * 50}ms` }}
                            onClick={() => setSelectedCustomer(customer)}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-lg text-primary flex items-center gap-2"><User size={16}/> {customer.name}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"><Phone size={14}/> {customer.phone}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2"><MapPin size={14}/> {customer.area}</p>
                                </div>
                                <div className="text-right flex-shrink-0 ml-4">
                                    <div className="flex items-center justify-end gap-1 text-green-600 dark:text-green-400">
                                        <ShoppingCart size={14} />
                                        <span className="font-semibold">₹{totalPurchase.toLocaleString('en-IN')}</span>
                                    </div>
                                     <div className={`flex items-center justify-end gap-1 ${totalDue > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                        <IndianRupee size={14} />
                                        <span className="font-semibold">₹{totalDue.toLocaleString('en-IN')}</span>
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
