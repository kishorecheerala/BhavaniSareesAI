import React, { createContext, useContext, useReducer, useEffect, ReactNode, Dispatch } from 'react';
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
    | { type: 'UPDATE_CUSTOMER'; payload: Customer }
    | { type: 'ADD_SUPPLIER'; payload: Supplier }
    | { type: 'UPDATE_SUPPLIER'; payload: Supplier }
    | { type: 'ADD_PRODUCT'; payload: Product } // Adds or updates stock
    | { type: 'UPDATE_PRODUCT'; payload: Product } // Edits product details
    | { type: 'UPDATE_PRODUCT_STOCK'; payload: { productId: string; change: number } }
    | { type: 'ADD_SALE'; payload: Sale }
    | { type: 'DELETE_SALE'; payload: string } // saleId
    | { type: 'ADD_PAYMENT_TO_SALE'; payload: { saleId: string; payment: Payment } }
    | { type: 'ADD_PURCHASE'; payload: Purchase }
    | { type: 'DELETE_PURCHASE'; payload: string } // purchaseId
    | { type: 'ADD_PAYMENT_TO_PURCHASE'; payload: { purchaseId: string; payment: Payment } }
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

        case 'UPDATE_CUSTOMER':
            return {
                ...state,
                customers: state.customers.map(c => c.id === action.payload.id ? action.payload : c),
            };

        case 'ADD_SUPPLIER':
            return { ...state, suppliers: [...state.suppliers, action.payload] };

        case 'UPDATE_SUPPLIER':
            return {
                ...state,
                suppliers: state.suppliers.map(s => s.id === action.payload.id ? action.payload : s),
            };

        case 'ADD_PRODUCT': { // Used for purchases, adds or updates stock
            const existingProductIndex = state.products.findIndex(p => p.id === action.payload.id);
            if (existingProductIndex > -1) {
                const updatedProducts = [...state.products];
                const existingProduct = updatedProducts[existingProductIndex];
                existingProduct.quantity += action.payload.quantity;
                // Optionally update prices if they've changed on re-purchase
                existingProduct.purchasePrice = action.payload.purchasePrice;
                existingProduct.salePrice = action.payload.salePrice;
                existingProduct.gstPercent = action.payload.gstPercent;
                return { ...state, products: updatedProducts };
            }
            return { ...state, products: [...state.products, action.payload] };
        }
        
        case 'UPDATE_PRODUCT': // Used for editing product details from Products page
             return {
                ...state,
                products: state.products.map(p => p.id === action.payload.id ? { ...p, ...action.payload } : p),
            };

        case 'UPDATE_PRODUCT_STOCK': {
            return {
                ...state,
                products: state.products.map(p => p.id === action.payload.productId ? { ...p, quantity: p.quantity + action.payload.change } : p),
            };
        }

        case 'ADD_SALE': {
            const newProducts = [...state.products];
            action.payload.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    newProducts[productIndex].quantity -= item.quantity;
                }
            });
            return { ...state, sales: [...state.sales, action.payload], products: newProducts };
        }

        case 'DELETE_SALE': {
            const saleToDelete = state.sales.find(s => s.id === action.payload);
            if (!saleToDelete) return state;

            const newProducts = [...state.products];
            saleToDelete.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    newProducts[productIndex].quantity += item.quantity;
                }
            });

            return {
                ...state,
                sales: state.sales.filter(s => s.id !== action.payload),
                products: newProducts,
            };
        }

        case 'ADD_PAYMENT_TO_SALE':
            return {
                ...state,
                sales: state.sales.map(s => s.id === action.payload.saleId ? { ...s, payments: [...(s.payments || []), action.payload.payment] } : s),
            };

        case 'ADD_PURCHASE': {
            // Logic for adding products is handled separately in the UI, then calling ADD_PRODUCT
            // This just adds the purchase record
             return { ...state, purchases: [...state.purchases, action.payload] };
        }

        case 'DELETE_PURCHASE': {
            const purchaseToDelete = state.purchases.find(p => p.id === action.payload);
            if (!purchaseToDelete) return state;

            const newProducts = [...state.products];
            purchaseToDelete.items.forEach(item => {
                const productIndex = newProducts.findIndex(p => p.id === item.productId);
                if (productIndex !== -1) {
                    newProducts[productIndex].quantity -= item.quantity;
                }
            });
            return {
                ...state,
                purchases: state.purchases.filter(p => p.id !== action.payload),
                products: newProducts,
            };
        }
        
        case 'ADD_PAYMENT_TO_PURCHASE':
            return {
                ...state,
                purchases: state.purchases.map(p => p.id === action.payload.purchaseId ? { ...p, payments: [...(p.payments || []), action.payload.payment] } : p),
            };
            
        case 'ADD_RETURN': {
            const newState = { ...state, returns: [...state.returns, action.payload] };
            if (action.payload.type === 'CUSTOMER') {
                // Add stock back
                action.payload.items.forEach(item => {
                    const productIndex = newState.products.findIndex(p => p.id === item.productId);
                    if (productIndex !== -1) {
                        newState.products[productIndex].quantity += item.quantity;
                    }
                });
                // Add a credit payment to the original sale if amount > 0
                const saleIndex = newState.sales.findIndex(s => s.id === action.payload.referenceId);
                if (saleIndex > -1 && action.payload.amount > 0) {
                    const creditPayment: Payment = {
                        id: `PAY-RET-${Date.now()}`,
                        amount: action.payload.amount,
                        method: 'RETURN_CREDIT',
                        date: action.payload.returnDate,
                    };
                    newState.sales[saleIndex].payments.push(creditPayment);
                }
            } else { // SUPPLIER
                // Remove stock
                action.payload.items.forEach(item => {
                    const productIndex = newState.products.findIndex(p => p.id === item.productId);
                    if (productIndex !== -1) {
                        newState.products[productIndex].quantity -= item.quantity;
                    }
                });
                 // Add a credit payment to the original purchase if amount > 0
                const purchaseIndex = newState.purchases.findIndex(p => p.id === action.payload.referenceId);
                if (purchaseIndex > -1 && action.payload.amount > 0) {
                     const creditPayment: Payment = {
                        id: `PAY-RET-${Date.now()}`,
                        amount: action.payload.amount,
                        method: 'RETURN_CREDIT',
                        date: action.payload.returnDate,
                    };
                    newState.purchases[purchaseIndex].payments.push(creditPayment);
                }
            }
            return newState;
        }

        default:
            return state;
    }
};

const AppContext = createContext<{ state: AppState; dispatch: Dispatch<Action> }>({
    state: initialState,
    dispatch: () => null,
});

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(appReducer, initialState, (initial) => {
        try {
            const localData = localStorage.getItem('bhavaniSareesState');
            return localData ? JSON.parse(localData) : initial;
        } catch (error) {
            console.error("Could not parse state from localStorage", error);
            return initial;
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem('bhavaniSareesState', JSON.stringify(state));
        } catch (error) {
            console.error("Could not save state to localStorage", error);
        }
    }, [state]);

    return (
        <AppContext.Provider value={{ state, dispatch }}>
            {children}
        </AppContext.Provider>
    );
};

export const useAppContext = () => useContext(AppContext);
