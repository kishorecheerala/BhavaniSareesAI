import React, { useState, useEffect, useRef } from 'react';
import { Search, Edit, Save, X, Package, IndianRupee, Percent, PackageCheck, Barcode, AlertTriangle } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Product } from '../types';
import Card from '../components/Card';
import Button from '../components/Button';
import jsPDF from 'jspdf';

declare var JsBarcode: any;

interface ProductsPageProps {
  setIsDirty: (isDirty: boolean) => void;
}

const DownloadLabelsModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onDownload: (quantity: number) => void;
    product: Product;
    quantity: string;
    setQuantity: (q: string) => void;
    businessName: string;
}> = ({ isOpen, onClose, onDownload, product, quantity, setQuantity, businessName }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (isOpen && product && barcodeRef.current) {
            try {
                JsBarcode(barcodeRef.current, product.id, {
                    format: "CODE128",
                    displayValue: false,
                    fontSize: 14,
                    height: 40,
                    width: 1.5,
                    margin: 0,
                });
            } catch (e) {
                console.error("JsBarcode render error:", e);
            }
        }
    }, [isOpen, product]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in-fast">
            <Card title="Download Barcode Labels" className="w-full max-w-sm animate-scale-in">
                <div className="space-y-4">
                    <div>
                        <h4 className="text-sm font-semibold mb-2">Label Preview:</h4>
                        <div className="border rounded-md p-2 flex justify-center bg-white">
                            <div style={{
                                width: '2in',
                                height: '1in',
                                fontFamily: `'Helvetica', 'Arial', sans-serif`,
                                boxSizing: 'border-box',
                                color: 'black'
                            }} className="text-center flex flex-col justify-around items-center p-1 bg-white border border-dashed">
                                <div style={{ fontSize: '9px', fontWeight: 'bold', lineHeight: '1' }}>{businessName}</div>
                                <div style={{ fontSize: '12px', fontWeight: 'bold', lineHeight: '1.1', padding: '0 2px', margin: '1px 0' }}>{product.name}</div>
                                <svg ref={barcodeRef} style={{ height: '32px', width: '90%' }}></svg>
                                <div className="flex flex-col items-center" style={{ lineHeight: '1.1', marginTop: '1px' }}>
                                    <div style={{ fontSize: '9px', fontWeight: 'bold' }}>{product.id}</div>
                                    <div style={{ fontSize: '14px', fontWeight: '900' }}>
                                        MRP : ₹{product.salePrice.toLocaleString('en-IN')}
                                    </div>
                                </div>
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
                    <div className="p-3 bg-amber-50 border-l-4 border-amber-400 text-amber-800 flex items-start gap-3">
                        <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0" />
                        <div>
                            <h5 className="font-bold">Important Print Settings</h5>
                            <p className="text-xs mt-1">
                                When printing the downloaded PDF, ensure your printer settings use <strong>'Actual Size'</strong> and the <strong>Paper Size</strong> is set to <strong>2x1 inch</strong>.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                       <Button onClick={() => onDownload(parseInt(quantity, 10) || 1)} className="w-full">Download PDF</Button>
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
    const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
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
        if (isDownloadModalOpen && selectedProduct) {
            setPrintQuantity(selectedProduct.quantity.toString());
        }
    }, [isDownloadModalOpen, selectedProduct]);
    
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

    const handleDownloadPdf = async (product: Product, quantity: number) => {
        setIsDownloadModalOpen(false);
    
        const labelWidth = 50.8; // 2 inches in mm
        const labelHeight = 25.4; // 1 inch in mm
    
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: [labelWidth, labelHeight]
        });
    
        const canvas = document.createElement('canvas');
        try {
            JsBarcode(canvas, product.id, {
                format: "CODE128",
                displayValue: false,
                height: 40,
                width: 1.5,
                margin: 0,
            });
        } catch (e) {
            console.error("JsBarcode error", e);
            showToast("Failed to generate barcode.", 'info');
            return;
        }
        const barcodeDataUrl = canvas.toDataURL('image/png');
    
        for (let i = 0; i < quantity; i++) {
            if (i > 0) {
                doc.addPage();
            }
    
            const margin = 1.5;
            const centerX = labelWidth / 2;
            let currentY = margin;
    
            // --- Top-down elements ---
    
            // 1. Business Name
            const businessName = state.profile?.name || 'Your Business';
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            doc.text(businessName, centerX, currentY, { align: 'center', baseline: 'top' });
            currentY += doc.getTextDimensions(businessName).h + 0.5; // Add 0.5mm padding
    
            // 2. Product Name
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            const nameLines = doc.splitTextToSize(product.name, labelWidth - (margin * 2));
            const nameDimensions = doc.getTextDimensions(nameLines);
            doc.text(nameLines, centerX, currentY, { align: 'center', baseline: 'top' });
            currentY += nameDimensions.h + 0.5; // Add 0.5mm padding
    
            // --- Bottom-up elements ---
            let bottomY = labelHeight - margin;
            
            // 4a. MRP
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            const mrpText = `MRP : ₹${product.salePrice.toLocaleString('en-IN')}`;
            const mrpDimensions = doc.getTextDimensions(mrpText);
            doc.text(mrpText, centerX, bottomY, { align: 'center', baseline: 'bottom' });
            bottomY -= mrpDimensions.h;
    
            // 4b. Product ID
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7);
            const productIdText = product.id;
            const productIdDimensions = doc.getTextDimensions(productIdText);
            doc.text(productIdText, centerX, bottomY, { align: 'center', baseline: 'bottom' });
    
            const bottomBlockTop = bottomY - productIdDimensions.h;
    
            // 3. Barcode - placed in the remaining middle space
            const barcodeTop = currentY;
            const availableHeightForBarcode = bottomBlockTop - barcodeTop;
            
            if (availableHeightForBarcode > 3) { // Minimum 3mm space
                const aspectRatio = canvas.width / canvas.height;
                let barcodeHeight = availableHeightForBarcode - 1; // Use available space with 1mm total padding
                let barcodeWidth = barcodeHeight * aspectRatio;
                
                const maxBarcodeWidth = labelWidth - (margin * 4);
                if (barcodeWidth > maxBarcodeWidth) {
                    barcodeWidth = maxBarcodeWidth;
                    barcodeHeight = barcodeWidth / aspectRatio;
                }
    
                const barcodeX = (labelWidth - barcodeWidth) / 2;
                const barcodeY = barcodeTop + (availableHeightForBarcode - barcodeHeight) / 2; // Center vertically
                
                doc.addImage(barcodeDataUrl, 'PNG', barcodeX, barcodeY, barcodeWidth, barcodeHeight);
            } else {
                console.warn("Not enough space for barcode on the label.");
            }
        }
    
        doc.save(`${product.id}-labels.pdf`);
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
                <DownloadLabelsModal
                    isOpen={isDownloadModalOpen}
                    onClose={() => setIsDownloadModalOpen(false)}
                    product={selectedProduct}
                    onDownload={(quantity) => handleDownloadPdf(selectedProduct, quantity)}
                    quantity={printQuantity}
                    setQuantity={setPrintQuantity}
                    businessName={state.profile?.name || 'Your Business'}
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
                    onClick={() => setIsDownloadModalOpen(true)}
                    type="button"
                    className="w-full"
                >
                    <Barcode className="w-5 h-5 mr-2" />
                    Download Barcode PDF
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