import React, { useState, useEffect, useRef } from 'react';
import { Home, Users, ShoppingCart, Package, FileText, Undo2, Boxes, Search, HelpCircle, Bell, Menu, Plus } from 'lucide-react';

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
import NotificationsPanel from './components/NotificationsPanel';
import MenuPanel from './components/MenuPanel';
import ProfileModal from './components/ProfileModal';
import { BeforeInstallPromptEvent, Notification, Page, SelectionPayload } from './types';
import { useOnClickOutside } from './hooks/useOnClickOutside';
import ConfirmationModal from './components/ConfirmationModal';

const Toast = () => {
    const { state } = useAppContext();

    if (!state.toast.show) return null;

    const isSuccess = state.toast.type === 'success';

    const containerClasses = "fixed top-5 inset-x-0 flex justify-center z-[200]";

    const toastClasses = isSuccess
        ? "bg-green-600 text-white px-4 py-2 rounded-full shadow-lg animate-fade-in-out"
        : "bg-gray-800 bg-opacity-90 text-white px-5 py-3 rounded-full shadow-lg animate-fade-in-out";

    return (
        <div className={containerClasses} style={{ pointerEvents: 'none' }}>
            <div className={toastClasses} style={{ pointerEvents: 'auto' }}>
                {state.toast.message}
            </div>
        </div>
    );
};

