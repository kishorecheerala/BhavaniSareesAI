import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IndianRupee, User, AlertTriangle, Download, Upload, ShoppingCart, Package, XCircle, CheckCircle, Info, Calendar, ShieldCheck, ShieldAlert, ShieldX, Archive, PackageCheck, TestTube2, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as db from '../utils/db';
import Card from '../components/Card';
import Button from '../components/Button';
import DataImportModal from '../components/DataImportModal';
import { Page, Customer, Sale } from '../types';
import { testData, testProfile } from '../utils/testData';

interface DashboardProps {
    setCurrentPage: (page: Page) => void;
}

const MetricCard: React.FC<{ icon: React.ElementType, title: string, value: string | number, color: string, unit?: string }> = ({ icon: Icon, title, value, color, unit = '₹' }) => (
    <Card className={`flex items-center p-4 ${color}`}>
        <div className="p-3 bg-white/20 rounded-full">
            <Icon className="w-8 h-8 text-white" />
        </div>
        <div className="ml-4">
            <p className="text-white font-semibold text-lg">{title}</p>
            <p className="text-2xl font-bold text-white">{unit}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
        </div>
    </Card>
);

const BackupStatusCard: React.FC<{ lastBackupDate: string | null }> = ({ lastBackupDate }) => {
    if (!lastBackupDate) {
        return (
            <Card className="border-l-4 border-red-500 bg-red-50">
                <div className="flex items-center">
                    <ShieldX className="w-8 h-8 text-red-600 mr-4" />
                    <div>
                        <p className="font-bold text-red-800">No Backup Found</p>
                        <p className="text-sm text-red-700">Please create a backup immediately to protect your data.</p>
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
    
    let overdueMessage = "Your last backup was not today. Please back up now.";
    if (diffDays > 0) {
        overdueMessage = `Your last backup was ${diffDays} day${diffDays > 1 ? 's' : ''} ago. Please back up now.`;
    }

    const messages = {
        safe: { icon: ShieldCheck, color: 'green', title: 'Data Backup is Up-to-Date', text: `Last backup was today at ${backupDate.toLocaleTimeString()}.` },
        overdue: { icon: ShieldX, color: 'red', title: 'Backup Overdue', text: overdueMessage },
    };

    const current = messages[status];
    const Icon = current.icon;

    return (
        <Card className={`border-l-4 border-${current.color}-500 bg-${current.color}-50`}>
            <div className="flex items-center">
                <Icon className={`w-8 h-8 text-${current.color}-600 mr-4`} />
                <div>
                    <p className={`font-bold text-${current.color}-800`}>{current.title}</p>
                    <p className={`text-sm text-${current.color}-700`}>{current.text}</p>
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
                const amountPaid = (sale.payments || []).reduce((sum, p) => sum + p.amount, 0);
                const dueAmount = sale.totalAmount - amountPaid;

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
                    <ShieldCheck className="w-8 h-8 text-green-600 mr-4" />
                    <div>
                        <p className="font-bold text-green-800">No Overdue Dues</p>
                        <p className="text-sm text-green-700">All customer payments older than 30 days are settled.</p>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <Card className="border-l-4 border-amber-500 bg-amber-50">
            <div className="flex items-center mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600 mr-3" />
                <h2 className="text-lg font-bold text-amber-800">Overdue Dues Alert</h2>
            </div>
            <p className="text-sm text-amber-700 mb-4">The following customers have dues from sales older than 30 days. Please follow up.</p>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {overdueCustomersArray.sort((a, b) => b.totalOverdue - a.totalOverdue).map(({ customer, totalOverdue, oldestOverdueDate }) => (
                    <div
                        key={customer.id}
                        className="p-3 bg-white rounded-lg shadow-sm cursor-pointer hover:bg-amber-100 transition-colors flex justify-between items-center"
                        onClick={() => onNavigate(customer.id)}
                        role="button"
                        tabIndex={0}
                        aria-label={`View details for ${customer.name}`}
                    >
                        <div className="flex items-center gap-3">
                            <User className="w-6 h-6 text-amber-700 flex-shrink-0" />
                            <div>
                                <p className="font-bold text-amber-900">{customer.name}</p>
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


const Dashboard: React.FC<DashboardProps> = ({ setCurrentPage }) => {
    const { state, dispatch, showToast } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [restoreStatus, setRestoreStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const { installPromptEvent } = state;

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
        const amountPaid = (sale.payments || []).reduce((paidSum, p) => paidSum + p.amount, 0);
        const due = sale.totalAmount - amountPaid;
        return sum + (due > 0 ? due : 0);
    }, 0);

    const totalPurchaseDues = state.purchases.reduce((sum, purchase) => {
        const amountPaid = (purchase.payments || []).reduce((paidSum, p) => paidSum + p.amount, 0);
        const due = purchase.totalAmount - amountPaid;
        return sum + (due > 0 ? due : 0);
    }, 0);

    const totalInventoryValue = state.products.reduce((sum, product) => {
        return sum + (product.purchasePrice * product.quantity);
    }, 0);
    
    const totalStockQuantity = state.products.reduce((sum, product) => sum + product.quantity, 0);
    
    const totalSales = state.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalPurchases = state.purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
    
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
            .reduce((sum, sale) => sum + sale.totalAmount, 0);
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
    
    const handleInstallClick = async () => {
        if (!installPromptEvent) {
            return;
        }
        installPromptEvent.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await installPromptEvent.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // We can only use the prompt once, so clear it.
        dispatch({ type: 'SET_INSTALL_PROMPT_EVENT', payload: null });
    };

    const handleNavigateToCustomer = (customerId: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'CUSTOMERS', id: customerId } });
        setCurrentPage('CUSTOMERS');
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
                    color="bg-purple-600 shadow-lg" 
                />
                 <MetricCard 
                    icon={Package} 
                    title="Total Purchases (All Time)" 
                    value={totalPurchases} 
                    color="bg-green-500 shadow-lg" 
                />
                <MetricCard 
                    icon={IndianRupee} 
                    title="Customer Dues" 
                    value={totalCustomerDues} 
                    color="bg-red-500 shadow-lg" 
                />
                <MetricCard 
                    icon={IndianRupee} 
                    title="Purchase Dues" 
                    value={totalPurchaseDues} 
                    color="bg-amber-500 shadow-lg"
                />
                <MetricCard 
                    icon={Archive} 
                    title="Inventory Value" 
                    value={totalInventoryValue} 
                    color="bg-sky-500 shadow-lg" 
                />
                <MetricCard 
                    icon={PackageCheck} 
                    title="Items in Stock" 
                    value={totalStockQuantity} 
                    color="bg-teal-500 shadow-lg"
                    unit="" 
                />
            </div>

            <OverdueDuesCard sales={state.sales} customers={state.customers} onNavigate={handleNavigateToCustomer} />
            
            <Card title="Monthly Sales Report">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg custom-select"
                    >
                        {monthNames.map((month, index) => (
                            <option key={month} value={index}>{month}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full p-2 border rounded-lg custom-select"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg flex flex-col items-center justify-center">
                    <div className="flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-primary"/>
                        <p className="text-lg font-semibold text-primary">Total Sales</p>
                    </div>
                    <p className="text-xs text-gray-500 mb-1">{monthNames[selectedMonth]} {selectedYear}</p>
                    <p className="text-3xl font-bold text-primary">
                        ₹{monthlySalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </p>
                </div>
            </Card>
            
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
                     {installPromptEvent && (
                        <Button
                            onClick={handleInstallClick}
                            className="w-full mt-4 bg-green-600 hover:bg-green-700 focus:ring-green-600"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Install App on Device
                        </Button>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;