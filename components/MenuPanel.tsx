import React from 'react';
import { User, DollarSign } from 'lucide-react';

interface MenuPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileClick: () => void;
  onShowProfit: () => void;
}

const MenuPanel: React.FC<MenuPanelProps> = ({ isOpen, onClose, onProfileClick, onShowProfit }) => {
    if (!isOpen) return null;

    return (
        <div 
          className="absolute top-full left-0 mt-2 w-56 bg-white rounded-lg shadow-2xl border border-gray-200 text-text animate-scale-in origin-top-left z-[150]"
          role="dialog"
          aria-label="Main Menu"
        >
            <div className="p-2">
                <button
                    onClick={onProfileClick}
                    className="w-full flex items-center gap-3 text-left p-3 rounded-md hover:bg-purple-50 transition-colors"
                >
                    <User className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm">My Business Profile</span>
                </button>
                <button
                    onClick={onShowProfit}
                    className="w-full flex items-center gap-3 text-left p-3 rounded-md hover:bg-purple-50 transition-colors"
                >
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-sm">Show Estimated Profit</span>
                </button>
            </div>
        </div>
    );
};

export default MenuPanel;