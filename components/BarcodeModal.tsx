import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import JsBarcode from 'jsbarcode';
import Card from './Card';
import Button from './Button';
import { X, Download, Printer } from 'lucide-react';

interface BarcodeModalProps {
  isOpen: boolean;
  product: {
    id: string;
    name: string;
    salePrice: number;
    quantity: number;
  };
  onClose: () => void;
  businessName: string;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({ isOpen, product, onClose, businessName }) => {
  const [numberOfCopies, setNumberOfCopies] = useState(1);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && product) {
        setNumberOfCopies(product.quantity || 0); // Default to current stock
        handleGeneratePreview();
    }
  }, [isOpen, product]);

  const handleGeneratePreview = () => {
    if (!previewCanvasRef.current) return;

    try {
      JsBarcode(previewCanvasRef.current, product.id, {
        format: 'CODE128',
        width: 1.5,
        height: 40,
        displayValue: true,
        fontSize: 10,
        margin: 5,
      });
    } catch (error) {
      console.error('Barcode generation failed:', error);
    }
  };

  const generateLabelCanvas = (): HTMLCanvasElement => {
    const labelCanvas = document.createElement('canvas');
    const dpiScale = 2; // Increase resolution for better print quality
    labelCanvas.width = 300 * dpiScale; // 600px for a 2-inch label @ 300 DPI
    labelCanvas.height = 150 * dpiScale; // 300px for a 1-inch label @ 300 DPI

    const ctx = labelCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    // Set white background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, labelCanvas.width, labelCanvas.height);

    // Add Business Name
    ctx.font = `bold ${10 * dpiScale}px Arial`;
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.fillText(businessName, 150 * dpiScale, 15 * dpiScale);

    // Generate barcode on temporary canvas
    const barcodeCanvas = document.createElement('canvas');
    JsBarcode(barcodeCanvas, product.id, {
      format: 'CODE128',
      width: 2 * dpiScale,
      height: 80 * dpiScale,
      displayValue: true,
      fontSize: 14 * dpiScale,
      margin: 10 * dpiScale,
    });
    // Draw barcode onto label canvas
    ctx.drawImage(barcodeCanvas, (labelCanvas.width - (280 * dpiScale))/2, 25 * dpiScale, 280 * dpiScale, 70 * dpiScale);

    // Add product name
    ctx.font = `bold ${10 * dpiScale}px Arial`;
    const productText = product.name.substring(0, 25);
    ctx.fillText(productText, 150 * dpiScale, 115 * dpiScale);

    // Add MRP
    ctx.font = `bold ${12 * dpiScale}px Arial`;
    ctx.fillText(`MRP: ₹${product.salePrice.toLocaleString('en-IN')}`, 150 * dpiScale, 135 * dpiScale);

    return labelCanvas;
  }

  const handleDownloadPDF = async () => {
    if (numberOfCopies <= 0) {
      alert("Please enter a number of copies greater than 0.");
      return;
    }
    try {
      const doc = new jsPDF({
        orientation: 'landscape', // Correct orientation for 2x1 label
        unit: 'mm',
        format: [50.8, 25.4], // 2x1 inch
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 1;

      for (let copy = 0; copy < numberOfCopies; copy++) {
        if (copy > 0) doc.addPage();
        
        const labelCanvas = generateLabelCanvas();
        const imageData = labelCanvas.toDataURL('image/png');
        
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (imgWidth * labelCanvas.height) / labelCanvas.width;
        const yPosition = (doc.internal.pageSize.getHeight() - imgHeight) / 2;

        doc.addImage(imageData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      }

      const filename = `${product.id}-labels-${numberOfCopies}.pdf`;
      doc.save(filename);
      onClose();
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handlePrint = () => {
    if (numberOfCopies <= 0) {
      alert("Please enter a number of copies greater than 0.");
      return;
    }
    try {
        const labelCanvas = generateLabelCanvas();
        const imageDataUrl = labelCanvas.toDataURL('image/png');

        let labelsHtml = '';
        for (let i = 0; i < numberOfCopies; i++) {
            labelsHtml += `<div class="label"><img src="${imageDataUrl}" style="width: 100%; height: 100%;" /></div>`;
        }

        const printStyles = `
            @page { size: 2in 1in; margin: 0; }
            @media print {
                html, body { width: 2in; height: 1in; margin: 0; padding: 0; display: block; }
                .label { width: 2in; height: 1in; page-break-after: always; box-sizing: border-box; display: block; }
            }
        `;
        
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument;
        if (doc) {
            doc.open();
            doc.write(`<html><head><title>Print Labels</title><style>${printStyles}</style></head><body>${labelsHtml}</body></html>`);
            doc.close();
            iframe.onload = () => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => { document.body.removeChild(iframe); }, 500);
            };
        }
        onClose();
    } catch (error) {
        console.error('Printing failed:', error);
        alert('Failed to print labels. Please try again.');
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in-fast">
      <Card className="w-full max-w-md animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Print/Download Barcode Labels</h2>
          <button onClick={onClose} className="p-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors"><X size={20} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2">Label Preview:</h3>
            <div className="border-2 border-dashed border-purple-300 bg-gray-50 p-4 rounded-lg flex justify-center">
              <div
                className="bg-white p-2 rounded flex flex-col items-center justify-center shadow-inner"
                style={{ width: '200px', height: '100px', border: '1px solid #ddd' }}
              >
                <p className="text-xs font-bold">{businessName}</p>
                <canvas ref={previewCanvasRef} style={{ maxWidth: '90%', maxHeight: '50px', margin: '2px 0' }}/>
                <p className="text-xs font-semibold text-center leading-tight">{product.name.substring(0, 20)}</p>
                <p className="text-sm font-bold">₹{product.salePrice.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 text-center">Number of copies</label>
            <div className="flex items-center justify-center gap-2">
                <Button 
                    onClick={() => setNumberOfCopies(prev => Math.max(0, prev - 1))}
                    className="px-4 py-2 text-xl font-bold"
                    variant="secondary"
                    aria-label="Decrease quantity"
                >
                    -
                </Button>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={numberOfCopies}
                  onChange={(e) => setNumberOfCopies(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-24 p-2 border rounded text-center text-lg"
                />
                <Button
                    onClick={() => setNumberOfCopies(prev => Math.min(100, prev + 1))}
                    className="px-4 py-2 text-xl font-bold"
                    variant="secondary"
                    aria-label="Increase quantity"
                >
                    +
                </Button>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
            <p className="text-xs font-semibold text-yellow-800 mb-1">Important Print Settings</p>
            <p className="text-xs text-yellow-700">
              When printing, ensure printer settings use <strong>Actual Size</strong> and <strong>Paper Size: 2x1 inch</strong> (50.8x25.4mm).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={handlePrint} className="w-full"><Printer size={16} className="mr-2" /> Print</Button>
            <Button onClick={handleDownloadPDF} className="w-full"><Download size={16} className="mr-2" /> Download PDF</Button>
          </div>
          <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
        </div>
      </Card>
    </div>
  );
};
