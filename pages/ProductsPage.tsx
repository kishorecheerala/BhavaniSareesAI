import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit, Save, X, Package, IndianRupee, Percent, PackageCheck, Barcode } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';

declare var JsBarcode: any;

interface ProductsPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const PrintModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onPrint: (quantity: number) => void;
    product: Product;
    quantity: string;
    setQuantity: (q: string) => void;
}> = ({ isOpen, onClose, onPrint, product, quantity, setQuantity }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (isOpen && product && barcodeRef.current) {
            try {
                JsBarcode(barcodeRef.current, product.id, {
                    format: "CODE128", displayValue: true, fontSize: 10,
                    height: 20, margin: 0
                });
            } catch (e) {
                console.error("JsBarcode render error:", e);
            }
        }
    }, [isOpen, product]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Print Barcode Labels" className="w-full max-w-sm animate-scale-in">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Label Preview:</h4>
                        <div className="border rounded-md p-2 flex justify-center bg-white">
                            <div style={{ width: '1.9in', height: '0.9in', fontFamily: 'sans-serif', boxSizing: 'border-box', padding: '0.02in' }} className="text-center flex flex-col justify-center items-center border border-dashed">
                                <div style={{ fontSize: '8px', fontWeight: 'bold', marginBottom: '1px' }}>Bhavani Sarees</div>
                                <div style={{ fontSize: '9px', margin: '1px 0', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '1.8in' }}>{product.name}</div>
                                <svg ref={barcodeRef} style={{ height: '20px', width: '100%' }}></svg>
                                <div style={{ fontSize: '10px', fontWeight: 'bold', marginTop: '1px' }}>MRP: ₹{product.salePrice.toLocaleString('en-IN')}</div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Number of copies</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full p-2 border rounded mt-1"
                            min="1"
                            autoFocus
                        />
                    </div>
                    <p className="text-xs text-gray-500">
                        Ensure your TSC printer and correct label size (e.g., 2x1 inch) are selected in the print dialog.
                    </p>
                    <div className="flex gap-2">
                       <Button onClick={() => onPrint(parseInt(quantity, 10) || 1)} className="w-full">Print</Button>
                       <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};


const ProductsPage: React.FC<ProductsPageProps> = ({ setIsDirty }) => {
    const { state, dispatch, showToast } = useAppContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProduct, setEditedProduct] = useState<Product | null>(null);
    const [newQuantity, setNewQuantity] = useState<string>('');
    const isDirtyRef = useRef(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printQuantity, setPrintQuantity] = useState('1');
    
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

    useEffect(() => {
        if (isPrintModalOpen && selectedProduct) {
            setPrintQuantity(selectedProduct.quantity.toString());
        }
    }, [isPrintModalOpen, selectedProduct]);
    
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

    const handlePrint = (product: Product, quantity: number) => {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        let labelsHtml = '';
        for (let i = 0; i < quantity; i++) {
            labelsHtml += `
                <div class="label">
                    <div class="business-name">Bhavani Sarees</div>
                    <div class="product-name">${product.name}</div>
                    <svg id="barcode-${i}"></svg>
                    <div class="price">MRP: ₹${product.salePrice.toLocaleString('en-IN')}</div>
                </div>
            `;
        }

        const fullHtml = `
            <html><head><title>Print Labels</title>
            <style>
                @page { size: 2in 1in; margin: 0; }
                body { margin: 0; padding: 0; font-family: sans-serif; }
                .label {
                    width: 1.9in; height: 0.9in;
                    padding: 0.02in;
                    text-align: center;
                    display: flex; flex-direction: column;
                    justify-content: center; align-items: center;
                    box-sizing: border-box;
                    page-break-after: always;
                    overflow: hidden;
                }
                .business-name { font-size: 8px; font-weight: bold; margin-bottom: 1px; }
                .product-name { font-size: 9px; margin: 1px 0; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 1.8in; }
                .price { font-size: 10px; font-weight: bold; margin-top: 1px; }
                svg { height: 20px; width: 100%; }
            </style>
            </head><body>${labelsHtml}</body></html>
        `;
        
        iframe.onload = () => {
            const iframeDoc = iframe.contentWindow!.document;
            for (let i = 0; i < quantity; i++) {
                const barcodeElement = iframeDoc.getElementById(`barcode-${i}`);
                if (barcodeElement) {
                    try {
                        JsBarcode(barcodeElement, product.id, {
                            format: "CODE128", displayValue: true, fontSize: 10,
                            height: 20, margin: 0
                        });
                    } catch (e) {
                        console.error('Error rendering barcode in iframe:', e);
                    }
                }
            }
    
            // Give the browser a moment to render the SVGs before printing
            setTimeout(() => {
                iframe.contentWindow!.focus();
                iframe.contentWindow!.print();
                // Clean up after a short delay
                setTimeout(() => {
                    if (document.body.contains(iframe)) {
                      document.body.removeChild(iframe);
                    }
                    setIsPrintModalOpen(false);
                }, 500);
            }, 250);
        };

        // Setting srcdoc will trigger the onload event
        iframe.srcdoc = fullHtml;
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
                <PrintModal
                    isOpen={isPrintModalOpen}
                    onClose={() => setIsPrintModalOpen(false)}
                    product={selectedProduct}
                    onPrint={(quantity) => handlePrint(selectedProduct, quantity)}
                    quantity={printQuantity}
                    setQuantity={setPrintQuantity}
                />
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
                    onClick={() => setIsPrintModalOpen(true)}
                    type="button"
                    className="w-full"
                >
                    <Barcode className="w-5 h-5 mr-2" />
                    Print Barcode Label
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h1 className="text-2xl font-bold text-primary">Products & Inventory</h1>
            
            <div className="relative">
                <Search className="absolute left-3 top-1-2 -translate-y-1/2 text-gray-400" size={20} />
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