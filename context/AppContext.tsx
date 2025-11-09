import React, { createContext, useReducer, useContext, useEffect, ReactNode } from 'react';
import { Customer, Supplier, Product, Sale, Purchase, Return, Payment } from '../types';

interface AppState {
  customers: Customer[];
  suppliers: Supplier[];
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  returns: Return[];
}

type Action =
  | { type: 'SET_STATE'; payload: AppState }
  | { type: 'ADD_CUSTOMER'; payload: Customer }
  | { type: 'ADD_SUPPLIER'; payload: Supplier }
  | { type: 'ADD_PRODUCT'; payload: Product }
  | { type: 'UPDATE_PRODUCT_STOCK'; payload: { productId: string; change: number } }
  | { type: 'ADD_SALE'; payload: Sale }
  | { type: 'ADD_PURCHASE'; payload: Purchase }
  | { type: 'ADD_RETURN'; payload: Return }
  | { type: 'ADD_PAYMENT_TO_SALE'; payload: { saleId: string; payment: Payment } }
  | { type: 'ADD_PAYMENT_TO_PURCHASE'; payload: { purchaseId: string; payment: Payment } };

const initialState: AppState = {
  customers: [],
  suppliers: [],
  products: [],
  sales: [],
  purchases: [],
  returns: [],
};

const appReducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'SET_STATE':
        return action.payload;
    case 'ADD_CUSTOMER':
      return { ...state, customers: [...state.customers, action.payload] };
    case 'ADD_SUPPLIER':
      return { ...state, suppliers: [...state.suppliers, action.payload] };
    case 'ADD_PRODUCT':
        const existingProduct = state.products.find(p => p.id === action.payload.id);
        if (existingProduct) {
            return {
                ...state,
                products: state.products.map(p => p.id === action.payload.id ? { ...p, quantity: p.quantity + action.payload.quantity, purchasePrice: action.payload.purchasePrice, salePrice: action.payload.salePrice } : p)
            };
        }
        return { ...state, products: [...state.products, action.payload] };
    case 'UPDATE_PRODUCT_STOCK':
        return {
            ...state,
            products: state.products.map(p => p.id === action.payload.productId ? { ...p, quantity: p.quantity + action.payload.change } : p)
        }
    case 'ADD_SALE':
      return { ...state, sales: [...state.sales, action.payload] };
    case 'ADD_PURCHASE':
      return { ...state, purchases: [...state.purchases, action.payload] };
    case 'ADD_RETURN':
      return { ...state, returns: [...state.returns, action.payload] };
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
    default:
      return state;
  }
};

const AppContext = createContext<{ state: AppState; dispatch: React.Dispatch<Action> }>({
  state: initialState,
  dispatch: () => null,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    try {
        const storedState = localStorage.getItem('bhavaniSareesState');
        if (storedState) {
            const parsedState = JSON.parse(storedState);
            const validatedState: AppState = {
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
            localStorage.setItem('bhavaniSareesState', JSON.stringify(state));
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
};

export const useAppContext = () => useContext(AppContext);
