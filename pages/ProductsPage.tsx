import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit, Save, X, Package, Percent, PackageCheck, Barcode, AlertTriangle, Printer } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { BarcodeModal } from '../components/BarcodeModal';
import { formatINR } from '../utils/currency';

interface ProductsPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const ProductsPage: React.FC<ProductsPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);
    const [newQuantity, setNewQuantity] = useState<string>('');
    const isDirtyRef = useRef(false);
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
    
    useEffect(() => {
        if (state.selection && state.selection.page === 'PRODUCTS') {
            const productToSelect = state.products.find(p => p.id === state.selection.id);
            if (productToSelect) {
                setSelectedProduct(productToSelect);
            }
            dispatch({ type: 'CLEAR_SELECTION' });
        }
    }, [state.selection, state.products, dispatch]);
    
    useEffect(() => {
        let formIsDirty = false;
        if (selectedProduct) {
            const quantityChanged = newQuantity !== '' && parseInt(newQuantity, 10) !== selectedProduct.quantity;
            formIsDirty = isEditing || quantityChanged;
        }
        
        if (formIsDirty !== isDirtyRef.current) {
            isDirtyRef.current = formIsDirty;
            setIsDirty(formIsDirty);
        }
    }, [selectedProduct, isEditing, newQuantity, editedProduct, setIsDirty]);

    // On unmount, we must always clean up.
    useEffect(() => {
        return () => {
            setIsDirty(false);
        };
    }, [setIsDirty]);

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
    }, [selectedProduct?.id, state.products]); // Depend on ID to avoid loop
    
    const handleUpdateProduct = () => {
        if (editedProduct) {
             if (window.confirm('Are you sure you want to update this product\'s details?')) {
                dispatch({ type: 'UPDATE_PRODUCT', payload: editedProduct });
                setIsEditing(false);
                showToast("Product details updated successfully.");
            }
        }
    };

    const handleStockAdjustment = () => {
        if (!selectedProduct || newQuantity === '' || isNaN(parseInt(newQuantity))) {
            showToast('Please enter a valid quantity.', 'info');
            return;
        }
        const newQty = parseInt(newQuantity);
        const change = newQty - selectedProduct.quantity;
        
        if (change === 0) {
            showToast("The new quantity is the same as the current quantity. No changes made.", 'info');
            return;
        }

        if(window.confirm(`This will change the stock from ${selectedProduct.quantity} to ${newQty}. This is for correcting inventory counts and will not affect financial records. Are you sure?`)) {
            dispatch({ type: 'UPDATE_PRODUCT_STOCK', payload: { productId: selectedProduct.id, change } });
            showToast("Stock adjusted successfully.");
        }
    };

    const filteredProducts = state.products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.id.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedProduct && editedProduct) {
        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const { name, value } = e.target;
            const isNumeric = ['salePrice', 'gstPercent'].includes(name);
            setEditedProduct({ ...editedProduct, [name]: isNumeric ? parseFloat(value) || 0 : value });
        };

        return (
            <div className="space-y-4">
                {isDownloadModalOpen && (
                    <BarcodeModal
                        isOpen={isDownloadModalOpen}
                        onClose={() => setIsDownloadModalOpen(false)}
                        product={selectedProduct}
                        businessName={state.profile?.name || 'Your Business'}
                    />
                )}
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
                            <div><label className="text-sm font-medium">GST %</label><input type="number" name="gstPercent" value={editedProduct.gstPercent} onChange={handleInputChange} className="w-full p-2 border rounded" /></div>
                        </div>
                    ) : (
                         <div className="space-y-2">
                            <h3 className="text-xl font-bold">{selectedProduct.name}</h3>
                            <p className="text-sm text-gray-500">Product Code: {selectedProduct.id}</p>
                            <div className="pt-4 space-y-3">
                                <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                    <p className="text-sm font-semibold text-gray-600">Sale Price</p>
                                    <p className="text-lg font-bold text-green-600">{formatINR(selectedProduct.salePrice)}</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
                                    <p className="text-sm font-semibold text-gray-600">GST</p>
                                    <p className="text-lg font-bold">{selectedProduct.gstPercent}%</p>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
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
                        <Button 
                            type="button"
                            onClick={handleStockAdjustment} 
                            variant="secondary"
                            className="w-full sm:w-auto flex-shrink-0 !text-gray-700 !bg-white hover:!bg-gray-100 border border-gray-300 shadow-sm"
                        >
                            Save Adjustment
                        </Button>
                    </div>
                </Card>

                <Button
                    onClick={() => setIsDownloadModalOpen(true)}
                    type="button"
                    className="w-full"
                >
                    <Barcode className="w-5 h-5 mr-2" />
                    Print / Download Labels
                </Button>
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
                             <span className="font-semibold text-gray-700">Price: <span className="text-green-600 font-bold text-base">{formatINR(product.salePrice)}</span></span>
                         </div>
                    </Card>
                ))}
                {filteredProducts.length === 0 && <p className="text-gray-500 md:col-span-2 text-center">No products found.</p>}
            </div>
        </div>
    );
};

export default ProductsPage;
