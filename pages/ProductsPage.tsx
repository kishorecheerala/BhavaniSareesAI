import React, { useState, useEffect } from 'react';
import { Search, Edit, Save, X, Package, IndianRupee, Percent, PackageCheck } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

interface ProductsPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ setIsDirty }) => {
    const { state, dispatch } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);
    const [newQuantity, setNewQuantity] = useState<string>('');
    
    useEffect(() => {
        let formIsDirty = false;
        if (selectedProduct) {
            const quantityChanged = newQuantity !== '' && parseInt(newQuantity, 10) !== selectedProduct.quantity;
            formIsDirty = isEditing || quantityChanged;
        }
        setIsDirty(formIsDirty);
        
        return () => {
            setIsDirty(false);
        };
    }, [selectedProduct, isEditing, newQuantity, setIsDirty]);

    useEffect(() => {
        if (selectedProduct) {
            const currentProduct = state.products.find(p => p.id === selectedProduct.id);
            setSelectedProduct(currentProduct || null);
            setEditedProduct(currentProduct || null);
            setNewQuantity(currentProduct ? currentProduct.quantity.toString() : '');
        } else {
            setEditedProduct(null);
        }
        setIsEditing(false);
    }, [selectedProduct, state.products]);


    const handleUpdateProduct = () => {
        if (editedProduct) {
             if (window.confirm('Are you sure you want to update this product\'s details?')) {
                dispatch({ type: 'UPDATE_PRODUCT', payload: editedProduct });
                setSelectedProduct(editedProduct);
                setIsEditing(false);
                alert("Product details updated successfully.");
            }
        }
    };

    const handleStockAdjustment = () => {
        if (!selectedProduct || newQuantity === '' || isNaN(parseInt(newQuantity))) {
            alert('Please enter a valid quantity.');
            return;
        }
        const newQty = parseInt(newQuantity);
        const change = newQty - selectedProduct.quantity;
        
        if (change === 0) {
            alert("The new quantity is the same as the current quantity. No changes made.");
            return;
        }

        if(window.confirm(`This will change the stock from ${selectedProduct.quantity} to ${newQty}. This is for correcting inventory counts and will not affect financial records. Are you sure?`)) {
            dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: selectedProduct.id, change } });
            alert("Stock adjusted successfully.");
        }
    };
    
    const filteredProducts = state.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedProduct && editedProduct) {
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            const isNumeric = ['salePrice', 'purchasePrice', 'gstPercent'].includes(name);
            setEditedProduct({ ...editedProduct, [name]: isNumeric ? parseFloat(value) || 0 : value });
        };

        return (
            <div className="space-y-4">
                <Button onClick={() => setSelectedProduct(null)}>&larr; Back to Products List</Button>
                
                <Card>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-primary">Product Details</h2>
                        {isEditing ? (
                            <div className="flex gap-2 items-center">
                                <Button onClick={handleUpdateProduct} className="h-9 px-3"><Save size={16} /> Save</Button>
                                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                                    <X size={20}/>
                                </button>
                            </div>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit Details</Button>
                        )}
                    </div>
                     {isEditing ? (
                        <div className="space-y-3">
                            <div><label className="text-sm font-medium">Product Name</label><input type="text" name="name" value={editedProduct.name} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Sale Price</label><input type="number" name="salePrice" value={editedProduct.salePrice} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">Purchase Price</label><input type="number" name="purchasePrice" value={editedProduct.purchasePrice} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                            <div><label className="text-sm font-medium">GST %</label><input type="number" name="gstPercent" value={editedProduct.gstPercent} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
                            <p className="text-sm text-gray-500">Product Code: {selectedProduct.id}</p>
                            <div className="grid grid-cols-2 gap-4 pt-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-600">Sale Price</p>
                                    <p className="text-lg font-bold text-green-600">₹{selectedProduct.salePrice.toLocaleString('en-IN')}</p>
                                </div>
                                 <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-600">Purchase Price</p>
                                    <p className="text-lg font-bold text-orange-600">₹{selectedProduct.purchasePrice.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-600">GST</p>
                                    <p className="text-lg font-bold">{selectedProduct.gstPercent}%</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="text-sm font-semibold text-gray-600">Stock on Hand</p>
                                    <p className="text-lg font-bold">{selectedProduct.quantity}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                 <Card title="Stock Adjustment">
                    <p className="text-sm text-gray-600 mb-2">Use this to correct the stock count after a physical inventory check.</p>
                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                        <div className="w-full">
                             <label className="block text-sm font-medium text-gray-700">New Quantity</label>
                             <input type="number" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} className="w-full p-2 border rounded" />
                        </div>
                        <Button onClick={handleStockAdjustment} className="w-full sm:w-auto flex-shrink-0">
                            <PackageCheck size={16} className="mr-2"/>
                            Save Adjustment
                        </Button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary">Products & Inventory</h1>
            
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                    type="text"
                    placeholder="Search products by name or code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full p-2 pl-10 border rounded-lg"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map(product => (
                    <Card key={product.id} className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSelectedProduct(product)}>
                         <p className="font-bold text-lg text-primary">{product.name}</p>
                         <p className="text-sm text-gray-500 mb-2">Code: {product.id}</p>
                         <div className="flex justify-between text-sm">
                             <span className="font-semibold text-gray-700">Stock: <span className="text-blue-600 font-bold text-base">{product.quantity}</span></span>
                             <span className="font-semibold text-gray-700">Price: <span className="text-green-600 font-bold text-base">₹{product.salePrice.toLocaleString('en-IN')}</span></span>
                         </div>
                    </Card>
                ))}
                {filteredProducts.length === 0 && <p className="text-gray-500 md:col-span-2 text-center">No products found.</p>}
            </div>
        </div>
    );
};

export default ProductsPage;