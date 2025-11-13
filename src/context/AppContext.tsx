import React, { createContext, useReducer, useContext, useEffect, ReactNode, useState } from 'react';
import { Customer, Supplier, Product, Sale, Purchase, Return, Payment, BeforeInstallPromptEvent, Notification, ProfileData, Page, SelectionPayload } from '../types';
import * as db from '../utils/db';

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
  notifications: Notification[];
  profile: ProfileData | null;
  toast: ToastState;
  selection: SelectionPayload | null;
  installPromptEvent: BeforeInstallPromptEvent | null;
  currentPage: Page;
}

type Action =
  | { type: 'SET_STATE'; payload: Omit<AppState, 'toast' | 'selection' | 'installPromptEvent' | 'notifications' | 'profile' | 'currentPage'> }
  | { type: 'SET_CURRENT_PAGE', payload: Page }
  | { type: 'SET_NOTIFICATIONS'; payload: Notification[] }
  | { type: 'SET_PROFILE'; payload: ProfileData | null }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT_STOCK'; payload: { productId: string; change: number } }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'UPDATE_SALE', payload: { oldSale: Sale, updatedSale: Sale } }
  | { type: 'DELETE_SALE'; payload: string } // saleId
  | { type: 'ADD_PURCHASE'; payload: Purchase }
  | { type: 'UPDATE_PURCHASE'; payload: { oldPurchase: Purchase, updatedPurchase: Purchase } }
  | { type: 'DELETE_PURCHASE'; payload: string } // purchaseId
  | { type: 'ADD_RETURN'; payload: Return }
  | { type: 'UPDATE_RETURN'; payload: { oldReturn: Return, updatedReturn: Return } }
  | { type: 'ADD_PAYMENT_TO_SALE'; payload: { saleId: string; payment: Payment } }
  | { type: 'ADD_PAYMENT_TO_PURCHASE'; payload: { purchaseId: string; payment: Payment } }
  | { type: 'SHOW_TOAST'; payload: { message: string; type?: 'success' | 'info' } }
  | { type: 'HIDE_TOAST' }
  | { type: 'SET_LAST_BACKUP_DATE'; payload: string }
  | { type: 'SET_SELECTION'; payload: SelectionPayload }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'SET_INSTALL_PROMPT_EVENT'; payload: BeforeInstallPromptEvent | null }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_AS_READ'; payload: string } // id
  | { type: 'MARK_ALL_NOTIFICATIONS_AS_READ' };


