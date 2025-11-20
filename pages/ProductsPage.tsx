
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Edit, Save, X, Package, IndianRupee, Percent, PackageCheck, Barcode, AlertTriangle, Printer, QrCode } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product, PurchaseItem } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import { BarcodeModal } from '../components/BarcodeModal';
import BatchBarcodeModal from '../components/BatchBarcodeModal';

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
    
    // State for multi-select
    const [isSelectMode, setIsSelectMode] = useState(false);
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [isBatchBarcodeModalOpen, setIsBatchBarcodeModalOpen] = useState(false);
    
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
        } else if (isSelectMode) {
            formIsDirty = selectedProductIds.length > 0;
        }
        
        if (formIsDirty !== isDirtyRef.current) {
            isDirtyRef.current = formIsDirty;
            setIsDirty(formIsDirty);
        }
    }, [selectedProduct, isEditing, newQuantity, editedProduct, setIsDirty, isSelectMode, selectedProductIds]);

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
    
    const toggleSelectMode = () => {
        setIsSelectMode(!isSelectMode);
        setSelectedProductIds([]); // Reset selections when toggling
    };

    const handleProductClick = (product: Product) => {
        if (isSelectMode) {
            setSelectedProductIds(prev => 
                prev.includes(product.id)
                    ? prev.filter(id => id !== product.id)
                    : [...prev, product.id]
            );
        } else {
            setSelectedProduct(product);
        }
    };

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

    const selectedProductsForModal = useMemo((): PurchaseItem[] =>
        state.products
            .filter(p => selectedProductIds.includes(p.id))
            .map(p => ({
                productId: p.id,
                productName: p.name,
                quantity: p.quantity,
                price: p.purchasePrice,
                saleValue: p.salePrice,
                gstPercent: p.gstPercent,
            })),
        [selectedProductIds, state.products]
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
                                <button onClick={() => setIsEditing(false)} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
                                    <X size={20}/>
                                </button>
                            </div>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}><Edit size={16}/> Edit Details</Button>
                        )}
                    </div>
                     {isEditing ? (
                        <div className="space-y-3">
                            <div><label className="text-sm font-medium dark:text-gray-300">Product Name</label><input type="text" name="name" value={editedProduct.name} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-sm font-medium dark:text-gray-300">Sale Price</label><input type="number" name="salePrice" value={editedProduct.salePrice} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                            <div><label className="text-sm font-medium dark:text-gray-300">GST %</label><input type="number" name="gstPercent" value={editedProduct.gstPercent} onChange={handleInputChange} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" /></div>
                        </div>
                    ) : (
                         <div className="space-y-2">
                            <h3 className="text-xl font-bold dark:text-white">{selectedProduct.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Product Code: {selectedProduct.id}</p>
                            <div className="pt-4 space-y-3">
                                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg flex justify-between items-center">
                                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Sale Price</p>
                                    <p className="text-lg font-bold text-green-600 dark:text-green-400">₹{selectedProduct.salePrice.toLocaleString('en-IN')}</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg flex justify-between items-center">
                                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">GST</p>
                                    <p className="text-lg font-bold dark:text-slate-200">{selectedProduct.gstPercent}%</p>
                                </div>
                                <div className="p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg flex justify-between items-center">
                                    <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">Stock on Hand</p>
                                    <p className="text-lg font-bold dark:text-slate-200">{selectedProduct.quantity}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

                <Card title="Stock Adjustment">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Use this to correct the stock count after a physical inventory check.</p>
                    <div className="flex flex-col sm:flex-row gap-2 items-end">
                        <div className="w-full">
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">New Quantity</label>
                             <input type="number" value={newQuantity} onChange={e => setNewQuantity(e.target.value)} className="w-full p-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200" />
                        </div>
                        <Button 
                            type="button"
                            onClick={handleStockAdjustment} 
                            variant="secondary"
                            className="w-full sm:w-auto flex-shrink-0 !text-gray-700 !bg-white hover:!bg-gray-100 dark:!bg-slate-700 dark:!text-slate-200 dark:hover:!bg-slate-600 border border-gray-300 dark:border-slate-600 shadow-sm"
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
        <div>
             {isBatchBarcodeModalOpen && (
                <BatchBarcodeModal
                    isOpen={isBatchBarcodeModalOpen}
                    onClose={() => setIsBatchBarcodeModalOpen(false)}
                    purchaseItems={selectedProductsForModal}
                    businessName={state.profile?.name || 'Your Business'}
                    title="Print Barcode Labels"
                />
             )}
            <div className="sticky top-[-1rem] z-10 bg-background dark:bg-slate-900 py-4 -mx-4 px-4 border-b dark:border-slate-700 mb-4 shadow-sm">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-primary">Products & Inventory</h1>
                        <span className="hidden sm:inline-block text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {isSelectMode ? (
                            <>
                                <Button 
                                    onClick={() => setIsBatchBarcodeModalOpen(true)} 
                                    disabled={selectedProductIds.length === 0}
                                    className="text-xs sm:text-sm px-2 sm:px-4"
                                >
                                    <Printer size={16} className="sm:mr-2" />
                                    <span className="hidden sm:inline">Print Labels ({selectedProductIds.length})</span>
                                </Button>
                                <Button onClick={toggleSelectMode} variant="secondary" className="text-xs sm:text-sm px-2 sm:px-4">
                                    <X size={16} className="sm:mr-2"/>
                                    <span className="hidden sm:inline">Cancel</span>
                                </Button>
                            </>
                        ) : (
                            <Button onClick={toggleSelectMode} className="text-xs sm:text-sm px-2 sm:px-4">
                                <QrCode size={16} className="sm:mr-2"/>
                                <span className="hidden sm:inline">Bulk QR Print</span>
                            </Button>
                        )}
                    </div>
                </div>
                
                <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search products by name or code..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full p-2 pl-10 border rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200"
                        disabled={isSelectMode}
                    />
                </div>
            </div>


            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProducts.map(product => {
                    const isSelected = selectedProductIds.includes(product.id);
                    return (
                        <Card 
                            key={product.id} 
                            className={`cursor-pointer transition-all duration-200 ${isSelected ? 'ring-2 ring-primary shadow-xl scale-[1.02]' : 'hover:shadow-lg'}`} 
                            onClick={() => handleProductClick(product)}
                        >
                            <div className="flex items-start gap-4">
                                {isSelectMode && (
                                    <div className="flex-shrink-0 pt-1">
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            readOnly
                                            className="h-5 w-5 rounded text-primary focus:ring-0 focus:ring-offset-0 border-gray-400 dark:bg-slate-600 dark:border-slate-500 pointer-events-none"
                                        />
                                    </div>
                                )}
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold text-lg text-primary truncate">{product.name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Code: {product.id}</p>
                                    <div className="flex justify-between text-sm">
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Stock: <span className="text-blue-600 dark:text-blue-400 font-bold text-base">{product.quantity}</span></span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">Price: <span className="text-green-600 dark:text-green-400 font-bold text-base">₹{product.salePrice.toLocaleString('en-IN')}</span></span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                })}
                {filteredProducts.length === 0 && <p className="text-gray-500 dark:text-gray-400 md:col-span-2 text-center">No products found.</p>}
            </div>

        </div>
    );
};

export default ProductsPage;
