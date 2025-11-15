import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IndianRupee, User, AlertTriangle, Download, Upload, ShoppingCart, Package, XCircle, CheckCircle, Info, Calendar, ShieldCheck, ShieldAlert, ShieldX, Archive, PackageCheck, TestTube2, TrendingUp, Users } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as db from '../utils/db';
import Card from '../components/Card';
import Button from '../components/Button';
import DataImportModal from '../components/DataImportModal';
import { Page, Customer, Sale, Purchase, Supplier } from '../types';
import { testData, testProfile } from '../utils/testData';

interface DashboardProps {
    setCurrentPage: (page: Page) => void;
}

const MetricCard: React.FC<{
    icon: React.ElementType;
    title: string;
    value: string | number;
    color: string;
    iconBgColor: string;
    textColor: string;
    unit?: string;
    onClick?: () => void;
}> = ({ icon: Icon, title, value, color, iconBgColor, textColor, unit = '₹', onClick }) => (
    <div
        onClick={onClick}
        className={`rounded-lg shadow-md p-4 flex items-center transition-all duration-300 hover:shadow-xl hover:scale-[1.01] ${color} ${onClick ? 'cursor-pointer' : ''}`}
        role={onClick ? 'button' : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
    >
        <div className={`p-3 ${iconBgColor} rounded-full flex-shrink-0`}>
            <Icon className={`w-8 h-8 ${textColor}`} />
        </div>
        <div className="ml-4 flex-grow">
            <p className={`font-semibold text-lg ${textColor}`}>{title}</p>
            <p className={`text-2xl font-bold ${textColor} break-all`}>{unit}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
        </div>
    </div>
);

const BackupStatusCard: React.FC<{ lastBackupDate: string | null }> = ({ lastBackupDate }) => {
    if (!lastBackupDate) {
        return (
            <Card className="bg-red-600 text-white">
                <div className="flex items-center">
                    <ShieldX className="w-8 h-8 mr-4" />
                    <div>
                        <p className="font-bold">No Backup Found</p>
                        <p className="text-sm opacity-90">Please create a backup immediately to protect your data.</p>
                    </div>
                </div>
            </Card>
        );
    }

    const now = new Date();
    const backupDate = new Date(lastBackupDate);
    
    const todayStr = now.toISOString().slice(0, 10);
    const backupDateStr = backupDate.toISOString().slice(0, 10);

    const status = backupDateStr === todayStr ? 'safe' : 'overdue';
    const diffDays = Math.floor((now.getTime() - backupDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const statusInfo = {
        safe: {
            icon: ShieldCheck,
            cardClass: 'bg-green-600 text-white',
            title: 'Data Backup is Up-to-Date',
            text: `Last backup was today at ${backupDate.toLocaleTimeString()}.`
        },
        overdue: {
            icon: ShieldX,
            cardClass: 'bg-red-600 text-white',
            title: 'Backup Overdue',
            text: diffDays > 0 ? `Your last backup was ${diffDays} day${diffDays > 1 ? 's' : ''} ago. Please back up now.` : "Your last backup was not today. Please back up now."
        },
    };

    const current = statusInfo[status];
    const Icon = current.icon;

    return (
        <Card className={current.cardClass}>
            <div className="flex items-center">
                <Icon className="w-8 h-8 mr-4" />
                <div>
                    <p className="font-bold">{current.title}</p>
                    <p className="text-sm opacity-90">{current.text}</p>
                </div>
            </div>
        </Card>
    );
};

const StatusNotification: React.FC<{ status: { type: 'info' | 'success' | 'error', message: string } | null; onClose: () => void; }> = ({ status, onClose }) => {
    if (!status) return null;

    const baseClasses = "p-3 rounded-md mb-4 text-sm flex items-start justify-between";
    const variants = {
        info: 'bg-blue-100 text-blue-800',
        success: 'bg-green-100 text-green-800',
        error: 'bg-red-100 text-red-800',
    };
    const icons = {
        info: <Info className="w-5 h-5 mr-3 flex-shrink-0" />,
        success: <CheckCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
        error: <XCircle className="w-5 h-5 mr-3 flex-shrink-0" />,
    };

    return (
        <div className={`${baseClasses} ${variants[status.type]}`}>
            <div className="flex items-start">
                {icons[status.type]}
                <span>{status.message}</span>
            </div>
            <button onClick={onClose} className="font-bold text-lg leading-none ml-4">&times;</button>
        </div>
    );
};

const OverdueDuesCard: React.FC<{ sales: Sale[]; customers: Customer[]; onNavigate: (customerId: string) => void; }> = ({ sales, customers, onNavigate }) => {
    const overdueCustomersArray = useMemo(() => {
        const overdueCustomers: { [key: string]: { customer: Customer; totalOverdue: number; oldestOverdueDate: string } } = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        sales.forEach(sale => {
            const saleDate = new Date(sale.date);

            if (saleDate < thirtyDaysAgo) {
                const amountPaid = (sale.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
                const dueAmount = Number(sale.totalAmount) - amountPaid;

                if (dueAmount > 0.01) {
                    const customerId = sale.customerId;
                    if (!overdueCustomers[customerId]) {
                        const customer = customers.find(c => c.id === customerId);
                        if (customer) {
                            overdueCustomers[customerId] = {
                                customer: customer,
                                totalOverdue: 0,
                                oldestOverdueDate: sale.date
                            };
                        }
                    }

                    if (overdueCustomers[customerId]) {
                        overdueCustomers[customerId].totalOverdue += dueAmount;
                        if (new Date(sale.date) < new Date(overdueCustomers[customerId].oldestOverdueDate)) {
                            overdueCustomers[customerId].oldestOverdueDate = sale.date;
                        }
                    }
                }
            }
        });

        return Object.values(overdueCustomers);
    }, [sales, customers]);

    if (overdueCustomersArray.length === 0) {
        return (
            <Card className="border-l-4 border-green-500 bg-green-50">
                <div className="flex items-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mr-4" />
                    <div>
                        <p className="font-bold text-green-800">No Overdue Dues</p>
                        <p className="text-sm text-green-700">All customer payments older than 30 days are settled.</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border-l-4 border-rose-500 bg-rose-50">
            <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-600 mr-3" />
                <h2 className="text-lg font-bold text-rose-800">Overdue Dues Alert</h2>
            </div>
            <p className="text-sm text-rose-700 mb-4">The following customers have dues from sales older than 30 days. Please follow up.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {overdueCustomersArray.sort((a, b) => b.totalOverdue - a.totalOverdue).map(({ customer, totalOverdue, oldestOverdueDate }) => (
                    <div
                        key={customer.id}
                        className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-rose-100 transition-colors flex justify-between items-center"
                        onClick={() => onNavigate(customer.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${customer.name}`}
                    >
                        <div className="flex items-center gap-3">
                            <User className="w-6 h-6 text-rose-700 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-rose-900">{customer.name}</p>
                                <p className="text-xs text-gray-500">{customer.area}</p>
                            </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                            <p className="font-bold text-lg text-red-600">₹{totalOverdue.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-500">Oldest: {new Date(oldestOverdueDate).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
};

const UpcomingPurchaseDuesCard: React.FC<{ 
    purchases: Purchase[]; 
    suppliers: Supplier[]; 
    onNavigate: (supplierId: string) => void; 
}> = ({ purchases, suppliers, onNavigate }) => {
    const upcomingDues = useMemo(() => {
        const dues: {
            purchaseId: string;
            supplier: Supplier;
            totalPurchaseDue: number;
            dueDate: Date;
            daysRemaining: number;
        }[] = [];

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        thirtyDaysFromNow.setHours(23, 59, 59, 999);

        purchases.forEach(purchase => {
            const amountPaid = (purchase.payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
            const dueAmount = Number(purchase.totalAmount) - amountPaid;

            if (dueAmount > 0.01 && purchase.paymentDueDates && purchase.paymentDueDates.length > 0) {
                const supplier = suppliers.find(s => s.id === purchase.supplierId);
                if (!supplier) return;

                purchase.paymentDueDates.forEach(dateStr => {
                    const dueDate = new Date(dateStr + 'T00:00:00'); // Treat date string as local time
                    
                    if (dueDate >= today && dueDate <= thirtyDaysFromNow) {
                        const timeDiff = dueDate.getTime() - today.getTime();
                        const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
                        
                        dues.push({
                            purchaseId: purchase.id,
                            supplier: supplier,
                            totalPurchaseDue: dueAmount,
                            dueDate: dueDate,
                            daysRemaining: daysRemaining,
                        });
                    }
                });
            }
        });

        return dues.sort((a, b) => a.daysRemaining - b.daysRemaining);
    }, [purchases, suppliers]);

    if (upcomingDues.length === 0) {
        return (
            <Card className="border-l-4 border-green-500 bg-green-50">
                <div className="flex items-center">
                    <PackageCheck className="w-8 h-8 text-green-600 mr-4" />
                    <div>
                        <p className="font-bold text-green-800">No Upcoming Purchase Dues</p>
                        <p className="text-sm text-green-700">There are no payment dues to suppliers in the next 30 days.</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border-l-4 border-amber-500 bg-amber-50">
            <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 mr-3" />
                <h2 className="text-lg font-bold text-amber-800">Upcoming Purchase Dues</h2>
            </div>
            <p className="text-sm text-amber-700 mb-4">The following payments to suppliers are due within the next 30 days.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {upcomingDues.map((due) => {
                    const countdownText = due.daysRemaining === 0
                        ? "Due today"
                        : `Due in ${due.daysRemaining} day${due.daysRemaining !== 1 ? 's' : ''}`;
                    return (
                        <div
                            key={`${due.purchaseId}-${due.dueDate.toISOString()}`}
                            className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-amber-100 transition-colors flex justify-between items-center"
                            onClick={() => onNavigate(due.supplier.id)}
                            role="button"
                            tabIndex={0}
                            aria-label={`View details for ${due.supplier.name}`}
                        >
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-amber-700 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-amber-900">{due.supplier.name}</p>
                                    <p className="text-xs text-gray-500">Invoice: {due.purchaseId}</p>
                                </div>
                            </div>
                            <div className="text-right flex-shrink-0 ml-2">
                                <p className="font-bold text-lg text-red-600">₹{due.totalPurchaseDue.toLocaleString('en-IN')}</p>
                                <p className="text-xs font-bold text-amber-800">{countdownText}</p>
                                <p className="text-xs text-gray-500">on {due.dueDate.toLocaleDateString()}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
};


const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [restoreStatus, setRestoreStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    useEffect(() => {
        const fetchLastBackup = async () => {
            const date = await db.getLastBackupDate();
            setLastBackupDate(date);
        };
        fetchLastBackup();
    }, [state.app_metadata]);

    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    const totalCustomerDues = state.sales.reduce((sum, sale) => {
        const amountPaid = (sale.payments || []).reduce((paidSum, p) => paidSum + Number(p.amount), 0);
        const due = Number(sale.totalAmount) - amountPaid;
        return sum + (due > 0 ? due : 0);
    }, 0);

    const totalPurchaseDues = state.purchases.reduce((sum, purchase) => {
        const amountPaid = (purchase.payments || []).reduce((paidSum, p) => paidSum + Number(p.amount), 0);
        const due = Number(purchase.totalAmount) - amountPaid;
        return sum + (due > 0 ? due : 0);
    }, 0);

    const totalInventoryValue = state.products.reduce((sum, product) => {
        return sum + (Number(product.purchasePrice) * Number(product.quantity));
    }, 0);
    
    const totalStockQuantity = state.products.reduce((sum, product) => sum + Number(product.quantity), 0);
    
    const totalSales = state.sales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    const totalPurchases = state.purchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount), 0);
    
    const availableYears = useMemo(() => {
        const years = new Set(state.sales.map(s => new Date(s.date).getFullYear()));
        if (!years.has(new Date().getFullYear())) {
            years.add(new Date().getFullYear());
        }
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [state.sales]);

    const monthlySalesTotal = useMemo(() => {
        return state.sales
            .filter(sale => {
                const saleDate = new Date(sale.date);
                return saleDate.getFullYear() === selectedYear && saleDate.getMonth() === selectedMonth;
            })
            .reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
    }, [state.sales, selectedMonth, selectedYear]);
    
    const handleBackup = async () => {
        try {
            const data = await db.exportData();
            if ((!data.customers || data.customers.length === 0) && (!data.products || data.products.length === 0)) {
                 showToast('No data to backup.', 'info');
                return;
            }
            const dataString = JSON.stringify(data, null, 2);
            const blob = new Blob([dataString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `bhavani-sarees-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            await db.setLastBackupDate();
            dispatch({ type: 'SET_LAST_BACKUP_DATE', payload: new Date().toISOString() });
            
            showToast('Backup successful! Save the downloaded file in a safe place.');
        } catch (error) {
            console.error('Backup failed:', error);
            showToast('Backup failed. Please try again.', 'info');
        }
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        setRestoreStatus({ type: 'info', message: 'Starting restore process...' });
        const file = event.target.files?.[0];

        if (!file) {
            setRestoreStatus({ type: 'error', message: 'No file selected. Restore cancelled.' });
            return;
        }

        if (!window.confirm('Are you sure you want to restore data? This will overwrite all current data in the app.')) {
            if (fileInputRef.current) fileInputRef.current.value = "";
            setRestoreStatus(null);
            return;
        }

        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                setRestoreStatus({ type: 'info', message: 'File read. Validating data...' });
                const text = e.target?.result;
                if (typeof text !== 'string') {
                    throw new Error("File content is not readable as text.");
                }
                
                const parsedData = JSON.parse(text);

                if (!parsedData || typeof parsedData !== 'object') {
                    throw new Error("Backup file does not contain a valid object.");
                }

                setRestoreStatus({ type: 'info', message: 'Data validated. Importing to database...' });
                await db.importData(parsedData);
                
                const validatedState = {
                    customers: Array.isArray(parsedData.customers) ? parsedData.customers : [],
                    suppliers: Array.isArray(parsedData.suppliers) ? parsedData.suppliers : [],
                    products: Array.isArray(parsedData.products) ? parsedData.products : [],
                    sales: Array.isArray(parsedData.sales) ? parsedData.sales : [],
                    purchases: Array.isArray(parsedData.purchases) ? parsedData.purchases : [],
                    returns: Array.isArray(parsedData.returns) ? parsedData.returns : [],
                    app_metadata: Array.isArray(parsedData.app_metadata) ? parsedData.app_metadata : [],
                };
                dispatch({ type: 'SET_STATE', payload: validatedState });
                showToast('Data restored successfully!');
                setTimeout(() => {
                   setRestoreStatus({ type: 'success', message: 'Data restored successfully! The app is now using the new data.' });
                }, 100);

            } catch (error) {
                console.error('Restore failed:', error);
                setRestoreStatus({ type: 'error', message: `Restore failed: ${(error as Error).message}` });
            } finally {
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        };
        
        reader.onerror = (error) => {
            console.error('FileReader error:', error);
            setRestoreStatus({ type: 'error', message: 'Failed to read the backup file. It might be corrupted or inaccessible.' });
            if (fileInputRef.current) fileInputRef.current.value = "";
        };

        reader.readAsText(file);
    };

    const handleNavigateToCustomer = (customerId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'CUSTOMERS', id: customerId } });
        setCurrentPage('CUSTOMERS');
    };

    const handleNavigateToSupplier = (supplierId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'PURCHASES', id: supplierId } });
        setCurrentPage('PURCHASES');
    };

    const handleLoadDemoData = () => {
        if (window.confirm('Are you sure you want to load demo data? This will overwrite ALL existing data in the app.')) {
            dispatch({ type: 'SET_STATE', payload: testData });
            dispatch({ type: 'SET_PROFILE', payload: testProfile });
            showToast('Demo data loaded successfully!');
        }
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="space-y-6">
            <DataImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
            <h1 className="text-2xl font-bold text-primary">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <MetricCard 
                    icon={ShoppingCart} 
                    title="Total Sales (All Time)" 
                    value={totalSales} 
                    color="bg-teal-100"
                    iconBgColor="bg-teal-200"
                    textColor="text-teal-900"
                    onClick={() => setCurrentPage('SALES')}
                />
                 <MetricCard 
                    icon={Package} 
                    title="Total Purchases (All Time)" 
                    value={totalPurchases} 
                    color="bg-emerald-100"
                    iconBgColor="bg-emerald-200"
                    textColor="text-emerald-900"
                    onClick={() => setCurrentPage('PURCHASES')}
                />
                <MetricCard 
                    icon={IndianRupee} 
                    title="Customer Dues" 
                    value={totalCustomerDues} 
                    color="bg-rose-100"
                    iconBgColor="bg-rose-200"
                    textColor="text-rose-900"
                    onClick={() => setCurrentPage('CUSTOMERS')}
                />
                <MetricCard 
                    icon={IndianRupee} 
                    title="Purchase Dues" 
                    value={totalPurchaseDues} 
                    color="bg-amber-100"
                    iconBgColor="bg-amber-200"
                    textColor="text-amber-900"
                    onClick={() => setCurrentPage('PURCHASES')}
                />
                <MetricCard 
                    icon={Archive} 
                    title="Inventory Value" 
                    value={totalInventoryValue} 
                    color="bg-sky-100"
                    iconBgColor="bg-sky-200"
                    textColor="text-sky-900"
                    onClick={() => setCurrentPage('PRODUCTS')}
                />
                <MetricCard 
                    icon={PackageCheck} 
                    title="Items in Stock" 
                    value={totalStockQuantity} 
                    color="bg-cyan-100"
                    iconBgColor="bg-cyan-200"
                    textColor="text-cyan-900"
                    unit=""
                    onClick={() => setCurrentPage('PRODUCTS')}
                />
            </div>

            <OverdueDuesCard sales={state.sales} customers={state.customers} onNavigate={handleNavigateToCustomer} />
            
            <UpcomingPurchaseDuesCard purchases={state.purchases} suppliers={state.suppliers} onNavigate={handleNavigateToSupplier} />
            
            <Card title="Backup & Restore">
                <div className="space-y-4">
                    <BackupStatusCard lastBackupDate={lastBackupDate} />
                    <p className="text-sm text-gray-600">
                        Your data is stored on this device. Backup regularly to prevent data loss if you clear browser data or change devices.
                    </p>
                    <StatusNotification status={restoreStatus} onClose={() => setRestoreStatus(null)} />
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Button onClick={handleBackup} className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Backup (JSON)
                        </Button>
                        <Button onClick={() => setIsImportModalOpen(true)} variant="secondary" className="w-full">
                            <Upload className="w-4 h-4 mr-2" />
                            Import (CSV)
                        </Button>
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full">
                            <Upload className="w-4 h-4 mr-2" />
                            Restore (JSON)
                        </Button>
                         <Button onClick={handleLoadDemoData} variant="info" className="w-full sm:col-span-3">
                            <TestTube2 className="w-4 h-4 mr-2" />
                            Load Demo Data
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;