const initialState: AppState = {
  customers: [],
  suppliers: [],
  products: [],
  sales: [],
  purchases: [],
  returns: [],
  app_metadata: [],
  notifications: [],
  profile: null,
  toast: { message: '', show: false, type: 'info' },
  selection: null,
  installPromptEvent: null,
  currentPage: (sessionStorage.getItem('currentPage') as Page) || 'DASHBOARD',
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATE':
        return { ...state, ...action.payload };
    case 'SET_CURRENT_PAGE':
        return { ...state, currentPage: action.payload };
    case 'SET_NOTIFICATIONS':
        return { ...state, notifications: action.payload };
    case 'SET_PROFILE':
        return { ...state, profile: action.payload };
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
    case 'UPDATE_SALE': {
        const { oldSale, updatedSale } = action.payload;
        const stockChanges = new Map<string, number>();

        // Add back old items to stock
        oldSale.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + item.quantity);
        });

        // Remove new items from stock
        updatedSale.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) - item.quantity);
        });
        
        const updatedProducts = state.products.map(p => {
            if (stockChanges.has(p.id)) {
                return { ...p, quantity: p.quantity + (stockChanges.get(p.id) || 0) };
            }
            return p;
        });

        return {
            ...state,
            sales: state.sales.map(s => s.id === updatedSale.id ? updatedSale : s),
            products: updatedProducts,
        };
    }
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
    case 'UPDATE_PURCHASE': {
        const { oldPurchase, updatedPurchase } = action.payload;

        const stockChanges = new Map<string, number>();
        const productDetails = new Map<string, { purchasePrice: number, salePrice: number, gstPercent: number, productName: string }>();

        // Revert old purchase stock
        oldPurchase.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) - item.quantity);
        });

        const newProductsToAdd: Product[] = [];
        const existingProductIds = new Set(state.products.map(p => p.id));

        // Apply new purchase stock and identify new products
        updatedPurchase.items.forEach(item => {
            productDetails.set(item.productId, { purchasePrice: item.price, salePrice: item.saleValue, gstPercent: item.gstPercent, productName: item.productName });
            
            if (!existingProductIds.has(item.productId)) {
                newProductsToAdd.push({
                    id: item.productId,
                    name: item.productName,
                    quantity: item.quantity,
                    purchasePrice: item.price,
                    salePrice: item.saleValue,
                    gstPercent: item.gstPercent,
                });
            } else {
                 stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + item.quantity);
            }
        });

        const updatedExistingProducts = state.products.map(p => {
            if (stockChanges.has(p.id)) {
                const updatedProduct = {
                    ...p,
                    quantity: Math.max(0, p.quantity + (stockChanges.get(p.id) || 0)),
                };
                const details = productDetails.get(p.id);
                if (details) {
                    updatedProduct.purchasePrice = details.purchasePrice;
                    updatedProduct.salePrice = details.salePrice;
                    updatedProduct.gstPercent = details.gstPercent;
                    updatedProduct.name = details.productName;
                }
                return updatedProduct;
            }
            return p;
        });

        const finalProducts = [...updatedExistingProducts, ...newProductsToAdd];

        return {
            ...state,
            purchases: state.purchases.map(p => p.id === updatedPurchase.id ? updatedPurchase : p),
            products: finalProducts,
        };
    }
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
    case 'UPDATE_RETURN': {
        const { oldReturn, updatedReturn } = action.payload;
        const stockChanges = new Map<string, number>();

        const oldStockSign = oldReturn.type === 'CUSTOMER' ? -1 : 1; 
        const newStockSign = updatedReturn.type === 'CUSTOMER' ? 1 : -1;

        oldReturn.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + (item.quantity * oldStockSign));
        });
        updatedReturn.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + (item.quantity * newStockSign));
        });

        const updatedProducts = state.products.map(p => {
            if (stockChanges.has(p.id)) {
                return { ...p, quantity: Math.max(0, p.quantity + (stockChanges.get(p.id) || 0)) };
            }
            return p;
        });

        let updatedSales = state.sales;
        let updatedPurchases = state.purchases;

        if (oldReturn.type === 'CUSTOMER') {
            updatedSales = state.sales.map(sale => {
                if (sale.id === oldReturn.referenceId) {
                    const updatedPayments = (sale.payments || []).map(p => 
                        p.id === `PAY-RET-${oldReturn.id}` ? { ...p, amount: updatedReturn.amount, date: updatedReturn.returnDate } : p
                    );
                    return { ...sale, payments: updatedPayments };
                }
                return sale;
            });
        } else { // SUPPLIER
            updatedPurchases = state.purchases.map(purchase => {
                if (purchase.id === oldReturn.referenceId) {
                    const updatedPayments = (purchase.payments || []).map(p => 
                        p.id === `PAY-RET-${oldReturn.id}` ? { ...p, amount: updatedReturn.amount, date: updatedReturn.returnDate } : p
                    );
                    return { ...purchase, payments: updatedPayments };
                }
                return purchase;
            });
        }

        return {
            ...state,
            returns: state.returns.map(r => r.id === updatedReturn.id ? updatedReturn : r),
            products: updatedProducts,
            sales: updatedSales,
            purchases: updatedPurchases,
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
    case 'ADD_NOTIFICATION':
      // Prevent duplicates by ID
      if (state.notifications.some(n => n.id === action.payload.id)) {
        return state;
      }
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'MARK_NOTIFICATION_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n),
      };
    case 'MARK_ALL_NOTIFICATIONS_AS_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => ({ ...n, read: true })),
      };
    default:
      return state;
  }
};

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    showToast: (message: string, type?: 'success' | 'info') => void;
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
        const [customers, suppliers, products, sales, purchases, returns, app_metadata, notifications, profile] = await Promise.all([
          db.getAll('customers'),
          db.getAll('suppliers'),
          db.getAll('products'),
          db.getAll('sales'),
          db.getAll('purchases'),
          db.getAll('returns'),
          db.getAll('app_metadata'),
          db.getAll('notifications'),
          db.getAll('profile'),
        ]);

        const validatedState: Omit<AppState, 'toast' | 'selection' | 'installPromptEvent' | 'notifications' | 'profile' | 'currentPage'> = {
            customers: Array.isArray(customers) ? customers : [],
            suppliers: Array.isArray(suppliers) ? suppliers : [],
            products: Array.isArray(products) ? products : [],
            sales: (Array.isArray(sales) ? sales : []).map((s: any) => ({ ...s, payments: s.payments || [] })),
            purchases: (Array.isArray(purchases) ? purchases : []).map((p: any) => ({ ...p, payments: p.payments || [] })),
            returns: Array.isArray(returns) ? returns : [],
            app_metadata: Array.isArray(app_metadata) ? app_metadata : [],
        };
        dispatch({ type: 'SET_STATE', payload: validatedState });
        dispatch({ type: 'SET_NOTIFICATIONS', payload: Array.isArray(notifications) ? notifications : [] });
        dispatch({ type: 'SET_PROFILE', payload: (Array.isArray(profile) && profile.length > 0) ? profile[0] : null });
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
  useEffect(() => { if (isDbLoaded) db.saveCollection('notifications', state.notifications); }, [state.notifications, isDbLoaded]);
  useEffect(() => { if (isDbLoaded && state.profile) db.saveCollection('profile', [state.profile]); }, [state.profile, isDbLoaded]);


  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    dispatch({ type: 'SHOW_TOAST', payload: { message, type } });
    setTimeout(() => {
        dispatch({ type: 'HIDE_TOAST' });
    }, 3000);
  };

  return <AppContext.Provider value={{ state, dispatch, showToast, isDbLoaded }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);