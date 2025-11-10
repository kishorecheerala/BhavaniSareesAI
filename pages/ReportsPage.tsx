import React, { useState } from 'react';
import { Download, Filter, XCircle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportsPage: React.FC = () => {
    const { state } = useAppContext();
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

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

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary">Reports</h1>
            
            <Card title="Customer Dues Collection List">
                <div className="flex flex-col gap-4 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <label htmlFor="areaFilter" className="block text-sm font-medium text-gray-700 mb-1">Filter by Area</label>
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
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={generatePDF} className="w-full sm:w-auto"><Download className="w-4 h-4 mr-2" />Export PDF</Button>
                        <Button onClick={generateCSV} variant="secondary" className="w-full sm:w-auto"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
                        <Button onClick={handleClearFilters} variant="danger" className="w-full sm:w-auto sm:ml-auto"><XCircle className="w-4 h-4 mr-2" />Clear Filters</Button>
                    </div>
                </div>
                
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
        </div>
    );
};

export default ReportsPage;