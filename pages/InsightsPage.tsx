
import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Calendar, Download, PieChart, BarChart, ArrowUp, ArrowDown, 
  CreditCard, Wallet, FileText, Activity, Award, Users, Lightbulb, Target, Zap, Scale, Lock, ShieldCheck
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import Button from '../components/Button';
import PinModal from '../components/PinModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Page, Sale, Customer } from '../types';

interface InsightsPageProps {
    setCurrentPage: (page: Page) => void;
}

// --- AI Insight Component ---
const StrategicInsightCard: React.FC<{
    icon: React.ElementType;
    title: string;
    insight: string;
    color: string;
    recommendation?: string;
}> = ({ icon: Icon, title, insight, color, recommendation }) => (
    <div className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${color} bg-opacity-10 dark:bg-opacity-20`}>
                <Icon size={20} className={color.replace('bg-', 'text-')} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-gray-200 text-sm uppercase tracking-wide">{title}</h4>
        </div>
        <p className="text-gray-900 dark:text-white font-medium text-lg mb-2 leading-snug">
            {insight}
        </p>
        {recommendation && (
            <div className="mt-auto pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 flex gap-1">
                    <Lightbulb size={12} className="flex-shrink-0 mt-0.5 text-amber-500" />
                    <span>{recommendation}</span>
                </p>
            </div>
        )}
    </div>
);

const SmartInsightsSection: React.FC<{ sales: Sale[], customers: Customer[] }> = ({ sales, customers }) => {
    const insights = useMemo(() => {
        if (sales.length === 0) return null;

        const list: any[] = [];

        // 1. Peak Performance Day (Day of Week Analysis)
        const dayCounts = [0, 0, 0, 0, 0, 0, 0];
        const dayRevenue = [0, 0, 0, 0, 0, 0, 0];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        sales.forEach(s => {
            const date = new Date(s.date);
            const day = date.getDay();
            dayCounts[day]++;
            dayRevenue[day] += Number(s.totalAmount);
        });

        const bestDayIndex = dayRevenue.indexOf(Math.max(...dayRevenue));
        const bestDayName = dayNames[bestDayIndex];
        const bestDayRevenue = dayRevenue[bestDayIndex];
        const totalRevenue = dayRevenue.reduce((a, b) => a + b, 0);
        const bestDayShare = (bestDayRevenue / totalRevenue) * 100;

        list.push({
            icon: Calendar,
            title: "Peak Trading Time",
            color: "bg-purple-500 text-purple-600",
            insight: `${bestDayName}s are your power days, generating ${bestDayShare.toFixed(0)}% of your total revenue.`,
            recommendation: `Consider running special promotions or ensuring full stock availability on ${bestDayName}s to maximize this trend.`
        });

        // 2. Customer Concentration Risk (Pareto Principle)
        const customerSpend: Record<string, number> = {};
        sales.forEach(s => {
            customerSpend[s.customerId] = (customerSpend[s.customerId] || 0) + Number(s.totalAmount);
        });
        
        const sortedSpends = Object.values(customerSpend).sort((a, b) => b - a);
        const totalCustomers = sortedSpends.length;
        const top10PercentCount = Math.max(1, Math.ceil(totalCustomers * 0.1));
        const top10Revenue = sortedSpends.slice(0, top10PercentCount).reduce((a, b) => a + b, 0);
        const concentrationRatio = (top10Revenue / totalRevenue) * 100;

        let concentrationRisk = "Low";
        let concentrationMsg = "Your revenue is well-distributed across many customers.";
        let concentrationRec = "Continue acquiring new customers to maintain this healthy balance.";

        if (concentrationRatio > 60) {
            concentrationRisk = "High";
            concentrationMsg = `High Risk: Your top ${top10PercentCount} customer(s) account for ${concentrationRatio.toFixed(0)}% of sales.`;
            concentrationRec = "Diversify your customer base urgently. Losing a top client could significantly impact revenue.";
        } else if (concentrationRatio > 40) {
             concentrationRisk = "Medium";
             concentrationMsg = `Your top ${top10PercentCount} customers drive ${concentrationRatio.toFixed(0)}% of your business.`;
             concentrationRec = "Nurture these VIPs with loyalty rewards, but try to upsell to mid-tier customers.";
        }

        list.push({
            icon: Target,
            title: "Customer Concentration",
            color: concentrationRisk === "High" ? "bg-red-500 text-red-600" : (concentrationRisk === "Medium" ? "bg-amber-500 text-amber-600" : "bg-green-500 text-green-600"),
            insight: concentrationMsg,
            recommendation: concentrationRec
        });

        // 3. Average Basket Size Stability
        const totalOrders = sales.length;
        const aov = totalRevenue / totalOrders;
        
        // Split into two halves to check trend
        const sortedSales = [...sales].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const midPoint = Math.floor(totalOrders / 2);
        const firstHalf = sortedSales.slice(0, midPoint);
        const secondHalf = sortedSales.slice(midPoint);
        
        const firstHalfAov = firstHalf.length ? firstHalf.reduce((sum, s) => sum + Number(s.totalAmount), 0) / firstHalf.length : 0;
        const secondHalfAov = secondHalf.length ? secondHalf.reduce((sum, s) => sum + Number(s.totalAmount), 0) / secondHalf.length : 0;
        
        const aovChange = firstHalfAov > 0 ? ((secondHalfAov - firstHalfAov) / firstHalfAov) * 100 : 0;
        
        let aovText = `Customers spend an average of ₹${Math.round(aov).toLocaleString()} per visit.`;
        if (aovChange > 5) aovText += ` Trending up (+${aovChange.toFixed(1)}%) recently!`;
        else if (aovChange < -5) aovText += ` Trending down (${aovChange.toFixed(1)}%) recently.`;

        list.push({
            icon: ShoppingCart,
            title: "Buying Power",
            color: aovChange >= 0 ? "bg-blue-500 text-blue-600" : "bg-orange-500 text-orange-600",
            insight: aovText,
            recommendation: aovChange < 0 ? "Try bundling products or offering volume discounts to increase ticket size." : "Your upselling strategies seem to be working."
        });

        // 4. Sales Consistency (Volatility)
        // Group by date
        const dailySales: Record<string, number> = {};
        sales.forEach(s => {
            const dateStr = new Date(s.date).toDateString();
            dailySales[dateStr] = (dailySales[dateStr] || 0) + Number(s.totalAmount);
        });
        const dailyValues = Object.values(dailySales);
        const mean = totalRevenue / dailyValues.length;
        const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
        const stdDev = Math.sqrt(variance);
        const cv = (stdDev / mean) * 100; // Coefficient of Variation

        let stabilityMsg = "Your daily sales flow is very consistent and predictable.";
        if (cv > 100) stabilityMsg = "Sales are highly volatile with huge spikes and deep drops.";
        else if (cv > 50) stabilityMsg = "Sales fluctuate significantly from day to day.";

        list.push({
            icon: Scale,
            title: "Sales Stability",
            color: "bg-teal-500 text-teal-600",
            insight: stabilityMsg,
            recommendation: cv > 50 ? "Focus on marketing during slow days to smooth out income flow." : "Great operational stability, making inventory planning easier."
        });

        return list;
    }, [sales]);

    if (!insights) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
                    <Zap className="text-white w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Strategic AI Insights</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Deep dive analysis based on filtered data</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                {insights.map((item, idx) => (
                    <StrategicInsightCard key={idx} {...item} />
                ))}
            </div>
        </div>
    );
};


const InsightsPage: React.FC<InsightsPageProps> = ({ setCurrentPage }) => {
    const { state, dispatch } = useAppContext();
    const { sales, products, customers, pin } = state;

    const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
    const [selectedMonth, setSelectedMonth] = useState<string>('all');
    
    // PIN Protection State
    // If no PIN is set (null), we consider it "locked" until they set one.
    // If PIN is set, we start locked until they enter it.
    const [isUnlocked, setIsUnlocked] = useState(false);

    // --- Helpers ---
    const getYears = useMemo(() => {
        const years = new Set<string>();
        sales.forEach(s => years.add(new Date(s.date).getFullYear().toString()));
        years.add(new Date().getFullYear().toString());
        return Array.from(years).sort().reverse();
    }, [sales]);

    const months = [
        { value: 'all', label: 'Full Year' },
        { value: '0', label: 'January' }, { value: '1', label: 'February' }, { value: '2', label: 'March' },
        { value: '3', label: 'April' }, { value: '4', label: 'May' }, { value: '5', label: 'June' },
        { value: '6', label: 'July' }, { value: '7', label: 'August' }, { value: '8', label: 'September' },
        { value: '9', label: 'October' }, { value: '10', label: 'November' }, { value: '11', label: 'December' },
    ];

    // --- Data Aggregation ---

    const filteredSales = useMemo(() => {
        return sales.filter(s => {
            const d = new Date(s.date);
            const yearMatch = d.getFullYear().toString() === selectedYear;
            const monthMatch = selectedMonth === 'all' || d.getMonth().toString() === selectedMonth;
            return yearMatch && monthMatch;
        });
    }, [sales, selectedYear, selectedMonth]);

    const previousPeriodSales = useMemo(() => {
        // Logic to compare with previous year or previous month
        if (selectedMonth === 'all') {
            const prevYear = (parseInt(selectedYear) - 1).toString();
            return sales.filter(s => new Date(s.date).getFullYear().toString() === prevYear);
        } else {
            // Compare with previous month in same year (simplified)
            let prevMonth = parseInt(selectedMonth) - 1;
            let prevYear = parseInt(selectedYear);
            if (prevMonth < 0) { prevMonth = 11; prevYear -= 1; }
            
            return sales.filter(s => {
                const d = new Date(s.date);
                return d.getFullYear() === prevYear && d.getMonth() === prevMonth;
            });
        }
    }, [sales, selectedYear, selectedMonth]);

    const calculateMetrics = (data: typeof sales) => {
        const revenue = data.reduce((sum, s) => sum + Number(s.totalAmount), 0);
        // Estimate profit: Revenue - (Cost of Goods Sold). 
        // Note: Precise COGS requires tracking exact batch cost. Here we approximate using current purchasePrice of product.
        let cost = 0;
        data.forEach(s => {
            s.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const itemCost = product ? Number(product.purchasePrice) : (Number(item.price) * 0.7); // Fallback 70% if product deleted
                cost += itemCost * Number(item.quantity);
            });
        });
        const profit = revenue - cost;
        const orders = data.length;
        const aov = orders > 0 ? revenue / orders : 0;
        
        return { revenue, profit, orders, aov };
    };

    const currentMetrics = useMemo(() => calculateMetrics(filteredSales), [filteredSales]);
    const previousMetrics = useMemo(() => calculateMetrics(previousPeriodSales), [previousPeriodSales]);

    const getTrend = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
    };

    // --- Chart Data ---

    const chartData = useMemo(() => {
        if (selectedMonth === 'all') {
            // Monthly breakdown
            const data = Array(12).fill(0).map((_, i) => ({ 
                label: months[i + 1].label.substr(0, 3), 
                sales: 0, 
                profit: 0 
            }));
            
            filteredSales.forEach(s => {
                const m = new Date(s.date).getMonth();
                data[m].sales += Number(s.totalAmount);
                // Approximate profit
                let cost = 0;
                s.items.forEach(i => {
                    const p = products.find(prod => prod.id === i.productId);
                    cost += (p ? Number(p.purchasePrice) : Number(i.price) * 0.7) * Number(i.quantity);
                });
                data[m].profit += (Number(s.totalAmount) - cost);
            });
            return data;
        } else {
            // Daily breakdown
            const daysInMonth = new Date(parseInt(selectedYear), parseInt(selectedMonth) + 1, 0).getDate();
            const data = Array(daysInMonth).fill(0).map((_, i) => ({ 
                label: (i + 1).toString(), 
                sales: 0, 
                profit: 0 
            }));
            
            filteredSales.forEach(s => {
                const d = new Date(s.date).getDate() - 1;
                if (data[d]) {
                    data[d].sales += Number(s.totalAmount);
                    let cost = 0;
                    s.items.forEach(i => {
                        const p = products.find(prod => prod.id === i.productId);
                        cost += (p ? Number(p.purchasePrice) : Number(i.price) * 0.7) * Number(i.quantity);
                    });
                    data[d].profit += (Number(s.totalAmount) - cost);
                }
            });
            return data;
        }
    }, [filteredSales, selectedMonth, selectedYear, products]);

    const maxChartValue = Math.max(...chartData.map(d => d.sales), 1);

    // --- Category Data ---
    const categoryData = useMemo(() => {
        const cats: Record<string, number> = {};
        filteredSales.forEach(s => {
            s.items.forEach(i => {
                const cat = i.productId.split('-')[1] || 'Other';
                cats[cat] = (cats[cat] || 0) + (Number(i.price) * Number(i.quantity));
            });
        });
        const total = Object.values(cats).reduce((a, b) => a + b, 0);
        return Object.entries(cats)
            .map(([name, value]) => ({ name, value, percent: (value / total) * 100 }))
            .sort((a, b) => b.value - a.value);
    }, [filteredSales]);

    // --- Payment Method Analysis ---
    const paymentStats = useMemo(() => {
        let cash = 0, upi = 0, cheque = 0;
        let totalPaid = 0;
        const totalBilled = currentMetrics.revenue;

        filteredSales.forEach(s => {
            (s.payments || []).forEach(p => {
                const amount = Number(p.amount);
                totalPaid += amount;
                if (p.method === 'CASH') cash += amount;
                else if (p.method === 'UPI') upi += amount;
                else if (p.method === 'CHEQUE') cheque += amount;
            });
        });

        return { cash, upi, cheque, credit: Math.max(0, totalBilled - totalPaid) };
    }, [filteredSales, currentMetrics]);

    // --- Top Lists ---
    const topProducts = useMemo(() => {
        const prodMap: Record<string, number> = {};
        filteredSales.forEach(s => {
            s.items.forEach(i => {
                prodMap[i.productId] = (prodMap[i.productId] || 0) + Number(i.quantity);
            });
        });
        return Object.entries(prodMap)
            .map(([id, qty]) => {
                const product = products.find(p => p.id === id);
                return { name: product?.name || id, quantity: qty, id };
            })
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5);
    }, [filteredSales, products]);

    const topCustomers = useMemo(() => {
        const custMap: Record<string, number> = {};
        filteredSales.forEach(s => {
            custMap[s.customerId] = (custMap[s.customerId] || 0) + Number(s.totalAmount);
        });
        return Object.entries(custMap)
            .map(([id, amount]) => {
                const customer = customers.find(c => c.id === id);
                return { name: customer?.name || id, amount, id };
            })
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
    }, [filteredSales, customers]);


    // --- PDF Generation ---
    const handleDownloadReport = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.setTextColor('#0d9488');
        doc.text('Business Performance Report', 14, 20);
        
        doc.setFontSize(10);
        doc.setTextColor('#666666');
        doc.text(`Period: ${selectedMonth === 'all' ? 'Full Year' : months[parseInt(selectedMonth) + 1].label} ${selectedYear}`, 14, 28);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);
        
        // Metrics Table
        autoTable(doc, {
            startY: 40,
            head: [['Metric', 'Value', 'Trend']],
            body: [
                ['Total Revenue', `Rs. ${currentMetrics.revenue.toLocaleString()}`, `${getTrend(currentMetrics.revenue, previousMetrics.revenue).toFixed(1)}%`],
                ['Gross Profit', `Rs. ${currentMetrics.profit.toLocaleString()}`, `${getTrend(currentMetrics.profit, previousMetrics.profit).toFixed(1)}%`],
                ['Total Orders', currentMetrics.orders.toString(), ''],
                ['Avg Order Value', `Rs. ${currentMetrics.aov.toLocaleString()}`, '']
            ],
            theme: 'grid',
            headStyles: { fillColor: [13, 148, 136] }
        });
        
        let finalY = (doc as any).lastAutoTable.finalY + 15;
        
        // Payment Stats
        doc.text('Payment Analysis', 14, finalY);
        autoTable(doc, {
            startY: finalY + 5,
            head: [['Method', 'Amount']],
            body: [
                ['Cash', `Rs. ${paymentStats.cash.toLocaleString()}`],
                ['UPI', `Rs. ${paymentStats.upi.toLocaleString()}`],
                ['Cheque', `Rs. ${paymentStats.cheque.toLocaleString()}`],
                ['Pending (Credit)', `Rs. ${paymentStats.credit.toLocaleString()}`],
            ],
            theme: 'striped'
        });
        
        // Top Products
        finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.text('Top Selling Products', 14, finalY);
        autoTable(doc, {
            startY: finalY + 5,
            head: [['Product Name', 'Quantity Sold']],
            body: topProducts.map(p => [p.name, p.quantity]),
            theme: 'striped'
        });
        
        doc.save(`Business_Report_${selectedYear}_${selectedMonth}.pdf`);
    };

    // --- PIN Protection Logic ---
    // 1. No PIN set -> Force Setup
    if (!pin) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] relative">
                <PinModal
                    mode="setup"
                    onSetPin={(newPin) => {
                        dispatch({ type: 'SET_PIN', payload: newPin });
                        setIsUnlocked(true);
                    }}
                    onCancel={() => setCurrentPage('DASHBOARD')}
                />
                {/* Background blur effect placeholder */}
                <div className="absolute inset-0 flex flex-col gap-4 p-4 opacity-30 blur-sm pointer-events-none z-0">
                    <div className="h-10 bg-gray-300 dark:bg-slate-700 w-1/3 rounded"></div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
                         <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. PIN set but locked -> Force Entry
    if (!isUnlocked) {
        return (
            <div className="flex items-center justify-center min-h-[70vh] relative">
                <PinModal
                    mode="enter"
                    correctPin={pin}
                    onCorrectPin={() => setIsUnlocked(true)}
                    onCancel={() => setCurrentPage('DASHBOARD')}
                    onResetRequest={() => {
                        if (window.confirm("Are you sure you want to reset your PIN? This will remove the security until you set a new one.")) {
                            dispatch({ type: 'REMOVE_PIN' });
                            // Removing PIN triggers re-render, hitting the (!pin) block above, showing setup.
                        }
                    }}
                />
                {/* Background blur effect placeholder */}
                <div className="absolute inset-0 flex flex-col gap-4 p-4 opacity-30 blur-sm pointer-events-none z-0">
                    <div className="h-10 bg-gray-300 dark:bg-slate-700 w-1/3 rounded"></div>
                    <div className="grid grid-cols-2 gap-4">
                         <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
                         <div className="h-32 bg-gray-200 dark:bg-slate-800 rounded-xl"></div>
                    </div>
                </div>
            </div>
        );
    }

    // --- Components ---

    const KPICard = ({ title, value, prevValue, icon: Icon, prefix = '' }: any) => {
        const trend = getTrend(value, prevValue);
        const isPositive = trend >= 0;
        
        return (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md border border-gray-100 dark:border-slate-700">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</p>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{prefix}{value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</h3>
                    </div>
                    <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100 text-green-600 dark:bg-green-900/30' : 'bg-red-100 text-red-600 dark:bg-red-900/30'}`}>
                        <Icon size={20} />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                    <span className={`flex items-center font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {isPositive ? <ArrowUp size={14} className="mr-1"/> : <ArrowDown size={14} className="mr-1"/>}
                        {Math.abs(trend).toFixed(1)}%
                    </span>
                    <span className="text-gray-400 ml-2">vs previous period</span>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 pb-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-primary">Business Insights</h1>
                    {/* Security Badge */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <ShieldCheck size={12} className="mr-1" /> Secured
                    </span>
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <select 
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white shadow-sm focus:ring-primary focus:border-primary flex-grow"
                    >
                        {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                    <select 
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="p-2 border rounded-md bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white shadow-sm focus:ring-primary focus:border-primary flex-grow"
                    >
                        {getYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <Button onClick={handleDownloadReport} variant="secondary">
                        <Download size={18} />
                    </Button>
                </div>
            </div>

            {/* AI Strategic Insights */}
            <SmartInsightsSection sales={filteredSales} customers={customers} />

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Total Revenue" value={currentMetrics.revenue} prevValue={previousMetrics.revenue} icon={DollarSign} prefix="₹" />
                <KPICard title="Gross Profit (Est.)" value={currentMetrics.profit} prevValue={previousMetrics.profit} icon={TrendingUp} prefix="₹" />
                <KPICard title="Total Orders" value={currentMetrics.orders} prevValue={previousMetrics.orders} icon={ShoppingCart} />
                <KPICard title="Avg Order Value" value={currentMetrics.aov} prevValue={previousMetrics.aov} icon={Activity} prefix="₹" />
            </div>

            {/* Main Chart */}
            <Card title={selectedMonth === 'all' ? 'Monthly Sales Trend' : 'Daily Sales Trend'}>
                <div className="h-64 flex items-end gap-2 pt-4 overflow-x-auto">
                    {chartData.map((d, i) => {
                        const height = maxChartValue > 0 ? (d.sales / maxChartValue) * 100 : 0;
                        return (
                            <div key={i} className="flex-1 min-w-[20px] flex flex-col items-center group relative">
                                {/* Tooltip */}
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-black text-white text-xs p-2 rounded whitespace-nowrap">
                                    <p>{d.label}</p>
                                    <p>Sales: ₹{d.sales.toLocaleString()}</p>
                                    <p>Profit: ₹{d.profit.toLocaleString()}</p>
                                </div>
                                {/* Bar */}
                                <div 
                                    className="w-full bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-t transition-all relative" 
                                    style={{ height: `${Math.max(height, 1)}%` }}
                                ></div>
                                {/* Label */}
                                <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">{d.label}</span>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Payment Methods */}
                <Card title="Payment Analysis" className="lg:col-span-1">
                    <div className="space-y-4">
                        {[
                            { label: 'Cash', value: paymentStats.cash, color: 'bg-green-500', icon: Wallet },
                            { label: 'UPI', value: paymentStats.upi, color: 'bg-blue-500', icon: Activity }, // Used Activity as generic digital icon
                            { label: 'Cheque', value: paymentStats.cheque, color: 'bg-yellow-500', icon: FileText },
                            { label: 'Credit (Due)', value: paymentStats.credit, color: 'bg-red-500', icon: CreditCard },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                                        <item.icon size={14} className="text-gray-400" /> {item.label}
                                    </span>
                                    <span className="font-medium dark:text-white">₹{item.value.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2.5">
                                    <div 
                                        className={`h-2.5 rounded-full ${item.color}`} 
                                        style={{ width: `${currentMetrics.revenue > 0 ? (item.value / currentMetrics.revenue) * 100 : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Top Products */}
                <Card title="Top Selling Products" className="lg:col-span-1">
                    <div className="space-y-4">
                         {topProducts.length === 0 ? (
                            <p className="text-gray-500 text-sm">No sales data available.</p>
                         ) : topProducts.map((p, idx) => (
                            <div key={p.id} className="flex items-center justify-between">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                        {idx + 1}
                                    </div>
                                    <p className="text-sm font-medium truncate dark:text-gray-200">{p.name}</p>
                                </div>
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 whitespace-nowrap">{p.quantity} sold</span>
                            </div>
                        ))}
                    </div>
                </Card>
                
                {/* Category Distribution */}
                 <Card title="Category Sales" className="lg:col-span-1">
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                         {categoryData.length === 0 ? (
                            <p className="text-gray-500 text-sm">No category data available.</p>
                         ) : categoryData.map((cat, idx) => (
                            <div key={cat.name}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium dark:text-gray-300">{cat.name}</span>
                                    <span className="text-gray-500">{cat.percent.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-2">
                                    <div 
                                        className="h-2 rounded-full bg-purple-500" 
                                        style={{ width: `${cat.percent}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default InsightsPage;
