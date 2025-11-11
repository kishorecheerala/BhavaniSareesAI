

import React, { useState, useEffect, useRef } from 'react';
import { Home, Users, ShoppingCart, Package, FileText, Undo2, Boxes, Search, HelpCircle } from 'lucide-react';

import { AppProvider, useAppContext } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import ReportsPage from './pages/ReportsPage';
import ReturnsPage from './pages/ReturnsPage';
import ProductsPage from './pages/ProductsPage';
import UniversalSearch from './components/UniversalSearch';
import HelpModal from './components/HelpModal';
import AppSkeletonLoader from './components/AppSkeletonLoader';
import { BeforeInstallPromptEvent } from './types';

export type Page = 'DASHBOARD' | 'CUSTOMERS' | 'SALES' | 'PURCHASES' | 'REPORTS' | 'RETURNS' | 'PRODUCTS';

const Toast = () => {
    const { state } = useAppContext();

    if (!state.toast.show) return null;

    const isSuccess = state.toast.type === 'success';

    const toastClasses = isSuccess
        ? "fixed top-5 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-full shadow-lg z-[200] animate-fade-in-out"
        : "fixed bottom-20 left-1/2 -translate-x-1/2 bg-gray-800 bg-opacity-90 text-white px-5 py-3 rounded-full shadow-lg z-[200] animate-fade-in-out";

    return (
        <div className={toastClasses}>
            {state.toast.message}
        </div>
    );
};

const MainApp: React.FC = () => {
  const [currentPage, _setCurrentPage] = useState<Page>(
    () => (sessionStorage.getItem('currentPage') as Page) || 'DASHBOARD'
  );
  const [isDirty, setIsDirty] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const { dispatch } = useAppContext();
  const canExitApp = useRef(false);

  useEffect(() => {
    sessionStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        dispatch({ type: 'SET_INSTALL_PROMPT_EVENT', payload: e as BeforeInstallPromptEvent });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [dispatch]);

  useEffect(() => {
    // Add a second state to the history stack so we can intercept the first back press
    window.history.pushState(null, '', window.location.href);

    const handlePopState = (event: PopStateEvent) => {
      if (canExitApp.current) {
        // Second back press, allow app to exit.
        // We need to go back one more time to exit the PWA.
        window.history.back();
        return;
      }

      // First back press, trap it.
      // Push the state again to keep the user on the current page
      window.history.pushState(null, '', window.location.href);

      canExitApp.current = true;
      dispatch({ type: 'SHOW_TOAST', payload: { message: 'Press back again to exit', type: 'info' } });

      setTimeout(() => {
        canExitApp.current = false;
      }, 2000); // 2-second window to exit
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [dispatch]); // Run only once on mount


  const setCurrentPage = (page: Page) => {
    if (page === currentPage) {
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

  const handleSearchResultClick = (page: Page, id: string) => {
    dispatch({ type: 'SET_SELECTION', payload: { page, id } });
    _setCurrentPage(page);
    setIsSearchOpen(false);
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
  
  const NavItem = ({ page, label, icon: Icon, action }: { page?: Page; label: string; icon: React.ElementType, action?: () => void }) => (
    <button
      onClick={() => page ? setCurrentPage(page) : action?.()}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${
        currentPage === page ? 'text-white scale-[1.02]' : 'text-purple-200 hover:text-white'
      }`}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-screen font-sans text-text bg-background">
      <Toast />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <UniversalSearch 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
        onNavigate={handleSearchResultClick} 
      />
      <header className="bg-gradient-to-r from-primary to-secondary text-white shadow-md p-4 flex items-center justify-between">
          <div className="w-8"></div> {/* Spacer */}
          <h1 className="text-xl font-bold text-center">Bhavani Sarees</h1>
          <button onClick={() => setIsHelpOpen(true)} className="p-1 rounded-full hover:bg-white/20 transition-colors" aria-label="Open help">
            <HelpCircle className="w-6 h-6" />
          </button>
      </header>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        <div key={currentPage} className="animate-fade-in-fast">
          {renderPage()}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-primary shadow-lg z-50">
        <div className="flex justify-around max-w-2xl mx-auto">
          <NavItem page="DASHBOARD" label="Home" icon={Home} />
          <NavItem page="CUSTOMERS" label="Customers" icon={Users} />
          <NavItem page="SALES" label="Sales" icon={ShoppingCart} />
          <NavItem label="Search" icon={Search} action={() => setIsSearchOpen(true)} />
          <NavItem page="PURCHASES" label="Purchases" icon={Package} />
          <NavItem page="PRODUCTS" label="Products" icon={Boxes} />
          <NavItem page="RETURNS" label="Returns" icon={Undo2} />
          <NavItem page="REPORTS" label="Reports" icon={FileText} />
        </div>
      </nav>
    </div>
  );
};

const AppContent: React.FC = () => {
    const { isDbLoaded } = useAppContext();

    if (!isDbLoaded) {
        return <AppSkeletonLoader />;
    }
    return <MainApp />;
};

const App: React.FC = () => (
    <AppProvider>
        <AppContent />
    </AppProvider>
);


export default App;