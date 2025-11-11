import React, { useState, useMemo, useRef } from 'react';
import { Download, Filter, XCircle, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer, Sale, SaleItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

        return Object.values(customerSalesSummary).sort((a, b) => b.totalSales - a.totalSales);
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
        doc.setFontSize(18);
        doc.text('Customer Dues Report', 14, 22);
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
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                setImportStatus({type: 'error', message: 'Could not read the file content.'});
                return;
            }

            try {
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) {
                    setImportStatus({type: 'error', message: 'CSV file must have a header row and at least one data row.'});
                    return;
                }

                const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                const requiredHeaders = ['id', 'name', 'phone', 'address', 'area', 'dueamount'];
                const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));

                if (missingHeaders.length > 0) {
                     setImportStatus({type: 'error', message: `CSV is missing required columns: ${missingHeaders.join(', ')}.`});
                     return;
                }
                
                let importedCount = 0;
                setImportStatus({type: 'info', message: `Processing ${lines.length - 1} records...`});

                for (let i = 1; i < lines.length; i++) {
                    const values = lines[i].split(',');
                    const row = headers.reduce((obj, header, index) => {
                        obj[header] = values[index]?.trim() || '';
                        return obj;
                    }, {} as any);

                    const customerId = `CUST-${row.id}`;
                    const dueAmount = parseFloat(row.dueamount);

                    if (!row.id || !row.name || isNaN(dueAmount)) {
                        console.warn(`Skipping row ${i+1} due to missing ID, Name, or invalid Due Amount.`);
                        continue;
                    }

                    const existingCustomer = state.customers.find(c => c.id === customerId);
                    if (!existingCustomer) {
                        const newCustomer: Customer = {
                            id: customerId,
                            name: row.name,
                            phone: row.phone,
                            address: row.address,
                            area: row.area
                        };
                        dispatch({ type: 'ADD_CUSTOMER', payload: newCustomer });
                    }
                    
                    if (dueAmount > 0) {
                        const saleItem: SaleItem = {
                            productId: 'IMPORTED_DUE',
                            productName: 'Opening Balance / Imported Due',
                            quantity: 1,
                            price: dueAmount,
                        };
                        const newSale: Sale = {
                            id: `SALE-IMP-${row.id}-${Date.now()}`,
                            customerId,
                            items: [saleItem],
                            discount: 0,
                            gstAmount: 0,
                            totalAmount: dueAmount,
                            date: new Date().toISOString(),
                            payments: [],
                        };
                        dispatch({ type: 'ADD_SALE', payload: newSale });
                    }
                    importedCount++;
                }
                setImportStatus({type: 'success', message: `Successfully imported ${importedCount} customer records.`});
                showToast(`Imported ${importedCount} records.`);
            } catch (error) {
                console.error("CSV Import Error:", error);
                setImportStatus({type: 'error', message: `An error occurred during import: ${(error as Error).message}`});
            } finally {
                 if (csvInputRef.current) csvInputRef.current.value = "";
            }
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
        return (
            <div className={`p-3 rounded-md mt-4 text-sm flex justify-between items-start ${variants[importStatus.type]}`}>
                <span>{importStatus.message}</span>
                <button onClick={() => setImportStatus(null)} className="font-bold text-lg leading-none ml-4">&times;</button>
            </div>
        );
    };

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary">Reports</h1>
            
            <Card title="Report Filters">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <label htmlFor="areaFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Area (Dues Report)</label>
                            <Filter className="absolute left-3 bottom-2.5 text-gray-400" size={20} />
                            <select
                                id="areaFilter"
                                value={selectedArea}
                                onChange={(e) => setSelectedArea(e.target.value)}
                                className="w-full p-2 pl-10 border rounded-lg appearance-none custom-select"
                            >
                                <option value="">All Areas</option>
                                {uniqueAreas.map(area => <option key={area} value={area}>{area}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                            <input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                            <input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded-lg" />
                        </div>
                    </div>
                     <div className="flex items-center gap-4">
                        <p className="text-sm font-medium text-gray-700">Actions:</p>
                        <Button onClick={generatePDF}><Download className="w-4 h-4 mr-2" />Export Dues (PDF)</Button>
                        <Button onClick={generateCSV} variant="secondary"><Download className="w-4 h-4 mr-2" />Export Dues (CSV)</Button>
                        <Button onClick={handleClearFilters} variant="danger" className="ml-auto"><XCircle className="w-4 h-4 mr-2" />Clear Filters</Button>
                    </div>
                </div>
            </Card>

            <Card title="Import Customer Dues from CSV">
                <p className="text-sm text-gray-600 mb-2">
                    Upload a CSV file to add new customers and their outstanding balances. The CSV must have these columns: <code>id,name,phone,address,area,dueamount</code>.
                </p>
                <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    ref={csvInputRef}
                    onChange={handleImportCSV}
                />
                <Button onClick={() => csvInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" /> Import from CSV
                </Button>
                <StatusNotification />
            </Card>

            <Card title="Customer Dues Collection List">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">Phone</th>
                                <th className="p-2">Area</th>
                                <th className="p-2 text-right">Due Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDues.length > 0 ? filteredDues.sort((a,b) => b.totalDue - a.totalDue).map(customer => (
                                <tr key={customer.id} className="border-b">
                                    <td className="p-2 font-medium">{customer.name}</td>
                                    <td className="p-2">{customer.phone}</td>
                                    <td className="p-2">{customer.area}</td>
                                    <td className="p-2 text-right font-semibold text-red-600">₹{customer.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center text-gray-500 p-4">No dues found for the selected filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Sales by Customer Summary">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2">Customer</th>
                                <th className="p-2 text-right">Total Sales</th>
                                <th className="p-2 text-right">Total Paid</th>
                                <th className="p-2 text-right">Total Dues</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salesByCustomer.length > 0 ? salesByCustomer.map(({ customer, totalSales, totalPaid }) => {
                                const totalDue = totalSales - totalPaid;
                                return (
                                    <tr key={customer.id} className="border-b">
                                        <td className="p-2 font-medium">{customer.name} <span className="text-gray-500">({customer.area})</span></td>
                                        <td className="p-2 text-right font-semibold text-green-600">₹{totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className="p-2 text-right font-semibold text-blue-600">₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td className={`p-2 text-right font-bold ${totalDue > 0.01 ? 'text-red-600' : 'text-gray-600'}`}>₹{totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={4} className="text-center text-gray-500 p-4">No sales data for the selected filters.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ReportsPage;