const MainApp: React.FC = () => {
  const { state, dispatch, isDbLoaded } = useAppContext();
  const { currentPage } = state;
  const [isDirty, setIsDirty] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [navConfirm, setNavConfirm] = useState<{ show: boolean, page: Page | null }>({ show: false, page: null });

  const canExitApp = useRef(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useOnClickOutside(menuRef, () => setIsMenuOpen(false));
  useOnClickOutside(notificationsRef, () => setIsNotificationsOpen(false));
  useOnClickOutside(moreMenuRef, () => setIsMoreMenuOpen(false));

  const lastBackupDate = state.app_metadata.find(m => m.id === 'lastBackup')?.date;

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
    if (!isDbLoaded) return;

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const backupNotificationId = `backup-reminder-${todayStr}`;

    // Filter out any old backup notifications that aren't for today
    const relevantNotifications = state.notifications.filter(n => n.type !== 'backup' || n.id === backupNotificationId);
    
    const lastBackupDay = lastBackupDate ? new Date(lastBackupDate).toISOString().slice(0, 10) : null;
    const isBackupDoneToday = lastBackupDay === todayStr;
    
    let finalNotifications = [...relevantNotifications];
    const existingTodaysNotification = finalNotifications.find(n => n.id === backupNotificationId);

    if (isBackupDoneToday) {
        // If backup is done, remove today's reminder
        finalNotifications = finalNotifications.filter(n => n.id !== backupNotificationId);
    } else {
        // If backup is NOT done, ensure today's reminder exists and is unread
        if (!existingTodaysNotification) {
            const newNotification: Notification = {
                id: backupNotificationId,
                title: 'Backup Reminder',
                message: "Your data hasn't been backed up today. Please create a backup to prevent data loss.",
                read: false,
                createdAt: new Date().toISOString(),
                type: 'backup',
                actionLink: 'DASHBOARD'
            };
            finalNotifications.unshift(newNotification);
        } else if (existingTodaysNotification.read) {
            // This is a safeguard in case it somehow gets marked as read without a backup being made.
            finalNotifications = finalNotifications.map(n => n.id === backupNotificationId ? { ...n, read: false } : n);
        }
    }

    // Only dispatch if the notifications array has actually changed to prevent infinite loops.
    if (JSON.stringify(finalNotifications) !== JSON.stringify(state.notifications)) {
        dispatch({ type: 'SET_NOTIFICATIONS', payload: finalNotifications });
    }
}, [isDbLoaded, lastBackupDate, state.notifications, dispatch]);

  // Unified popstate handler for back button navigation
  useEffect(() => {
    // This state is pushed when the app loads, to trap the first back press.
    window.history.pushState({ guard: 'exit' }, '');

    const handlePopState = (event: PopStateEvent) => {
      // If the search modal is open, the back button press should close it.
      // The `popstate` event means the history has already changed, so we just sync our UI state.
      if (isSearchOpen) {
        setIsSearchOpen(false);
        return; // Stop further execution
      }
      
      // If we are here, it means no modal was open. Handle the double-press-to-exit logic.
      if (event.state?.guard === 'exit') {
        if (canExitApp.current) {
          // Second back press: actually exit.
          window.history.back();
          return;
        }

        // First back press: trap it and show a toast.
        window.history.pushState({ guard: 'exit' }, '');

        canExitApp.current = true;
        dispatch({ type: 'SHOW_TOAST', payload: { message: 'Press back again to exit', type: 'info' } });

        setTimeout(() => {
          canExitApp.current = false;
        }, 2000);
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [dispatch, isSearchOpen]); // Depend on isSearchOpen to correctly handle logic inside the listener.

  const openSearch = () => {
    // Push a new state for the search modal so the back button will close it.
    window.history.pushState({ modal: 'search' }, '');
    setIsSearchOpen(true);
  };

  const closeSearch = () => {
    // To close the modal, we trigger a history.back(). The popstate listener
    // will then see this and update the isSearchOpen state to false.
    window.history.back();
  };
  
  const setCurrentPage = (page: Page) => {
      if (page === currentPage) {
          return;
      }

      if (isDirty) {
          setNavConfirm({ show: true, page });
      } else {
          dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
      }
  };

  const handleSearchResultClick = (selection: SelectionPayload) => {
    dispatch({ type: 'SET_SELECTION', payload: selection });
    dispatch({ type: 'SET_CURRENT_PAGE', payload: selection.page });
    // When navigating from search, we also need to close it.
    closeSearch();
  };
  
  const handleNotificationClick = (page: Page) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
    setIsNotificationsOpen(false);
  }

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
        // FIX: Pass the `setCurrentPage` prop to the Dashboard component.
        return <Dashboard setCurrentPage={setCurrentPage} />;
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
        // FIX: Pass the `setCurrentPage` prop to the Dashboard component.
        return <Dashboard setCurrentPage={setCurrentPage} />;
    }
  };
  
  // FIX: Use React.FC to correctly type the component and handle the 'key' prop, which is managed by React and not part of the component's own props.
  const NavItem: React.FC<{ page: Page; label: string; icon: React.ElementType }> = ({ page, label, icon: Icon }) => (
    <button
      onClick={() => setCurrentPage(page)}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs transition-colors duration-200 ${
        currentPage === page ? 'text-white scale-[1.02]' : 'text-purple-200 hover:text-white'
      }`}
    >
      <Icon className="w-6 h-6 mb-1" />
      <span>{label}</span>
    </button>
  );
  
  const hasUnreadNotifications = state.notifications.some(n => !n.read);

  const mainNavItems = [
    { page: 'DASHBOARD' as Page, label: 'Home', icon: Home },
    { page: 'CUSTOMERS' as Page, label: 'Customers', icon: Users },
    { page: 'SALES' as Page, label: 'Sales', icon: ShoppingCart },
    { page: 'PURCHASES' as Page, label: 'Purchases', icon: Package },
  ];

  const moreNavItems = [
      { page: 'PRODUCTS' as Page, label: 'Products', icon: Boxes },
      { page: 'RETURNS' as Page, label: 'Returns', icon: Undo2 },
      { page: 'REPORTS' as Page, label: 'Reports', icon: FileText },
  ];

  const allNavItems = [...mainNavItems, ...moreNavItems];
  const isMoreMenuActive = moreNavItems.some(item => item.page === currentPage);


  return (
    <div className="flex flex-col h-screen font-sans text-text bg-background">
      <Toast />
      <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <UniversalSearch 
        isOpen={isSearchOpen} 
        onClose={closeSearch} 
        onNavigate={handleSearchResultClick} 
      />
      <ConfirmationModal
          isOpen={navConfirm.show}
          onClose={() => setNavConfirm({ show: false, page: null })}
          onConfirm={() => {
              if (navConfirm.page) {
                  setIsDirty(false); 
                  dispatch({ type: 'SET_CURRENT_PAGE', payload: navConfirm.page });
              }
              setNavConfirm({ show: false, page: null });
          }}
          title="Unsaved Changes"
          confirmText="Leave Page"
          cancelText="Stay"
          confirmVariant="danger"
      >
          You have unsaved changes that will be lost. Are you sure you want to leave this page?
      </ConfirmationModal>
      <header className="bg-primary text-white shadow-md p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative" ref={menuRef}>
              <button onClick={() => setIsMenuOpen(prev => !prev)} className="p-1 rounded-full hover:bg-white/20 transition-colors" aria-label="Open menu">
                  <Menu className="w-6 h-6" />
              </button>
              <MenuPanel 
                  isOpen={isMenuOpen}
                  onClose={() => setIsMenuOpen(false)}
                  onProfileClick={() => {
                      setIsMenuOpen(false);
                      setIsProfileOpen(true);
                  }}
              />
            </div>
            <button onClick={openSearch} className="p-1 rounded-full hover:bg-white/20 transition-colors" aria-label="Open search">
              <Search className="w-6 h-6" />
            </button>
          </div>
          <h1 className="text-xl font-bold text-center">Bhavani Sarees</h1>
          <div className="flex items-center gap-2">
            <div className="relative" ref={notificationsRef}>
                 <button onClick={() => setIsNotificationsOpen(prev => !prev)} className="p-1 rounded-full hover:bg-white/20 transition-colors" aria-label="Open notifications">
                    <Bell className="w-6 h-6" />
                </button>
                {hasUnreadNotifications && (
                    <span className="absolute top-0 right-0 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-primary ring-white"></span>
                )}
                 <NotificationsPanel 
                    isOpen={isNotificationsOpen} 
                    onClose={() => setIsNotificationsOpen(false)}
                    onNavigate={handleNotificationClick}
                 />
            </div>
            <button onClick={() => setIsHelpOpen(true)} className="p-1 rounded-full hover:bg-white/20 transition-colors" aria-label="Open help">
                <HelpCircle className="w-6 h-6" />
            </button>
          </div>
      </header>

      <main className="flex-grow overflow-y-auto p-4 pb-20">
        <div key={currentPage} className="animate-fade-in-fast">
          {renderPage()}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-primary shadow-lg z-50">
        {/* Desktop nav */}
        <div className="hidden md:flex justify-around max-w-2xl mx-auto">
            {allNavItems.map(item => <NavItem key={item.page} page={item.page} label={item.label} icon={item.icon} />)}
        </div>

        {/* Mobile nav */}
        <div className="flex md:hidden justify-around max-w-2xl mx-auto">
            {mainNavItems.map(item => <NavItem key={item.page} page={item.page} label={item.label} icon={item.icon} />)}
            <div className="relative flex flex-col items-center justify-center w-full pt-2 pb-1" ref={moreMenuRef}>
                 <button
                    onClick={() => setIsMoreMenuOpen(prev => !prev)}
                    className={`flex flex-col items-center justify-center w-full h-full text-xs transition-colors duration-200 ${
                        isMoreMenuActive ? 'text-white scale-[1.02]' : 'text-purple-200 hover:text-white'
                    }`}
                    aria-haspopup="true"
                    aria-expanded={isMoreMenuOpen}
                    >
                    <Plus className="w-6 h-6 mb-1" />
                    <span>More</span>
                </button>

                {isMoreMenuOpen && (
                    <div className="absolute bottom-full right-0 mb-2 w-48 bg-white rounded-lg shadow-xl border text-text z-10 animate-slide-up-fade">
                        {moreNavItems.map(item => (
                            <button 
                                key={item.page} 
                                onClick={() => {
                                    setCurrentPage(item.page);
                                    setIsMoreMenuOpen(false);
                                }} 
                                className="w-full flex items-center gap-3 p-3 text-left hover:bg-purple-50 transition-colors"
                            >
                                <item.icon className="w-5 h-5 text-primary" />
                                <span className={`font-semibold text-sm ${currentPage === item.page ? 'text-primary' : ''}`}>
                                    {item.label}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
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
