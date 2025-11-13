import React, { useState, useMemo, useRef } from 'react';
import { Download, Filter, XCircle, Upload, Info, CheckCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Sale, SaleItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// More robust CSV line parser that handles quoted fields.
const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Handle escaped quote ""
        current += '"';
        i++; // Skip the next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Unquoted comma is a delimiter
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
};


const ReportsPage: React.FC = () => {
    const { state, dispatch, showToast } = useAppContext();
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const csvInputRef = useRef<HTMLInputElement>(null);
    const [importStatus, setImportStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);


    const filteredSalesByDate = state.sales.filter(sale => {
        if (!startDate && !endDate) return true;
        const saleDate = new Date(sale.date);
        if (startDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            if (saleDate < start) return false;
        }
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            if (saleDate > end) return false;
        }
        return true;
    });

    const customerDues = filteredSalesByDate
        .map(sale => {
            const amountPaid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
            const dueAmount = sale.totalAmount - amountPaid;
            return { ...sale, dueAmount };
        })
        .filter(sale => sale.dueAmount > 0.01)
        .reduce((acc, sale) => {
            const customer = state.customers.find(c => c.id === sale.customerId);
            if (customer) {
                if (!acc[customer.id]) {
                    acc[customer.id] = { ...customer, totalDue: 0 };
                }
                acc[customer.id].totalDue += sale.dueAmount;
            }
            return acc;
        }, {} as {[key: string]: Customer & { totalDue: number } });

    const customerDuesArray: (Customer & { totalDue: number })[] = Object.values(customerDues);

    const filteredDues = selectedArea 
        ? customerDuesArray.filter(c => c.area.toLowerCase() === selectedArea.toLowerCase())
        : customerDuesArray;

    const salesByCustomer = useMemo(() => {
        const customerSalesSummary: { [key: string]: { customer: Customer; totalSales: number; totalPaid: number; } } = {};

        filteredSalesByDate.forEach(sale => {
            const customer = state.customers.find(c => c.id === sale.customerId);
            if (customer) {
                if (!customerSalesSummary[customer.id]) {
                    customerSalesSummary[customer.id] = {
                        customer,
                        totalSales: 0,
                        totalPaid: 0,
                    };
                }
                customerSalesSummary[customer.id].totalSales += sale.totalAmount;
                const paidForThisSale = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
                customerSalesSummary[customer.id].totalPaid += paidForThisSale;
            }
        });
        
        const summaryWithDues = Object.values(customerSalesSummary).map(summary => ({
            ...summary,
            totalDue: summary.totalSales - summary.totalPaid
        }));

        return summaryWithDues.sort((a, b) => b.totalSales - a.totalSales);
    }, [filteredSalesByDate, state.customers]);

    const uniqueAreas = [...new Set(state.customers.map(c => c.area))];

    const handleClearFilters = () => {
        setSelectedArea('');
        setStartDate('');
        setEndDate('');
    };

    const generatePDF = () => {
        if (filteredDues.length === 0) {
            alert("No data to export for the selected filters.");
            return;
        }
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor('#6a0dad'); // Primary color
        doc.text('Customer Dues Report', 14, 22);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        doc.setTextColor(100);
        
        let currentY = 28;
        doc.text(`Generated on: ${date}`, 14, currentY);
        
        if (selectedArea) {
            currentY += 6;
            doc.text(`Filtered by Area: ${selectedArea}`, 14, currentY);
        }
        if (startDate || endDate) {
            currentY += 6;
            doc.text(`Date Range: ${startDate || 'Start'} to ${endDate || 'End'}`, 14, currentY);
        }

        autoTable(doc, {
            startY: currentY + 6,
            head: [['Name', 'Phone', 'Area', 'Due Amount (Rs.)']],
            body: filteredDues.map(c => [
                c.name,
                c.phone,
                c.area,
                c.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })
            ]),
            theme: 'grid',
            headStyles: { fillColor: [106, 13, 173] },
            columnStyles: {
                3: { halign: 'right' }
            }
        });

        const totalDue = filteredDues.reduce((sum, c) => sum + c.totalDue, 0);
        const finalY = (doc as any).lastAutoTable.finalY;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor('#333333');
        doc.text(
            `Total Dues: Rs. ${totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            14,
            finalY + 10
        );

        doc.save(`customer-dues-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    };
    
    const generateCSV = () => {
        if (filteredDues.length === 0) {
            alert("No data to export for the selected filters.");
            return;
        }
        const escapeCsvCell = (cell: any) => `"${String(cell).replace(/"/g, '""')}"`;
        const headers = ['Name', 'Phone', 'Area', 'Due Amount'];
        const rows = filteredDues.map(c => 
            [
                escapeCsvCell(c.name),
                escapeCsvCell(c.phone),
                escapeCsvCell(c.area),
                c.totalDue
            ].join(',')
        );
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `customer-dues-report-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setImportStatus({type: 'info', message: 'Reading file...'});

        const reader = new FileReader();

        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) {
                setImportStatus({ type: 'error', message: 'Could not read file content.' });
                return;
            }

            if (!window.confirm("Are you sure you want to import sales from this file? This will create new sales and update stock levels. It will skip any sales where the Sale ID already exists.")) {
                 if (csvInputRef.current) csvInputRef.current.value = "";
                 setImportStatus(null);
                 return;
            }

            setImportStatus({ type: 'info', message: 'Processing CSV data... This may take a moment.' });
            
            try {
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) throw new Error('CSV must have a header and at least one data row.');

                const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
                const requiredHeaders = ['saleid', 'date', 'customerid', 'productid', 'quantity', 'price', 'discount'];
                const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));
                if (missingHeaders.length > 0) {
                    throw new Error(`CSV is missing required columns: ${missingHeaders.join(', ')}.`);
                }
                
                const salesMap = new Map<string, { customerId: string; date: string; discount: number; items: SaleItem[] }>();

                for (let i = 1; i < lines.length; i++) {
                    const values = parseCsvLine(lines[i]);
                    const row: { [key: string]: string } = {};
                    headers.forEach((header, index) => {
                        row[header] = values[index]?.trim() || '';
                    });
                    
                    const { saleid, date, customerid, productid, quantity, price, discount } = row;

                    if (!saleid || !date || !customerid || !productid || !quantity || !price) {
                        console.warn(`Skipping row ${i + 1} due to missing required data.`);
                        continue;
                    }

                    const customer = state.customers.find(c => c.id.toLowerCase() === customerid.toLowerCase());
                    const product = state.products.find(p => p.id.toLowerCase() === productid.toLowerCase());
                    
                    if (!customer) throw new Error(`Customer with ID "${customerid}" not found (row ${i + 1}). Please add the customer first.`);
                    if (!product) throw new Error(`Product with ID "${productid}" not found (row ${i + 1}). Please add the product first.`);
                    
                    const saleData = salesMap.get(saleid) || { customerId: customerid, date: new Date(date).toISOString(), discount: parseFloat(discount || '0'), items: [] };

                    const saleItem: SaleItem = {
                        productId: productid,
                        productName: product.name,
                        quantity: parseInt(quantity, 10),
                        price: parseFloat(price),
                    };

                    if (isNaN(saleItem.quantity) || isNaN(saleItem.price) || saleItem.quantity <= 0) {
                         console.warn(`Skipping row ${i + 1} due to invalid number format for quantity or price.`);
                        continue;
                    }
                    
                    if (saleItem.quantity > product.quantity) {
                        throw new Error(`Not enough stock for product "${product.name}" (ID: ${productid}) on row ${i + 1}. Required: ${saleItem.quantity}, Available: ${product.quantity}.`);
                    }

                    saleData.items.push(saleItem);
                    salesMap.set(saleid, saleData);
                }

                if (salesMap.size === 0) throw new Error("No valid sales data found in the CSV to import.");

                let importedCount = 0;
                for (const [saleId, saleData] of salesMap.entries()) {
                    if (state.sales.some(s => s.id.toLowerCase() === saleId.toLowerCase())) {
                        console.warn(`Sale with ID "${saleId}" already exists. Skipping.`);
                        continue;
                    }

                    const subTotal = saleData.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
                    const gstAmount = saleData.items.reduce((sum, item) => {
                        const product = state.products.find(p => p.id === item.productId);
                        const itemGstPercent = product ? product.gstPercent : 0;
                        const itemTotalWithGst = item.price * item.quantity;
                        const itemGst = itemTotalWithGst - (itemTotalWithGst / (1 + (itemGstPercent / 100)));
                        return sum + itemGst;
                    }, 0);

                    const newSale: Sale = {
                        id: saleId, customerId: saleData.customerId, items: saleData.items,
                        discount: saleData.discount, gstAmount, totalAmount: subTotal - saleData.discount,
                        date: saleData.date, payments: [],
                    };

                    dispatch({ type: 'ADD_SALE', payload: newSale });
                    saleData.items.forEach(item => {
                        dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: item.productId, change: -item.quantity } });
                    });
                    importedCount++;
                }

                setImportStatus({ type: 'success', message: `Successfully imported ${importedCount} new sales. ${salesMap.size - importedCount} sales were duplicates and skipped.` });
                
            } catch (error) {
                setImportStatus({ type: 'error', message: `Import failed: ${(error as Error).message}` });
            } finally {
                if (csvInputRef.current) csvInputRef.current.value = "";
            }
        };

        reader.onerror = () => {
            setImportStatus({ type: 'error', message: 'Failed to read the file.' });
            if (csvInputRef.current) csvInputRef.current.value = "";
        };

        reader.readAsText(file);
    };

    const StatusNotification = () => {
        if (!importStatus) return null;
        const variants = {
            info: 'bg-blue-100 text-blue-800',
            success: 'bg-green-100 text-green-800',
            error: 'bg-red-100 text-red-800',
        };
        const icons = {
            info: <Info className="w-5 h-5 mr-3 flex-shrink-0" />,
            success: <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
            error: <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
        };
        return (
            <div className={`p-3 rounded-md my-4 text-sm flex justify-between items-start ${variants[importStatus.type]}`}>
                <div className="flex items-start">
                    {icons[importStatus.type]}
                    <span>{importStatus.message}</span>
                </div>
                <button onClick={() => setImportStatus(null)} className="font-bold text-lg leading-none ml-4">&times;</button>
            </div>
        );
    };

    const totalFilteredDue = filteredDues.reduce((sum, c) => sum + c.totalDue, 0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Reports</h1>

            <Card title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <select
                        value={selectedArea}
                        onChange={(e) => setSelectedArea(e.target.value)}
                        className="w-full p-2 border rounded-lg custom-select"
                    >
                        <option value="">All Areas</option>
                        {uniqueAreas.map(area => <option key={area} value={area}>{area}</option>)}
                    </select>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                    />
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 border rounded-lg"
                    />
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={handleClearFilters} variant="secondary">
                        <XCircle className="w-4 h-4 mr-2" />
                        Clear Filters
                    </Button>
                </div>
            </Card>

            <Card>
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <h2 className="text-lg font-bold text-primary mb-2 sm:mb-0">Dues Report</h2>
                    <div className="flex gap-2">
                        <Button onClick={generatePDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                        <Button onClick={generateCSV} variant="secondary"><Download className="w-4 h-4 mr-2" /> CSV</Button>
                    </div>
                </div>

                <div className="mt-4 max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">Area</th>
                                <th className="p-2 text-right">Due Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDues.map(c => (
                                <tr key={c.id} className="border-b">
                                    <td className="p-2 font-semibold">{c.name}</td>
                                    <td className="p-2 text-gray-600">{c.area}</td>
                                    <td className="p-2 text-right font-bold text-red-600">₹{c.totalDue.toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="mt-4 text-right font-bold text-lg">
                    Total Due: <span className="text-primary">₹{totalFilteredDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
            </Card>

            <Card title={`Overall Sales by Customer ${startDate || endDate ? `(filtered)`: ''}`}>
                 <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2">Customer</th>
                                <th className="p-2 text-right">Total Sales</th>
                                <th className="p-2 text-right">Total Paid</th>
                                <th className="p-2 text-right">Total Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesByCustomer.map(({ customer, totalSales, totalPaid, totalDue }) => (
                                <tr key={customer.id} className="border-b">
                                    <td className="p-2 font-semibold">{customer.name}</td>
                                    <td className="p-2 text-right text-green-600">₹{totalSales.toLocaleString('en-IN')}</td>
                                    <td className="p-2 text-right">₹{totalPaid.toLocaleString('en-IN')}</td>
                                    <td className={`p-2 text-right font-bold ${totalDue > 0.01 ? 'text-red-600' : 'text-gray-600'}`}>
                                        ₹{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            
            <Card title="Import Sales from CSV">
                 <p className="text-sm text-gray-600 mb-2">
                    Bulk import historical sales data. The CSV must contain the columns: `saleid`, `date`, `customerid`, `productid`, `quantity`, `price`, `discount`. Any sales with an ID that already exists will be skipped. Customers and products must exist in the app before importing.
                 </p>
                 <StatusNotification />
                 <Button onClick={() => csvInputRef.current?.click()} className="w-full">
                    <Upload className="w-4 h-4 mr-2" />
                    Import Sales CSV
                 </Button>
            </Card>
        </div>
    );
};

export default ReportsPage;