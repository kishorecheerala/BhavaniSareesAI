import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';
import Button from './Button';
import { Product } from '../types';
import { X } from 'lucide-react';

interface QuantityInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
  product: Product | null;
}

const QuantityInputModal: React.FC<QuantityInputModalProps> = ({ isOpen, onClose, onSubmit, product }) => {
  const [quantity, setQuantity] = useState('1');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuantity('1'); // Reset quantity when modal opens
      setTimeout(() => inputRef.current?.focus(), 100); // Autofocus input
    }
  }, [isOpen]);
  
  if (!isOpen || !product) return null;

  const handleSubmit = () => {
    const numQuantity = parseInt(quantity, 10);
    if (!isNaN(numQuantity) && numQuantity > 0) {
      onSubmit(numQuantity);
    } else {
      alert('Please enter a valid quantity.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
        handleSubmit();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-[51] p-4 animate-fade-in-fast">
      <Card className="w-full max-w-sm animate-scale-in">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-primary">Enter Quantity</h2>
            <button onClick={onClose} className="p-2 -mr-2 rounded-full text-gray-500 hover:bg-gray-100 transition-colors">
                <X size={20}/>
            </button>
        </div>
        <div className="space-y-4 mt-4">
          <p className="font-semibold">{product.name}</p>
          <p className="text-sm text-gray-600">Current stock: {product.quantity}</p>
          <div>
            <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700">Quantity</label>
            <input
              id="quantity-input"
              ref={inputRef}
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              onKeyPress={handleKeyPress}
              className="w-full p-2 border rounded mt-1 text-center text-lg"
              min="1"
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmit} className="w-full">Add to Purchase</Button>
            <Button onClick={onClose} variant="secondary" className="w-full">Cancel</Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default QuantityInputModal;
