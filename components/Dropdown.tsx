import React, { useState, useRef, useEffect, ReactNode, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

export interface DropdownOption {
  value: string;
  label: ReactNode;
  searchText?: string; // Optional text for searching
}

interface DropdownProps {
  options: DropdownOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

const Dropdown: React.FC<DropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search...'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  // Replaced useOnClickOutside with a self-contained useEffect to handle outside clicks robustly
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
        if (
            triggerRef.current && !triggerRef.current.contains(event.target as Node) &&
            portalRef.current && !portalRef.current.contains(event.target as Node)
        ) {
            setIsOpen(false);
        }
    };
    
    // Add listener on next tick to prevent the event that opened the dropdown from closing it.
    setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
    }, 0);

    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleResizeOrScroll = () => {
        if (isOpen) {
            setIsOpen(false);
        }
    };
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true); // Capture scroll events on parents
    return () => {
        window.removeEventListener('resize', handleResizeOrScroll);
        window.removeEventListener('scroll', handleResizeOrScroll, true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        
        const spaceBelow = window.innerHeight - rect.bottom;
        const dropdownHeight = 300; // Max height of dropdown
        const spaceAbove = rect.top;

        let top;
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
            // Open upwards
            top = rect.top - dropdownHeight - 4;
            if (top < 0) top = 4; // Add some margin from top of viewport
        } else {
            // Open downwards
            top = rect.bottom + 4;
        }
        
        setPosition({
          top: top,
          left: rect.left,
          width: rect.width,
        });
      }
    }
  }, [isOpen]);
  
  const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchTerm) {
      return options;
    }
    const lowercasedTerm = searchTerm.toLowerCase();
    return options.filter(option => 
      (option.searchText || (typeof option.label === 'string' ? option.label : ''))
        .toLowerCase()
        .includes(lowercasedTerm)
    );
  }, [options, searchTerm, searchable]);

  const DropdownMenu = (
    <div
      ref={portalRef}
      className="fixed z-50 bg-white dark:bg-slate-800 rounded-md shadow-lg border dark:border-slate-700 mt-1 animate-scale-in flex flex-col"
      style={{ top: position.top, left: position.left, width: position.width, maxHeight: '300px' }}
      role="dialog"
    >
      {searchable && (
        <div className="p-2 border-b dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full p-2 pl-8 border rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  autoFocus
              />
          </div>
        </div>
      )}
      <ul className="overflow-y-auto" role="listbox">
        {placeholder && !searchable && ( // Don't show main placeholder if searchable, search input has it
             <li
                onClick={() => {
                    onChange('');
                    setIsOpen(false);
                }}
                className="px-4 py-2 hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer text-gray-500 italic"
                role="option"
              >
                {placeholder}
            </li>
        )}
        {filteredOptions.length > 0 ? filteredOptions.map(option => (
          <li
            key={option.value}
            onClick={() => {
              onChange(option.value);
              setIsOpen(false);
            }}
            className={`px-4 py-2 hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer ${value === option.value ? 'bg-teal-100 dark:bg-teal-900' : ''}`}
            role="option"
            aria-selected={value === option.value}
          >
            {option.label}
          </li>
        )) : (
          <li className="px-4 py-2 text-gray-500">No options found.</li>
        )}
      </ul>
    </div>
  );

  return (
    <div className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        disabled={disabled}
        className="w-full p-2 border rounded bg-white text-left flex justify-between items-center dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 disabled:opacity-50 disabled:bg-gray-100 dark:disabled:bg-slate-800"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && ReactDOM.createPortal(DropdownMenu, document.body)}
    </div>
  );
};

export default Dropdown;
