import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import CustomersPage from './pages/CustomersPage';
import SalesPage from './pages/SalesPage';
import PurchasesPage from './pages/PurchasesPage';
import ProductsPage from './pages/ProductsPage';
import ReportsPage from './pages/ReportsPage';
import ReturnsPage from './pages/ReturnsPage';
import { Home, Users, ShoppingCart, Package, Archive, FileText, Undo2, Menu, X } from 'lucide-react';

type Page = 'dashboard' | 'customers' | 'sales' | 'purchases' | 'products' | 'returns' | 'reports';

const App: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [isDirty, setIsDirty] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; // Required for Chrome
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty]);
    
    const navigate = (page: Page) => {
        if (isDirty && !window.confirm('You have unsaved changes. Are you sure you want to leave?')) {
            return;
        }
        setCurrentPage(page);
        setIsDirty(false); // Reset dirty state on successful navigation
        setIsMenuOpen(false); // Close menu on navigation
    };

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard />;
            case 'customers':
                return <CustomersPage setIsDirty={setIsDirty} />;
            case 'sales':
                return <SalesPage setIsDirty={setIsDirty} navigate={navigate} />;
            case 'purchases':
                return <PurchasesPage setIsDirty={setIsDirty} />;
            case 'products':
                return <ProductsPage setIsDirty={setIsDirty} />;
            case 'returns':
                return <ReturnsPage setIsDirty={setIsDirty} />;
            case 'reports':
                return <ReportsPage />;
            default:
                return <Dashboard />;
        }
    };
    
    const NavLink: React.FC<{ page: Page, icon: React.ReactNode, children: React.ReactNode }> = ({ page, icon, children }) => (
        <button
            onClick={() => navigate(page)}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentPage === page ? 'bg-primary text-white font-semibold' : 'text-gray-600 hover:bg-purple-100'
            }`}
        >
            {icon}
            {children}
        </button>
    );

    const sidebarContent = (
         <nav className="flex flex-col gap-2 p-4">
            <NavLink page="dashboard" icon={<Home size={20} />}>Dashboard</NavLink>
            <NavLink page="sales" icon={<ShoppingCart size={20} />}>New Sale</NavLink>
            <NavLink page="customers" icon={<Users size={20} />}>Customers</NavLink>
            <NavLink page="purchases" icon={<Package size={20} />}>Purchases</NavLink>
            <NavLink page="products" icon={<Archive size={20} />}>Products</NavLink>
            <NavLink page="returns" icon={<Undo2 size={20} />}>Returns</NavLink>
            <NavLink page="reports" icon={<FileText size={20} />}>Reports</NavLink>
        </nav>
    );

    return (
        <AppProvider>
            <div className="flex min-h-screen bg-gray-50">
                {/* Desktop Sidebar */}
                <aside className="hidden lg:block w-64 bg-white border-r flex-shrink-0">
                    <div className="h-16 flex items-center justify-center border-b">
                        <h1 className="text-xl font-bold text-primary">Bhavani Sarees</h1>
                    </div>
                    {sidebarContent}
                </aside>

                 {/* Mobile Menu */}
                <div className={`fixed inset-0 z-40 lg:hidden transition-transform transform ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                   <div className="absolute inset-0 bg-black/50" onClick={() => setIsMenuOpen(false)}></div>
                   <aside className="relative w-64 bg-white h-full">
                       <div className="h-16 flex items-center justify-between border-b px-4">
                           <h1 className="text-xl font-bold text-primary">Bhavani Sarees</h1>
                           <button onClick={() => setIsMenuOpen(false)} className="p-2">
                               <X />
                           </button>
                       </div>
                       {sidebarContent}
                   </aside>
                </div>

                <div className="flex-1 flex flex-col">
                     <header className="lg:hidden h-16 bg-white border-b flex items-center px-4">
                        <button onClick={() => setIsMenuOpen(true)} className="p-2">
                            <Menu />
                        </button>
                        <h1 className="text-lg font-bold text-primary ml-4 capitalize">{currentPage}</h1>
                    </header>
                    <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
                        {renderPage()}
                    </main>
                </div>
            </div>
        </AppProvider>
    );
};

export default App;
