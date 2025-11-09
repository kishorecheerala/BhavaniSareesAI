import React, { createContext, useReducer, useContext, useEffect, ReactNode } from 'react';
import { Customer, Supplier, Product, Sale, Purchase, Return } from '../types';

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
  | { type: 'ADD_RETURN'; payload: Return };

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
            // Validate the parsed state to ensure it has the correct structure.
            // This prevents crashes if localStorage data is corrupted or from an older app version.
            const validatedState: AppState = {
                customers: Array.isArray(parsedState.customers) ? parsedState.customers : [],
                suppliers: Array.isArray(parsedState.suppliers) ? parsedState.suppliers : [],
                products: Array.isArray(parsedState.products) ? parsedState.products : [],
                sales: Array.isArray(parsedState.sales) ? parsedState.sales : [],
                purchases: Array.isArray(parsedState.purchases) ? parsedState.purchases : [],
                returns: Array.isArray(parsedState.returns) ? parsedState.returns : [],
            };
            dispatch({ type: 'SET_STATE', payload: validatedState });
        }
    } catch (error) {
        console.error("Could not load or parse state from localStorage, using initial state.", error);
        // If data is corrupted, remove it to prevent future errors.
        localStorage.removeItem('bhavaniSareesState');
    }
  }, []);

  useEffect(() => {
    // Avoid writing the initial empty state to localStorage on first render
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