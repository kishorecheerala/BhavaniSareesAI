
import React, { createContext, useReducer, useContext, useEffect, ReactNode, useState } from 'react';
import { Customer, Supplier, Product, Sale, Purchase, Return, Payment, BeforeInstallPromptEvent } from '../types';
import * as db from '../utils/db';
import { Page } from '../App';

interface ToastState {
  message: string;
  show: boolean;
  type: 'success' | 'info';
}

interface AppMetadata {
    id: 'lastBackup';
    date: string;
}

export interface AppState {
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  returns: Return[];
  app_metadata: AppMetadata[];
  toast: ToastState;
  selection: { page: Page; id: string } | null;
  installPromptEvent: BeforeInstallPromptEvent | null;
}

type Action =
  | { type: 'SET_STATE'; payload: Omit<AppState, 'toast' | 'selection' | 'installPromptEvent'> }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT_STOCK'; payload: { productId: string; change: number } }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'DELETE_SALE'; payload: string } // saleId
  | { type: 'ADD_PURCHASE'; payload: Purchase }
  | { type: 'DELETE_PURCHASE'; payload: string } // purchaseId
  | { type: 'ADD_RETURN'; payload: Return }
  | { type: 'ADD_PAYMENT_TO_SALE'; payload: { saleId: string; payment: Payment } }
  | { type: 'ADD_PAYMENT_TO_PURCHASE'; payload: { purchaseId: string; payment: Payment } }
  | { type: 'SHOW_TOAST'; payload: { message: string; type?: 'success' | 'info' } }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_LAST_BACKUP_DATE'; payload: string }
  | { type: 'SET_SELECTION'; payload: { page: Page; id: string } }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_INSTALL_PROMPT_EVENT'; payload: BeforeInstallPromptEvent | null };


const initialState: AppState = {
  customers: [],
  suppliers: [],
  products: [],
  sales: [],
  purchases: [],
  returns: [],
  app_metadata: [],
  toast: { message: '', show: false, type: 'info' },
  selection: null,
  installPromptEvent: null,
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATE':
        return { ...state, ...action.payload };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [...state.suppliers, action.payload] };
    case 'UPDATE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'ADD_PRODUCT':
        const existingProduct = state.products.find(p => p.id === action.payload.id);
        if (existingProduct) {
            return {
                ...state,
                products: state.products.map(p => p.id === action.payload.id ? { ...p, quantity: p.quantity + action.payload.quantity, purchasePrice: action.payload.purchasePrice, salePrice: action.payload.salePrice } : p)
            };
        }
        return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT':
        return { ...state, products: state.products.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'UPDATE_PRODUCT_STOCK':
        return {
            ...state,
            products: state.products.map(p => p.id === action.payload.productId ? { ...p, quantity: p.quantity + action.payload.change } : p)
        }
    case 'ADD_SALE':
      return { ...state, sales: [...state.sales, action.payload] };
    case 'DELETE_SALE': {
      const saleToDelete = state.sales.find(s => s.id === action.payload);
      if (!saleToDelete) return state;

      const stockChanges = new Map<string, number>();
      saleToDelete.items.forEach(item => {
        const currentChange = stockChanges.get(item.productId) || 0;
        stockChanges.set(item.productId, currentChange + item.quantity); // Add stock back
      });

      let updatedProducts = state.products;
      stockChanges.forEach((change, productId) => {
        updatedProducts = updatedProducts.map(p =>
          p.id === productId ? { ...p, quantity: p.quantity + change } : p
        );
      });

      return {
        ...state,
        sales: state.sales.filter(s => s.id !== action.payload),
        products: updatedProducts,
      };
    }
    case 'ADD_PURCHASE':
      return { ...state, purchases: [...state.purchases, action.payload] };
    case 'DELETE_PURCHASE': {
      const purchaseToDelete = state.purchases.find(p => p.id === action.payload);
      if (!purchaseToDelete) return state;

      const stockChanges = new Map<string, number>();
      purchaseToDelete.items.forEach(item => {
        const currentChange = stockChanges.get(item.productId) || 0;
        stockChanges.set(item.productId, currentChange - item.quantity); // Subtract stock
      });
      
      let updatedProducts = state.products;
      stockChanges.forEach((change, productId) => {
        updatedProducts = updatedProducts.map(p =>
          p.id === productId ? { ...p, quantity: Math.max(0, p.quantity + change) } : p
        );
      });
      
      return {
        ...state,
        purchases: state.purchases.filter(p => p.id !== action.payload),
        products: updatedProducts,
      };
    }
    case 'ADD_RETURN': {
      const returnPayload = action.payload;
      const updatedProducts = state.products.map(product => {
        const itemReturned = returnPayload.items.find(item => item.productId.trim().toLowerCase() === product.id.trim().toLowerCase());
        if (itemReturned) {
          const quantityChange = returnPayload.type === 'CUSTOMER' ? itemReturned.quantity : -itemReturned.quantity;
          return { ...product, quantity: product.quantity + quantityChange };
        }
        return product;
      });
      const creditPayment: Payment = {
        id: `PAY-RET-${returnPayload.id}`,
        amount: returnPayload.amount,
        date: returnPayload.returnDate,
        method: 'RETURN_CREDIT',
      };
      let updatedSales = state.sales;
      let updatedPurchases = state.purchases;
      if (returnPayload.type === 'CUSTOMER') {
        updatedSales = state.sales.map(sale =>
          sale.id === returnPayload.referenceId
            ? { ...sale, payments: [...(sale.payments || []), creditPayment] }
            : sale
        );
      } else {
        updatedPurchases = state.purchases.map(purchase =>
          purchase.id === returnPayload.referenceId
            ? { ...purchase, payments: [...(purchase.payments || []), creditPayment] }
            : purchase
        );
      }
      return {
        ...state,
        products: updatedProducts,
        sales: updatedSales,
        purchases: updatedPurchases,
        returns: [...state.returns, returnPayload],
      };
    }
    case 'ADD_PAYMENT_TO_SALE':
      return {
        ...state,
        sales: state.sales.map(sale =>
          sale.id === action.payload.saleId
            ? { ...sale, payments: [...(sale.payments || []), action.payload.payment] }
            : sale
        ),
      };
    case 'ADD_PAYMENT_TO_PURCHASE':
      return {
        ...state,
        purchases: state.purchases.map(purchase =>
          purchase.id === action.payload.purchaseId
            ? { ...purchase, payments: [...(purchase.payments || []), action.payload.payment] }
            : purchase
        ),
      };
    case 'SHOW_TOAST':
        return { ...state, toast: { message: action.payload.message, show: true, type: action.payload.type || 'info' } };
    case 'HIDE_TOAST':
        return { ...state, toast: { ...state.toast, show: false } };
    case 'SET_LAST_BACKUP_DATE':
      return {
        ...state,
        app_metadata: [{ id: 'lastBackup', date: action.payload }]
      };
    case 'SET_SELECTION':
      return { ...state, selection: action.payload };
    case 'CLEAR_SELECTION':
      return { ...state, selection: null };
    case 'SET_INSTALL_PROMPT_EVENT':
      return { ...state, installPromptEvent: action.payload };
    default:
      return state;
  }
};

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    showToast: (message: string) => void;
    isDbLoaded: boolean;
}

