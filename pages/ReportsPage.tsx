import React, { useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const ReportsPage: React.FC = () => {
    const { state } = useAppContext();
    const [selectedArea, setSelectedArea] = useState<string>('');

    // Fix: Explicitly cast the initial value for the reduce function to ensure
    // correct type inference for the accumulator. This prevents cascading 'unknown'
    // type errors in subsequent operations.
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

    // FIX: Add explicit type for `customerDuesArray`. `Object.values` on an
    // object with a string index signature returns `unknown[]`, so we need to
    // provide the correct type to ensure type safety downstream.
    const customerDuesArray: (Customer & { totalDue: number })[] = Object.values(customerDues);

    const filteredDues = selectedArea 
        ? customerDuesArray.filter(c => c.area.toLowerCase() === selectedArea.toLowerCase())
        : customerDuesArray;

    const uniqueAreas = [...new Set(state.customers.map(c => c.area))];

    const generatePDF = () => {
        alert("PDF generation is a placeholder. A library like jsPDF would be used here.");
    };
    
    const generateExcel = () => {
        alert("Excel export is a placeholder. A library like SheetJS (xlsx) would be used here.");
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
                    <Button onClick={generateExcel} variant="secondary" className="w-full sm:w-auto"><Download className="w-4 h-4 mr-2" />Export Excel</Button>
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
