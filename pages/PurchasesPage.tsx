
import React, { useState } from 'react';
import { Plus, Upload } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Supplier, Product, Purchase, PurchaseItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

// Dummy excel handler. In a real scenario, you'd use a library like 'xlsx'.
const handleExcelImport = (file: File, dispatch: React.Dispatch<any>) => {
    alert("Excel import functionality is a placeholder. In a real app, this would parse the file and add products.");
    // Example logic:
    // const reader = new FileReader();
    // reader.onload = (evt) => {
    //     const data = new Uint8Array(evt.target.result);
    //     const workbook = XLSX.read(data, {type: 'array'});
    //     const sheetName = workbook.SheetNames[0];
    //     const worksheet = workbook.Sheets[sheetName];
    //     const json = XLSX.utils.sheet_to_json(worksheet);
    //     json.forEach((row: any) => {
    //         const newProduct: Product = { ... };
    //         dispatch({ type: 'ADD_PRODUCT', payload: newProduct });
    //     });
    // };
    // reader.readAsArrayBuffer(file);
}


const PurchasesPage: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const [view, setView] = useState<'list' | 'add_supplier' | 'add_purchase'>('list');
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

    // Add Supplier State
    const [newSupplier, setNewSupplier] = useState<Omit<Supplier, 'id'>>({ name: '', phone: '', location: '' });
    
    // Add Purchase State
    const [supplierId, setSupplierId] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([]);
    const [newItem, setNewItem] = useState<{ productId: string, productName: string, quantity: string, price: string, gstPercent: string, saleValue: string }>({ productId: '', productName: '', quantity: '1', price: '', gstPercent: '5', saleValue: '' });

    const handleAddSupplier = () => {
        if (!newSupplier.name || !newSupplier.phone || !newSupplier.location) {
            alert("Please fill all supplier details.");
            return;
        }
        dispatch({ type: 'ADD_SUPPLIER', payload: { ...newSupplier, id: `SUP-${Date.now()}` } });
        setNewSupplier({ name: '', phone: '', location: '' });
        setView('list');
        alert("Supplier added successfully!");
    };

    const handleAddItem = () => {
         if (!newItem.productId || !newItem.productName || !newItem.quantity || !newItem.price || !newItem.saleValue) {
            alert("Please fill all item fields.");
            return;
        }
        setItems([...items, { ...newItem, quantity: parseInt(newItem.quantity), price: parseFloat(newItem.price), gstPercent: parseFloat(newItem.gstPercent), saleValue: parseFloat(newItem.saleValue) }]);
        setNewItem({ productId: '', productName: '', quantity: '1', price: '', gstPercent: '5', saleValue: '' });
    }

    const handleAddPurchase = () => {
        if (!supplierId || items.length === 0) {
            alert("Please select a supplier and add at least one item.");
            return;
        }
        const totalAmount = items.reduce((sum, i) => sum + (i.price * i.quantity), 0);
        const newPurchase: Purchase = {
            id: `PUR-${Date.now()}`,
            supplierId,
            items,
            totalAmount,
            date: new Date().toISOString(),
            isPaid: false
        };
        dispatch({ type: 'ADD_PURCHASE', payload: newPurchase });

        // Add/update products in stock
        items.forEach(item => {
            const product: Product = {
                id: item.productId,
                name: item.productName,
                quantity: item.quantity,
                purchasePrice: item.price,
                salePrice: item.saleValue,
                gstPercent: item.gstPercent
            };
            dispatch({ type: 'ADD_PRODUCT', payload: product });
        });
        
        alert("Purchase added successfully!");
        // Reset form state
        setSupplierId('');
        setItems([]);
        setView('list');
    };
    
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    
    if (selectedSupplier) {
        const supplierPurchases = state.purchases.filter(p => p.supplierId === selectedSupplier.id);
        return (
            <div className="space-y-4">
                <Button onClick={() => setSelectedSupplier(null)}>&larr; Back to Purchases</Button>
                <Card title={`Supplier Details: ${selectedSupplier.name}`}>
                    <p><strong>ID:</strong> {selectedSupplier.id}</p>
                    <p><strong>Phone:</strong> {selectedSupplier.phone}</p>
                    <p><strong>Location:</strong> {selectedSupplier.location}</p>
                </Card>
                <Card title="Purchase History">
                    {supplierPurchases.length > 0 ? (
                        <div className="space-y-4">
                            {supplierPurchases.slice().reverse().map(purchase => (
                                <div key={purchase.id} className="p-3 bg-gray-50 rounded-lg border">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-semibold">{new Date(purchase.date).toLocaleString()}</p>
                                            <p className={`text-sm font-bold ${purchase.isPaid ? 'text-green-600' : 'text-red-600'}`}>
                                                {purchase.isPaid ? 'Paid' : 'Due'}
                                            </p>
                                        </div>
                                        <p className="font-bold text-lg text-primary">
                                            ₹{purchase.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                    <div className="pl-4 mt-2 border-l-2 border-purple-200">
                                        <h4 className="font-semibold text-sm text-gray-700 mb-1">Items Purchased:</h4>
                                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                            {purchase.items.map((item, index) => (
                                                <li key={index}>
                                                    {item.productName} (x{item.quantity}) @ ₹{item.price.toLocaleString('en-IN')} each
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No purchases recorded from this supplier.</p>
                    )}
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-primary">Purchases</h1>
                <div>
                  <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files && handleExcelImport(e.target.files[0], dispatch)} />
                  <Button onClick={() => fileInputRef.current?.click()} className="mr-2" variant="secondary">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Stock
                  </Button>
                </div>
            </div>

            <div className="flex gap-2">
                <Button onClick={() => { setView('add_purchase'); setSelectedSupplier(null); }}><Plus className="w-4 h-4 mr-2" />Add Purchase</Button>
                <Button onClick={() => { setView('add_supplier'); setSelectedSupplier(null); }} variant="secondary"><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
            </div>
            
            {view === 'list' && (
                <Card title="Recent Purchases">
                    {state.purchases.length > 0 ? (
                        <div className="space-y-3">
                            {state.purchases.slice().reverse().map(purchase => {
                                const supplier = state.suppliers.find(s => s.id === purchase.supplierId);
                                return (
                                    <div key={purchase.id} 
                                        className="p-3 bg-gray-50 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                                        onClick={() => {
                                            if (supplier) {
                                                setSelectedSupplier(supplier);
                                            } else {
                                                alert(`Could not find details for supplier ID: ${purchase.supplierId}. The supplier may have been deleted.`);
                                            }
                                        }}
                                    >
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold">{supplier ? supplier.name : 'Unknown Supplier'}</p>
                                                <p className="text-sm text-gray-500">{new Date(purchase.date).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-primary">₹{purchase.totalAmount.toLocaleString('en-IN')}</p>
                                                <p className="text-xs text-gray-400">{purchase.items.length} item(s)</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-gray-500">No purchases recorded yet.</p>
                    )}
                </Card>
            )}

            {view === 'add_supplier' && (
                <Card title="New Supplier">
                    <div className="space-y-2">
                        <input className="w-full p-2 border rounded" placeholder="Supplier Name" value={newSupplier.name} onChange={e => setNewSupplier({...newSupplier, name: e.target.value})} />
                        <input className="w-full p-2 border rounded" placeholder="Phone" value={newSupplier.phone} onChange={e => setNewSupplier({...newSupplier, phone: e.target.value})} />
                        <input className="w-full p-2 border rounded" placeholder="Location" value={newSupplier.location} onChange={e => setNewSupplier({...newSupplier, location: e.target.value})} />
                        <Button onClick={handleAddSupplier} className="w-full">Save Supplier</Button>
                        <Button onClick={() => setView('list')} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </Card>
            )}
            
            {view === 'add_purchase' && (
                <div className="space-y-4">
                     <Card>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                        <select value={supplierId} onChange={e => setSupplierId(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">Select Supplier</option>
                            {state.suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </Card>
                     <Card title="Purchase Items">
                         {items.length > 0 ? (
                            <div className="space-y-2 mb-4">
                                {items.map((item, index) => (
                                    <div key={index} className="p-2 bg-gray-100 rounded text-sm flex justify-between">
                                        <span>{item.productName} (x{item.quantity})</span>
                                        <span>@ ₹{item.price.toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                         ) : null }
                         <div className="pt-4 border-t space-y-3">
                            <h3 className="font-semibold">Add New Item</h3>
                            <input type="text" placeholder="Saree Code / ID" value={newItem.productId} onChange={e => setNewItem({...newItem, productId: e.target.value})} className="w-full p-2 border rounded" />
                            <input type="text" placeholder="Saree Name" value={newItem.productName} onChange={e => setNewItem({...newItem, productName: e.target.value})} className="w-full p-2 border rounded" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="number" placeholder="Quantity" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: e.target.value})} className="w-full p-2 border rounded" />
                                <input type="number" placeholder="Purchase Price" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} className="w-full p-2 border rounded" />
                                <input type="number" placeholder="GST %" value={newItem.gstPercent} onChange={e => setNewItem({...newItem, gstPercent: e.target.value})} className="w-full p-2 border rounded" />
                                <input type="number" placeholder="Sale Price" value={newItem.saleValue} onChange={e => setNewItem({...newItem, saleValue: e.target.value})} className="w-full p-2 border rounded" />
                            </div>
                            <Button onClick={handleAddItem} className="w-full"><Plus className="mr-2" size={16}/>Add Item to Purchase</Button>
                         </div>
                    </Card>
                    <Button onClick={handleAddPurchase} className="w-full" disabled={items.length === 0 || !supplierId}>Complete Purchase</Button>
                    <Button onClick={() => { setView('list'); setSelectedSupplier(null); }} variant="secondary" className="w-full">Cancel</Button>
                </div>
            )}
        </div>
    );
};

export default PurchasesPage;