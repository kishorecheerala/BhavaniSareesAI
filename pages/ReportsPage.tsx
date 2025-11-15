import React, { useMemo, useState } from 'react';
import { Download, XCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Sale } from '../types';

interface CustomerWithDue extends Customer {
  dueAmount: number;
  lastPaidDate: string | null;
}

const ReportsPage: React.FC = () => {
    const { state } = useAppContext();
    const [areaFilter, setAreaFilter] = useState('all');
    const [duesAgeFilter, setDuesAgeFilter] = useState('all'); // 'all', '30', '60', '90', 'custom'
    const [customDuesAge, setCustomDuesAge] = useState('');

    // --- Dues Report Logic ---
    const customerDues = useMemo((): CustomerWithDue[] => {
        const customersWithDuesAndDates = state.customers.map(customer => {
            const customerSales = state.sales.filter(sale => sale.customerId === customer.id);
            let totalDue = 0;
            let lastPaidDate: Date | null = null;
            const salesWithDue: Sale[] = [];

            customerSales.forEach(sale => {
                const amountPaid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
                const due = sale.totalAmount - amountPaid;
                if (due > 0.01) {
                    totalDue += due;
                    salesWithDue.push(sale);
                }
                
                (sale.payments || []).forEach(p => {
                    const paymentDate = new Date(p.date);
                    if (!lastPaidDate || paymentDate > lastPaidDate) {
                        lastPaidDate = paymentDate;
                    }
                });
            });

            return {
                ...customer,
                dueAmount: totalDue,
                lastPaidDate: lastPaidDate ? lastPaidDate.toLocaleDateString('en-IN') : null,
                salesWithDue
            };
        });

        return customersWithDuesAndDates
            .filter(c => c.dueAmount > 0.01) // Filter customers with actual dues
            .filter(c => areaFilter === 'all' || c.area === areaFilter) // Filter by area
            .filter(c => { // Filter by dues age
                if (duesAgeFilter === 'all') return true;

                const days = duesAgeFilter === 'custom' ? parseInt(customDuesAge) || 0 : parseInt(duesAgeFilter);
                if (days <= 0) return true; 

                const thresholdDate = new Date();
                thresholdDate.setDate(thresholdDate.getDate() - days);
                
                return c.salesWithDue.some(sale => new Date(sale.date) < thresholdDate);
            });

    }, [state.customers, state.sales, areaFilter, duesAgeFilter, customDuesAge]);

    const uniqueAreas = useMemo(() => [...new Set(state.customers.map(c => c.area).filter(Boolean))], [state.customers]);
    const totalDuesFiltered = useMemo(() => customerDues.reduce((sum, c) => sum + c.dueAmount, 0), [customerDues]);

    const generateDuesPDF = () => {
        if (customerDues.length === 0) {
            alert("No dues data to export for the selected filters.");
            return;
        }
        
        const doc = new jsPDF();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor('#6a0dad');
        doc.text('Customer Dues Report', 105, 22, { align: 'center' });

        autoTable(doc, {
            startY: 30,
            head: [['Customer Name', 'Area', 'Due Amount (Rs.)', 'Last Paid Date']],
            body: customerDues.map(c => [
                c.name,
                c.area,
                c.dueAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
                c.lastPaidDate || 'N/A'
            ]),
            theme: 'grid',
            headStyles: { fillColor: [106, 13, 173] },
            columnStyles: { 2: { halign: 'right' } }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(
            `Total Due: Rs. ${totalDuesFiltered.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            196, finalY, { align: 'right' }
        );

        doc.save(`customer-dues-report-${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const generateDuesCSV = () => {
        if (customerDues.length === 0) {
            alert("No dues data to export for the selected filters.");
            return;
        }
        const escapeCsvCell = (cell: any) => `"${String(cell).replace(/"/g, '""')}"`;
        const headers = ['Customer Name', 'Area', 'Due Amount', 'Last Paid Date'];
        const rows = customerDues.map(c => 
            [escapeCsvCell(c.name), escapeCsvCell(c.area), c.dueAmount, escapeCsvCell(c.lastPaidDate || 'N/A')].join(',')
        );
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `customer-dues-report-${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };

    const clearDuesFilters = () => {
        setAreaFilter('all');
        setDuesAgeFilter('all');
        setCustomDuesAge('');
    };

    // --- Customer Account Summary Logic ---
    const customerAccountSummaries = useMemo(() => {
        return state.customers.map(customer => {
            const customerSales = state.sales.filter(sale => sale.customerId === customer.id);
            const totalSales = customerSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
            const totalPaid = customerSales.reduce((sum, sale) => {
                const salePaid = (sale.payments || []).reduce((pSum, payment) => pSum + payment.amount, 0);
                return sum + salePaid;
            }, 0);
            const totalDue = totalSales - totalPaid;
            return { id: customer.id, name: customer.name, totalSales, totalPaid, totalDue };
        });
    }, [state.customers, state.sales]);

    const generateSummaryPDF = () => {
        if (customerAccountSummaries.length === 0) {
            alert("No customer data to export.");
            return;
        }
        const doc = new jsPDF();
        doc.text('Customer Account Summary', 14, 22);
        autoTable(doc, {
            startY: 30,
            head: [['Customer Name', 'Total Sales (Rs.)', 'Total Paid (Rs.)', 'Outstanding Due (Rs.)']],
            body: customerAccountSummaries.map(c => [
                c.name, c.totalSales.toLocaleString('en-IN'), c.totalPaid.toLocaleString('en-IN'), c.totalDue.toLocaleString('en-IN')
            ]),
            columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
        });
        doc.save(`customer-account-summary-${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const generateSummaryCSV = () => {
        if (customerAccountSummaries.length === 0) {
            alert("No customer data to export.");
            return;
        }
        const headers = ['Customer Name', 'Total Sales', 'Total Paid', 'Total Due'];
        const rows = customerAccountSummaries.map(c => [c.name, c.totalSales, c.totalPaid, c.totalDue].join(','));
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `customer-account-summary-${new Date().toISOString().slice(0, 10)}.csv`);
        link.click();
    };
    
    const summaryGrandTotals = customerAccountSummaries.reduce(
        (totals, summary) => ({
            totalSales: totals.totalSales + summary.totalSales,
            totalPaid: totals.totalPaid + summary.totalPaid,
            totalDue: totals.totalDue + summary.totalDue,
        }),
        { totalSales: 0, totalPaid: 0, totalDue: 0 }
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Reports</h1>

            <Card title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                    <div>
                        <label htmlFor="area-filter" className="block text-sm font-medium text-gray-700">Filter by Area</label>
                        <select id="area-filter" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="w-full p-2 border rounded-lg custom-select mt-1">
                            <option value="all">All Areas</option>
                            {uniqueAreas.map(area => <option key={area} value={area}>{area}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="dues-age-filter" className="block text-sm font-medium text-gray-700">Filter by Dues Age</label>
                        <select id="dues-age-filter" value={duesAgeFilter} onChange={(e) => setDuesAgeFilter(e.target.value)} className="w-full p-2 border rounded-lg custom-select mt-1">
                            <option value="all">All Dues</option>
                            <option value="30">Older than 30 days</option>
                            <option value="60">Older than 60 days</option>
                            <option value="90">Older than 90 days</option>
                            <option value="custom">Custom</option>
                        </select>
                    </div>
                    {duesAgeFilter === 'custom' && (
                        <div className="md:col-span-2">
                            <label htmlFor="custom-dues-age" className="block text-sm font-medium text-gray-700">Custom Older Than (days)</label>
                            <input
                                id="custom-dues-age"
                                type="number"
                                value={customDuesAge}
                                onChange={(e) => setCustomDuesAge(e.target.value)}
                                placeholder="e.g., 45"
                                className="w-full p-2 border rounded-lg mt-1"
                            />
                        </div>
                    )}
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={clearDuesFilters} variant="secondary" className="bg-purple-200 text-primary hover:bg-purple-300">
                        <XCircle className="w-4 h-4 mr-2" /> Clear Filters
                    </Button>
                </div>
            </Card>

            <Card>
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <h2 className="text-lg font-bold text-primary mb-2 sm:mb-0">Dues Report</h2>
                    <div className="flex gap-2">
                        <Button onClick={generateDuesPDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                        <Button onClick={generateDuesCSV} variant="secondary" className="bg-purple-200 text-primary hover:bg-purple-300"><Download className="w-4 h-4 mr-2" /> CSV</Button>
                    </div>
                </div>
                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2">Name</th>
                                <th className="p-2">Area</th>
                                <th className="p-2 text-right">Due Amount</th>
                                <th className="p-2">Last Paid Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerDues.length > 0 ? customerDues.map(c => (
                                <tr key={c.id} className="border-b">
                                    <td className="p-2 font-semibold">{c.name}</td>
                                    <td className="p-2">{c.area}</td>
                                    <td className="p-2 text-right font-bold text-red-600">₹{c.dueAmount.toLocaleString('en-IN')}</td>
                                    <td className="p-2">{c.lastPaidDate || 'N/A'}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={4} className="text-center p-4 text-gray-500">No dues found for the selected filters.</td></tr>
                            )}
                        </tbody>
                         <tfoot className="bg-gray-200 font-bold sticky bottom-0">
                            <tr>
                                <td colSpan={2} className="p-2">Total Due</td>
                                <td className="p-2 text-right">₹{totalDuesFiltered.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>

            <Card>
                 <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                    <h2 className="text-lg font-bold text-primary mb-2 sm:mb-0">Customer Account Summary</h2>
                    <div className="flex gap-2">
                        <Button onClick={generateSummaryPDF}><Download className="w-4 h-4 mr-2" /> PDF</Button>
                        <Button onClick={generateSummaryCSV} variant="secondary" className="bg-purple-200 text-primary hover:bg-purple-300"><Download className="w-4 h-4 mr-2" /> CSV</Button>
                    </div>
                </div>
                
                <div className="mt-4 max-h-[60vh] overflow-y-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                            <tr>
                                <th className="p-2">Customer Name</th>
                                <th className="p-2 text-right">Total Sales</th>
                                <th className="p-2 text-right">Total Paid</th>
                                <th className="p-2 text-right">Outstanding Due</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customerAccountSummaries.length > 0 ? customerAccountSummaries.map(c => (
                                <tr key={c.id} className="border-b">
                                    <td className="p-2 font-semibold">{c.name}</td>
                                    <td className="p-2 text-right">₹{c.totalSales.toLocaleString('en-IN')}</td>
                                    <td className="p-2 text-right text-green-600">₹{c.totalPaid.toLocaleString('en-IN')}</td>
                                    <td className={`p-2 text-right font-bold ${c.totalDue > 0.01 ? 'text-red-600' : 'text-gray-700'}`}>
                                        ₹{c.totalDue.toLocaleString('en-IN')}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center p-4 text-gray-500">No customers found.</td>
                                </tr>
                            )}
                        </tbody>
                        <tfoot className="bg-gray-200 font-bold sticky bottom-0">
                             <tr>
                                <td className="p-2">Grand Total</td>
                                <td className="p-2 text-right">₹{summaryGrandTotals.totalSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 text-right">₹{summaryGrandTotals.totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td className="p-2 text-right">₹{summaryGrandTotals.totalDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ReportsPage;
