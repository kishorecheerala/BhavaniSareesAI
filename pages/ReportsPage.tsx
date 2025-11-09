import React, { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReportsPage: React.FC = () => {
    const { state } = useAppContext();
    const [selectedArea, setSelectedArea] = useState<string>('');

    const customerDues = state.sales
        .filter(sale => !sale.isPaid)
        .reduce((acc, sale) => {
            const customer = state.customers.find(c => c.id === sale.customerId);
            if (customer) {
                if (!acc[customer.id]) {
                    acc[customer.id] = { ...customer, totalDue: 0 };
                }
                acc[customer.id].totalDue += sale.totalAmount;
            }
            return acc;
        }, {} as {[key: string]: Customer & { totalDue: number } });

    const customerDuesArray: (Customer & { totalDue: number })[] = Object.values(customerDues);

    const filteredDues = selectedArea 
        ? customerDuesArray.filter(c => c.area.toLowerCase() === selectedArea.toLowerCase())
        : customerDuesArray;

    const uniqueAreas = [...new Set(state.customers.map(c => c.area))];

    const generatePDF = () => {
        if (filteredDues.length === 0) {
            alert("No data to export.");
            return;
        }
        const doc = new jsPDF();
        const date = new Date().toLocaleDateString();
        doc.setFontSize(18);
        doc.text('Customer Dues Report', 14, 22);
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Generated on: ${date}`, 14, 28);
        if(selectedArea) {
            doc.text(`Filtered by Area: ${selectedArea}`, 14, 34);
        }

        autoTable(doc, {
            startY: 40,
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
            alert("No data to export.");
            return;
        }
        // Use quotes to handle potential commas in string fields
        const escapeCsvCell = (cell: any) => `"${String(cell).replace(/"/g, '""')}"`;

        const headers = ['Name', 'Phone', 'Area', 'Due Amount'];
        const rows = filteredDues.map(c => 
            [
                escapeCsvCell(c.name),
                escapeCsvCell(c.phone),
                escapeCsvCell(c.area),
                c.totalDue // No quotes for numbers
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
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-grow">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <select
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            className="w-full p-2 pl-10 border rounded-lg"
                        >
                            <option value="">All Areas</option>
                            {uniqueAreas.map(area => <option key={area} value={area}>{area}</option>)}
                        </select>
                    </div>
                    <Button onClick={generatePDF} className="w-full sm:w-auto"><Download className="w-4 h-4 mr-2" />Export PDF</Button>
                    <Button onClick={generateCSV} variant="secondary" className="w-full sm:w-auto"><Download className="w-4 h-4 mr-2" />Export CSV</Button>
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
                            {filteredDues.map(customer => (
                                <tr key={customer.id} className="border-b">
                                    <td className="p-2 font-medium">{customer.name}</td>
                                    <td className="p-2">{customer.phone}</td>
                                    <td className="p-2">{customer.area}</td>
                                    <td className="p-2 text-right font-semibold text-red-600">₹{customer.totalDue.toLocaleString('en-IN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default ReportsPage;