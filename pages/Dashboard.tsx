import React, { useRef } from 'react';
import { IndianRupee, UserCheck, AlertTriangle, Download, Upload, ShoppingCart, Package } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import Button from '../components/Button';

const Dashboard: React.FC = () => {
    const { state, dispatch } = useAppContext();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const totalCustomerDues = state.sales
        .filter(sale => !sale.isPaid)
        .reduce((sum, sale) => sum + sale.totalAmount, 0);

    const totalPurchaseDues = state.purchases
        .filter(purchase => !purchase.isPaid)
        .reduce((sum, purchase) => sum + purchase.totalAmount, 0);

    const lowStockProducts = state.products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
    
    const totalSales = state.sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const totalPurchases = state.purchases.reduce((sum, purchase) => sum + purchase.totalAmount, 0);
    
    const handleBackup = () => {
        try {
            const data = localStorage.getItem('bhavaniSareesState');
            if (!data) {
                alert('No data to backup.');
                return;
            }
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            a.href = url;
            a.download = `bhavani-sarees-backup-${date}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Backup successful! Save the downloaded file in a safe place.');
        } catch (error) {
            console.error('Backup failed:', error);
            alert('Backup failed. Please try again.');
        }
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm('Are you sure you want to restore data? This will overwrite all current data in the app.')) {
            // Reset file input value so the same file can be selected again
            if(fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not readable text.");
                
                const restoredState = JSON.parse(text);
                // Basic validation
                if (restoredState && 'customers' in restoredState && 'sales' in restoredState && 'products' in restoredState) {
                    dispatch({ type: 'SET_STATE', payload: restoredState });
                    alert('Data restored successfully!');
                } else {
                    throw new Error("Invalid backup file format.");
                }
            } catch (error) {
                console.error('Restore failed:', error);
                alert(`Restore failed. Please make sure you are using a valid backup file. Error: ${(error as Error).message}`);
            } finally {
                // Reset file input value
                if(fileInputRef.current) fileInputRef.current.value = "";
            }
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

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <MetricCard 
                    icon={ShoppingCart} 
                    title="Total Sales" 
                    value={totalSales} 
                    color="bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg" 
                />
                 <MetricCard 
                    icon={Package} 
                    title="Total Purchases" 
                    value={totalPurchases} 
                    color="bg-gradient-to-br from-teal-500 to-cyan-600 shadow-lg" 
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
                <MetricCard 
                    icon={UserCheck} 
                    title="Total Customers" 
                    value={state.customers.length} 
                    color="bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg"
                    unit=""
                />
                <MetricCard 
                    icon={AlertTriangle} 
                    title="Low Stock Items" 
                    value={lowStockProducts} 
                    color="bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg"
                    unit=""
                />
            </div>
            
            <Card title="Backup & Restore">
                <p className="text-sm text-gray-600 mb-4">
                    Your data is stored only on this device. It's very important to back it up regularly.
                </p>
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
                        Backup Data
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="w-full">
                        <Upload className="w-4 h-4 mr-2" />
                        Restore Data
                    </Button>
                </div>
            </Card>

             <Card title="Recent Activity">
                <p className="text-gray-500">Activity feed coming soon...</p>
             </Card>
        </div>
    );
};

export default Dashboard;