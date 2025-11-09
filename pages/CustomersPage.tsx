
import React, { useState } from 'react';
import { Plus, User, Phone, MapPin, Search } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Customer } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

const CustomersPage: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [newCustomer, setNewCustomer] = useState<Omit<Customer, 'id'>>({ name: '', phone: '', address: '', area: '', reference: '' });
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

    const handleAddCustomer = () => {
        if (newCustomer.name && newCustomer.phone && newCustomer.address && newCustomer.area) {
            const customerWithId: Customer = { ...newCustomer, id: `CUST-${Date.now()}` };
            dispatch({ type: 'ADD_CUSTOMER', payload: customerWithId });
            setNewCustomer({ name: '', phone: '', address: '', area: '', reference: '' });
            setIsAdding(false);
        } else {
            alert('Please fill all required fields.');
        }
    };

    const filteredCustomers = state.customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        c.area.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (selectedCustomer) {
        // Detailed View
        const customerSales = state.sales.filter(s => s.customerId === selectedCustomer.id);
        
        return (
            <div className="space-y-4">
                <Button onClick={() => setSelectedCustomer(null)}>&larr; Back to List</Button>
                <Card title={`Customer Details: ${selectedCustomer.name}`}>
                    <p><strong>ID:</strong> {selectedCustomer.id}</p>
                    <p><strong>Phone:</strong> {selectedCustomer.phone}</p>
                    <p><strong>Address:</strong> {selectedCustomer.address}</p>
                    <p><strong>Area:</strong> {selectedCustomer.area}</p>
                    {selectedCustomer.reference && <p><strong>Reference:</strong> {selectedCustomer.reference}</p>}
                </Card>
                <Card title="Sales History">
                    {customerSales.length > 0 ? (
                        <div className="space-y-4">
                            {customerSales.slice().reverse().map(sale => (
                                <div key={sale.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">{new Date(sale.date).toLocaleString()}</p>
                                            <p className={`text-sm font-bold ${sale.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                {sale.isPaid ? 'Paid' : 'Due'}
                                            </p>
                                        </div>
                                        <p className="font-bold text-lg text-primary">
                                            ₹{sale.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="pl-4 mt-2 border-l-2 border-purple-200">
                                        <h4 className="font-semibold text-sm text-gray-700 mb-1">Items Purchased:</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {sale.items.map((item, index) => (
                                                <li key={index}>
                                                    {item.productName} (x{item.quantity}) @ ₹{item.price.toLocaleString('en-IN')} each
                                                </li>
                                            ))}
                                        </ul>
                                        {sale.discount > 0 && (
                                            <p className="text-sm text-gray-600 mt-2">
                                                Discount: -₹{sale.discount.toLocaleString('en-IN')}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No sales recorded for this customer.</p>
                    )}
                </Card>
                 <Card title="Returns History">
                    {/* Return table to be implemented */}
                    <p className="text-gray-500">Return details will be shown here.</p>
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
                <Card title="New Customer Form">
                    <div className="space-y-4">
                        <input type="text" placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Address" value={newCustomer.address} onChange={e => setNewCustomer({ ...newCustomer, address: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Area/Location" value={newCustomer.area} onChange={e => setNewCustomer({ ...newCustomer, area: e.target.value })} className="w-full p-2 border rounded" />
                        <input type="text" placeholder="Reference (Optional)" value={newCustomer.reference} onChange={e => setNewCustomer({ ...newCustomer, reference: e.target.value })} className="w-full p-2 border rounded" />
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
                    className="w-full p-2 pl-10 border rounded-lg"
                />
            </div>

            <div className="space-y-3">
                {filteredCustomers.map(customer => (
                    <Card key={customer.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedCustomer(customer)}>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-lg text-primary flex items-center gap-2"><User size={16}/> {customer.name}</p>
                                <p className="text-sm text-gray-600 flex items-center gap-2"><Phone size={14}/> {customer.phone}</p>
                                <p className="text-sm text-gray-500 flex items-center gap-2"><MapPin size={14}/> {customer.area}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-gray-500">&rarr;</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
};

export default CustomersPage;
