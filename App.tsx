import React, { useState, useEffect, useRef } from 'react';
import { Home, Users, ShoppingCart, Package, FileText, Undo2, Boxes } from 'lucide-react';

import { AppProvider, useAppContext } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import ReportsPage from './pages/ReportsPage';
import ReturnsPage from './pages/ReturnsPage';
import ProductsPage from './pages/ProductsPage';

type Page = 'DASHBOARD' | 'CUSTOMERS' | 'SALES' | 'PURCHASES' | 'REPORTS' | 'RETURNS' | 'PRODUCTS';

const Toast = () => {
    const { state, dispatch } = useAppContext();

    if (!state.toast.show) return null;

    return (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-50 animate-fade-in-out">
            {state.toast.message}
        </div>
    );
};

const MainApp: React.FC = () => {
  const [currentPage, _setCurrentPage] = useState<Page>(
    () => (sessionStorage.getItem('currentPage') as Page) || 'DASHBOARD'
  );
  const [isDirty, setIsDirty] = useState(false);
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  useEffect(() => {
    sessionStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  const setCurrentPage = (page: Page) => {
    if (page === currentPageRef.current) {
        return;
    }

    if (isDirty) {
      if (window.confirm('You have unsaved changes. Are you sure you want to leave this page?')) {
        setIsDirty(false); 
        _setCurrentPage(page);
      }
    } else {
      _setCurrentPage(page);
    }
  };

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);


  const renderPage = () => {
    const commonProps = { setIsDirty };
    switch (currentPage) {
      case 'DASHBOARD':
        return <Dashboard />;
      case 'CUSTOMERS':
        return <CustomersPage {...commonProps} />;
      case 'SALES':
        return <SalesPage {...commonProps} />;
      case 'PURCHASES':
        return <PurchasesPage {...commonProps} />;
      case 'REPORTS':
        return <ReportsPage />;
      case 'RETURNS':
        return <ReturnsPage {...commonProps} />;
      case 'PRODUCTS':
        return <ProductsPage {...commonProps} />;
      default:
        return <Dashboard />;
    }
  };
  
  const NavItem = ({ page, label, icon: Icon }: { page: Page; label: string; icon: React.ElementType }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${
        currentPage === page ? 'text-white scale-105' : 'text-purple-200 hover:text-white'
      }`}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen font-sans text-text bg-background">
      <Toast />
      <header className="bg-primary text-white shadow-md p-4 flex items-center justify-center">
          <h1 className="text-xl font-bold">Bhavani Sarees</h1>
      </header>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        {renderPage()}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-primary shadow-lg z-50">
        <div className="flex justify-around max-w-2xl mx-auto">
          <NavItem page="DASHBOARD" label="Home" icon={Home} />
          <NavItem page="CUSTOMERS" label="Customers" icon={Users} />
          <NavItem page="SALES" label="Sales" icon={ShoppingCart} />
          <NavItem page="PURCHASES" label="Purchases" icon={Package} />
          <NavItem page="PRODUCTS" label="Products" icon={Boxes} />
          <NavItem page="RETURNS" label="Returns" icon={Undo2} />
          <NavItem page="REPORTS" label="Reports" icon={FileText} />
        </div>
      </nav>
    </div>
  );
};

const App: React.FC = () => (
    <AppProvider>
        <MainApp />
    </AppProvider>
);


export default App;