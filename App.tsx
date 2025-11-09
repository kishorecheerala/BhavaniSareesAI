
import React, { useState } from 'react';
import { Home, Users, ShoppingCart, Package, FileText } from 'lucide-react';

import { AppProvider } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import ReportsPage from './pages/ReportsPage';

type Page = 'DASHBOARD' | 'CUSTOMERS' | 'SALES' | 'PURCHASES' | 'REPORTS';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('DASHBOARD');

  const renderPage = () => {
    switch (currentPage) {
      case 'DASHBOARD':
        return <Dashboard />;
      case 'CUSTOMERS':
        return <CustomersPage />;
      case 'SALES':
        return <SalesPage />;
      case 'PURCHASES':
        return <PurchasesPage />;
      case 'REPORTS':
        return <ReportsPage />;
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
    <AppProvider>
      <div className="flex flex-col h-screen font-sans text-text bg-background">
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
            <NavItem page="REPORTS" label="Reports" icon={FileText} />
          </div>
        </nav>
      </div>
    </AppProvider>
  );
};

export default App;