const AppContext = createContext<AppContextType>({
  state: initialState,
  dispatch: () => null,
  showToast: () => null,
  isDbLoaded: false,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isDbLoaded, setIsDbLoaded] = useState(false);

  // Load initial data from IndexedDB
  useEffect(() => {
    const loadData = async () => {
      try {
        const [customers, suppliers, products, sales, purchases, returns, app_metadata] = await Promise.all([
          db.getAll('customers'),
          db.getAll('suppliers'),
          db.getAll('products'),
          db.getAll('sales'),
          db.getAll('purchases'),
          db.getAll('returns'),
          db.getAll('app_metadata'),
        ]);

        const validatedState: Omit<AppState, 'toast' | 'selection' | 'installPromptEvent'> = {
            customers: Array.isArray(customers) ? customers : [],
            suppliers: Array.isArray(suppliers) ? suppliers : [],
            products: Array.isArray(products) ? products : [],
            sales: (Array.isArray(sales) ? sales : []).map((s: any) => ({ ...s, payments: s.payments || [] })),
            purchases: (Array.isArray(purchases) ? purchases : []).map((p: any) => ({ ...p, payments: p.payments || [] })),
            returns: Array.isArray(returns) ? returns : [],
            app_metadata: Array.isArray(app_metadata) ? app_metadata : [],
        };
        dispatch({ type: 'SET_STATE', payload: validatedState });
      } catch (error) {
        console.error("Could not load data from IndexedDB, using initial state.", error);
      } finally {
        setIsDbLoaded(true);
      }
    };

    loadData();
  }, []);
  
  // Persist data slices to IndexedDB when they change
  useEffect(() => { if (isDbLoaded) db.saveCollection('customers', state.customers); }, [state.customers, isDbLoaded]);
  useEffect(() => { if (isDbLoaded) db.saveCollection('suppliers', state.suppliers); }, [state.suppliers, isDbLoaded]);
  useEffect(() => { if (isDbLoaded) db.saveCollection('products', state.products); }, [state.products, isDbLoaded]);
  useEffect(() => { if (isDbLoaded) db.saveCollection('sales', state.sales); }, [state.sales, isDbLoaded]);
  useEffect(() => { if (isDbLoaded) db.saveCollection('purchases', state.purchases); }, [state.purchases, isDbLoaded]);
  useEffect(() => { if (isDbLoaded) db.saveCollection('returns', state.returns); }, [state.returns, isDbLoaded]);
  useEffect(() => { if (isDbLoaded) db.saveCollection('app_metadata', state.app_metadata); }, [state.app_metadata, isDbLoaded]);


  const showToast = (message: string) => {
    dispatch({ type: 'SHOW_TOAST', payload: { message, type: 'success' } });
    setTimeout(() => {
        dispatch({ type: 'HIDE_TOAST' });
    }, 3000);
  };

  return <AppContext.Provider value={{ state, dispatch, showToast, isDbLoaded }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
