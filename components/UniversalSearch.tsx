import React, { useState, useEffect, useMemo } from 'react';
import { Search, X, User, Package, Boxes, ShoppingCart } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Page } from '../App';
import { Customer, Supplier, Product, Sale, Purchase } from '../types';

interface SearchResults {
    customers: Customer[];
    suppliers: Supplier[];
    products: Product[];
    sales: Sale[];
    purchases: Purchase[];
}

interface UniversalSearchProps {
    isOpen: boolean;
    onClose: () => void;
    onNavigate: (page: Page, id: string) => void;
}

const UniversalSearch: React.FC<UniversalSearchProps> = ({ isOpen, onClose, onNavigate }) => {
    const { state } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<SearchResults>({ customers: [], suppliers: [], products: [], sales: [], purchases: [] });

    useEffect(() => {
        const handler = setTimeout(() => {
            if (searchTerm.length < 2) {
                setResults({ customers: [], suppliers: [], products: [], sales: [], purchases: [] });
                return;
            }

            const term = searchTerm.toLowerCase();

            const customers = state.customers.filter(c =>
                c.name.toLowerCase().includes(term) ||
                c.phone.includes(term) ||
                c.address.toLowerCase().includes(term) ||
                c.area.toLowerCase().includes(term) ||
                c.id.toLowerCase().includes(term)
            );

            const suppliers = state.suppliers.filter(s =>
                s.name.toLowerCase().includes(term) ||
                s.phone.includes(term) ||
                s.location.toLowerCase().includes(term) ||
                s.id.toLowerCase().includes(term)
            );

            const products = state.products.filter(p =>
                p.name.toLowerCase().includes(term) ||
                p.id.toLowerCase().includes(term)
            );

            const sales = state.sales.filter(s =>
                s.id.toLowerCase().includes(term)
            );

            const purchases = state.purchases.filter(p =>
                p.id.toLowerCase().includes(term) ||
                p.supplierInvoiceId?.toLowerCase().includes(term)
            );

            setResults({ customers, suppliers, products, sales, purchases });

        }, 250); // Debounce search

        return () => clearTimeout(handler);
    }, [searchTerm, state]);
    
    useEffect(() => {
        // Reset search term when modal is closed
        if (!isOpen) {
            setSearchTerm('');
        }
    }, [isOpen]);

    const hasResults = useMemo(() => Object.values(results).some(arr => Array.isArray(arr) && arr.length > 0), [results]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-background z-[100] flex flex-col p-4 animate-fade-in-fast" role="dialog" aria-modal="true">
            <div className="flex items-center gap-4 mb-4">
                <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="search"
                        placeholder="Search for anything..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-3 pl-10 text-lg border-2 border-primary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                        autoComplete="off"
                    />
                </div>
                <button onClick={onClose} className="p-3 rounded-full text-primary bg-purple-100 hover:bg-purple-200 transition-colors">
                    <X size={24} />
                </button>
            </div>

            <div className="flex-grow overflow-y-auto pb-20">
                {searchTerm.length < 2 ? (
                    <div className="text-center text-gray-500 pt-10">
                        <p>Enter at least 2 characters to search.</p>
                    </div>
                ) : hasResults ? (
                    <div className="space-y-6">
                        {results.customers.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase text-purple-700 mb-2">Customers</h2>
                                <div className="space-y-2">
                                    {results.customers.map(c => (
                                        <div key={c.id} onClick={() => onNavigate('CUSTOMERS', c.id)} className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-purple-50 flex items-center gap-3">
                                            <User className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="font-semibold">{c.name}</p>
                                                <p className="text-xs text-gray-500">{c.phone} &middot; {c.area}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        {results.suppliers.length > 0 && (
                             <section>
                                <h2 className="text-sm font-bold uppercase text-purple-700 mb-2">Suppliers</h2>
                                <div className="space-y-2">
                                    {results.suppliers.map(s => (
                                        <div key={s.id} onClick={() => onNavigate('PURCHASES', s.id)} className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-purple-50 flex items-center gap-3">
                                            <Package className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="font-semibold">{s.name}</p>
                                                <p className="text-xs text-gray-500">{s.phone} &middot; {s.location}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        {results.products.length > 0 && (
                            <section>
                                <h2 className="text-sm font-bold uppercase text-purple-700 mb-2">Products</h2>
                                <div className="space-y-2">
                                    {results.products.map(p => (
                                        <div key={p.id} onClick={() => onNavigate('PRODUCTS', p.id)} className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-purple-50 flex items-center gap-3">
                                            <Boxes className="w-5 h-5 text-primary" />
                                            <div>
                                                <p className="font-semibold">{p.name}</p>
                                                <p className="text-xs text-gray-500">Code: {p.id} &middot; Stock: {p.quantity}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                         {results.sales.length > 0 && (
                             <section>
                                <h2 className="text-sm font-bold uppercase text-purple-700 mb-2">Sale Invoices</h2>
                                <div className="space-y-2">
                                    {results.sales.map(s => {
                                        const customer = state.customers.find(c => c.id === s.customerId);
                                        return (
                                            <div key={s.id} onClick={() => onNavigate('CUSTOMERS', s.customerId)} className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-purple-50 flex items-center gap-3">
                                                <ShoppingCart className="w-5 h-5 text-primary" />
                                                <div>
                                                    <p className="font-semibold">To: {customer?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">ID: {s.id} &middot; {new Date(s.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}
                        {results.purchases.length > 0 && (
                             <section>
                                <h2 className="text-sm font-bold uppercase text-purple-700 mb-2">Purchase Invoices</h2>
                                <div className="space-y-2">
                                    {results.purchases.map(p => {
                                        const supplier = state.suppliers.find(s => s.id === p.supplierId);
                                        return (
                                            <div key={p.id} onClick={() => onNavigate('PURCHASES', p.supplierId)} className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-purple-50 flex items-center gap-3">
                                                <Package className="w-5 h-5 text-primary" />
                                                <div>
                                                    <p className="font-semibold">From: {supplier?.name || 'Unknown'}</p>
                                                    <p className="text-xs text-gray-500">ID: {p.id} &middot; {new Date(p.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </section>
                        )}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 pt-10">
                        <p>No results found for "{searchTerm}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UniversalSearch;