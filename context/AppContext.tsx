import React, { createContext, useReducer, useContext, useEffect, ReactNode } from 'react';
import { Customer, Supplier, Product, Sale, Purchase, Return, Payment } from '../types';

interface ToastState {
  message: string;
  show: boolean;
}

interface AppState {
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  returns: Return[];
  toast: ToastState;
}

type Action =
  | { type: 'SET_STATE'; payload: Omit<AppState, 'toast'> }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'UPDATE_CUSTOMER'; payload: Customer }
  | { type: 'DELETE_CUSTOMER'; payload: string } // customerId
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
  | { type: 'DELETE_SUPPLIER'; payload: string } // supplierId
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT'; payload: Product }
  | { type: 'DELETE_PRODUCT'; payload: string } // productId
  | { type: 'UPDATE_PRODUCT_STOCK'; payload: { productId: string; change: number } }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'UPDATE_SALE'; payload: { oldSale: Sale, newSale: Sale } }
  | { type: 'DELETE_SALE'; payload: string } // saleId
  | { type: 'ADD_PURCHASE'; payload: Purchase }
  | { type: 'UPDATE_PURCHASE'; payload: { oldPurchase: Purchase, newPurchase: Purchase } }
  | { type: 'DELETE_PURCHASE'; payload: string } // purchaseId
  | { type: 'ADD_RETURN'; payload: Return }
  | { type: 'DELETE_RETURN'; payload: string } // returnId
  | { type: 'ADD_PAYMENT_TO_SALE'; payload: { saleId: string; payment: Payment } }
  | { type: 'ADD_PAYMENT_TO_PURCHASE'; payload: { purchaseId: string; payment: Payment } }
  | { type: 'SHOW_TOAST'; payload: string }
  | { type: 'HIDE_TOAST' };


const initialState: AppState = {
  customers: [],
  suppliers: [],
  products: [],
  sales: [],
  purchases: [],
  returns: [],
  toast: { message: '', show: false },
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATE':
        return { ...state, ...action.payload };
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'UPDATE_CUSTOMER':
      return { ...state, customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CUSTOMER':
      return { ...state, customers: state.customers.filter(c => c.id !== action.payload) };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [...state.suppliers, action.payload] };
    case 'UPDATE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUPPLIER':
      return { ...state, suppliers: state.suppliers.filter(s => s.id !== action.payload) };
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
    case 'DELETE_PRODUCT':
      return { ...state, products: state.products.filter(p => p.id !== action.payload) };
    case 'UPDATE_PRODUCT_STOCK':
        return {
            ...state,
            products: state.products.map(p => p.id === action.payload.productId ? { ...p, quantity: p.quantity + action.payload.change } : p)
        }
    case 'ADD_SALE':
      return { ...state, sales: [...state.sales, action.payload] };
    case 'UPDATE_SALE': {
        const { oldSale, newSale } = action.payload;
        const stockChanges = new Map<string, number>();

        // Add back old stock
        oldSale.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + item.quantity);
        });

        // Remove new stock
        newSale.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) - item.quantity);
        });
        
        const updatedProducts = state.products.map(product => {
            if (stockChanges.has(product.id)) {
                return { ...product, quantity: product.quantity + (stockChanges.get(product.id) || 0) };
            }
            return product;
        });

        return {
            ...state,
            sales: state.sales.map(s => s.id === newSale.id ? newSale : s),
            products: updatedProducts
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
        const { oldPurchase, newPurchase } = action.payload;
        const stockChanges = new Map<string, number>();

        // Revert stock from old purchase items
        oldPurchase.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) - item.quantity);
        });

        // Add stock from new purchase items
        newPurchase.items.forEach(item => {
            stockChanges.set(item.productId, (stockChanges.get(item.productId) || 0) + item.quantity);
        });

        const updatedProducts = state.products.map(product => {
            if (stockChanges.has(product.id)) {
                return { ...product, quantity: product.quantity + (stockChanges.get(product.id) || 0) };
            }
            return product;
        });

        return {
            ...state,
            purchases: state.purchases.map(p => p.id === newPurchase.id ? newPurchase : p),
            products: updatedProducts
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
    case 'DELETE_RETURN': {
      const returnToDelete = state.returns.find(r => r.id === action.payload);
      if (!returnToDelete) return state;

      // Revert stock changes
      const updatedProducts = state.products.map(product => {
        const itemReturned = returnToDelete.items.find(item => item.productId === product.id);
        if (itemReturned) {
          const quantityChange = returnToDelete.type === 'CUSTOMER' ? -itemReturned.quantity : +itemReturned.quantity;
          return { ...product, quantity: product.quantity + quantityChange };
        }
        return product;
      });

      // Remove credit payment from sale/purchase
      let updatedSales = state.sales;
      let updatedPurchases = state.purchases;
      const paymentIdToRemove = `PAY-RET-${returnToDelete.id}`;
      if (returnToDelete.type === 'CUSTOMER') {
        updatedSales = state.sales.map(sale =>
          sale.id === returnToDelete.referenceId
            ? { ...sale, payments: (sale.payments || []).filter(p => p.id !== paymentIdToRemove) }
            : sale
        );
      } else {
        updatedPurchases = state.purchases.map(purchase =>
          purchase.id === returnToDelete.referenceId
            ? { ...purchase, payments: (purchase.payments || []).filter(p => p.id !== paymentIdToRemove) }
            : purchase
        );
      }
      
      return {
        ...state,
        products: updatedProducts,
        sales: updatedSales,
        purchases: updatedPurchases,
        returns: state.returns.filter(r => r.id !== action.payload)
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
        return { ...state, toast: { message: action.payload, show: true } };
    case 'HIDE_TOAST':
        return { ...state, toast: { ...state.toast, show: false } };
    default:
      return state;
  }
};

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    showToast: (message: string) => void;
}

const AppContext = createContext<AppContextType>({
  state: initialState,
  dispatch: () => null,
  showToast: () => null,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    try {
        const storedState = localStorage.getItem('bhavaniSareesState');
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            const validatedState: Omit<AppState, 'toast'> = {
                customers: Array.isArray(parsedState.customers) ? parsedState.customers : [],
                suppliers: Array.isArray(parsedState.suppliers) ? parsedState.suppliers : [],
                products: Array.isArray(parsedState.products) ? parsedState.products : [],
                sales: (Array.isArray(parsedState.sales) ? parsedState.sales : []).map((s: any) => ({ ...s, payments: s.payments || [] })),
                purchases: (Array.isArray(parsedState.purchases) ? parsedState.purchases : []).map((p: any) => ({ ...p, payments: p.payments || [] })),
                returns: Array.isArray(parsedState.returns) ? parsedState.returns : [],
            };
            dispatch({ type: 'SET_STATE', payload: validatedState });
        }
    } catch (error) {
        console.error("Could not load or parse state from localStorage, using initial state.", error);
        localStorage.removeItem('bhavaniSareesState');
    }
  }, []);

  useEffect(() => {
    if (state !== initialState) {
        try {
            const stateToSave = { ...state, toast: undefined };
            localStorage.setItem('bhavaniSareesState', JSON.stringify(stateToSave));
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }
  }, [state]);

  const showToast = (message: string) => {
    dispatch({ type: 'SHOW_TOAST', payload: message });
    setTimeout(() => {
        dispatch({ type: 'HIDE_TOAST' });
    }, 3000);
  };

  return <AppContext.Provider value={{ state, dispatch, showToast }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);