import React, { useState, useMemo, useRef, useEffect } from 'react';
import { IndianRupee, UserCheck, AlertTriangle, Download, Upload, ShoppingCart, Package, XCircle, CheckCircle, Info, Calendar, ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import * as db from '../utils/db';
import Card from '../components/Card';
import Button from '../components/Button';

const Dashboard: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [restoreStatus, setRestoreStatus] = useState<{ type: 'info' | 'success' | 'error', message: string } | null>(null);
    const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);

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

    const lowStockProducts = state.products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
    
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
            if (!data.customers || data.customers.length === 0) {
                 alert('No data to backup.');
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
            
            alert('Backup successful! Save the downloaded file in a safe place.');
        } catch (error) {
            console.error('Backup failed:', error);
            alert('Backup failed. Please try again.');
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


    const MetricCard = ({ icon: Icon, title, value, color, unit = '₹' }: {icon: React.ElementType, title: string, value: string | number, color: string, unit?: string}) => (
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

    const BackupStatusCard = () => {
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
        const diffHours = (now.getTime() - backupDate.getTime()) / (1000 * 60 * 60);
        const diffDays = Math.floor(diffHours / 24);

        let status: 'safe' | 'warning' | 'overdue' = 'safe';
        if (diffDays > 7) {
            status = 'overdue';
        } else if (diffDays > 2) {
            status = 'warning';
        }

        const messages = {
            safe: { icon: ShieldCheck, color: 'green', title: 'Data Backup is Up-to-Date', text: `Last backup was ${backupDate.toLocaleString()}.` },
            warning: { icon: ShieldAlert, color: 'amber', title: 'Backup Recommended', text: `Your last backup was ${diffDays} days ago.` },
            overdue: { icon: ShieldX, color: 'red', title: 'Backup Overdue', text: `Your last backup was over a week ago. Please back up now.` },
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

    const StatusNotification = () => {
        if (!restoreStatus) return null;

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
            <div className={`${baseClasses} ${variants[restoreStatus.type]}`}>
                <div className="flex items-start">
                    {icons[restoreStatus.type]}
                    <span>{restoreStatus.message}</span>
                </div>
                <button onClick={() => setRestoreStatus(null)} className="font-bold text-lg leading-none ml-4">&times;</button>
            </div>
        );
    };

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <MetricCard 
                    icon={ShoppingCart} 
                    title="Total Sales (All Time)" 
                    value={totalSales} 
                    color="bg-gradient-to-br from-purple-600 to-amber-400 shadow-lg" 
                />
                 <MetricCard 
                    icon={Package} 
                    title="Total Purchases (All Time)" 
                    value={totalPurchases} 
                    color="bg-gradient-to-br from-green-500 to-lime-400 shadow-lg" 
                />
                <MetricCard 
                    icon={IndianRupee} 
                    title="Customer Dues" 
                    value={totalCustomerDues} 
                    color="bg-gradient-to-br from-red-500 to-rose-600 shadow-lg" 
                />
                <MetricCard 
                    icon={IndianRupee} 
                    title="Purchase Dues" 
                    value={totalPurchaseDues} 
                    color="bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg"
                />
                <Card title="Monthly Sales Report" className="md:col-span-2">
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
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-lg font-semibold text-primary">Sales for {monthNames[selectedMonth]} {selectedYear}</p>
                        <p className="text-3xl font-bold text-primary mt-2">
                            ₹{monthlySalesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </Card>
                 <MetricCard 
                    icon={AlertTriangle} 
                    title="Low Stock Items" 
                    value={lowStockProducts} 
                    color="bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg"
                    unit=""
                />
            </div>
            
            <Card title="Backup & Restore">
                <div className="space-y-4">
                    <BackupStatusCard />
                    <p className="text-sm text-gray-600">
                        Your data is stored on this device. Backup regularly to prevent data loss if you clear browser data or change devices.
                    </p>
                    <StatusNotification />
                    <input
                        type="file"
                        accept=".json"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />
                    <div className="flex flex-col sm:flex-row gap-4">
                        <Button onClick={handleBackup} className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Backup Data Now
                        </Button>
                        <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full">
                            <Upload className="w-4 h-4 mr-2" />
                            Restore from Backup
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;