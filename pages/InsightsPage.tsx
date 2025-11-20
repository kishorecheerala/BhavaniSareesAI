
import React, { useState, useMemo, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, ShoppingCart, 
  Calendar, Download, ArrowUp, ArrowDown, 
  CreditCard, Wallet, FileText, Activity, Users, Lightbulb, Target, Zap, Scale, ShieldCheck,
  PackagePlus, UserMinus, PieChart as PieIcon, BarChart2, AlertTriangle, ShieldAlert
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

// --- Helper for Risk ---
const calculateRisk = (customer: Customer, allSales: Sale[]) => {
    const custSales = allSales.filter(s => s.customerId === customer.id);
    if (custSales.length === 0) return 'Safe';

    const totalRevenue = custSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
    const totalPaid = custSales.reduce((sum, s) => sum + s.payments.reduce((p, pay) => p + Number(pay.amount), 0), 0);
    const due = totalRevenue - totalPaid;

    if (due <= 100) return 'Safe'; // Negligible due

    const dueRatio = due / totalRevenue;

    // Logic: High risk if owing > 50% AND due > 5000
    if (dueRatio > 0.5 && due > 5000) return 'High';
    // Logic: Medium risk if owing > 30%
    if (dueRatio > 0.3) return 'Medium';
    
    return 'Low';
};

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
        <p className="text-gray-900 dark:text-white font-medium text-sm sm:text-base mb-2 leading-snug">
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

// --- Visual Chart Components ---

const DayOfWeekChart: React.FC<{ sales: Sale[] }> = ({ sales }) => {
    const dayData = useMemo(() => {
        const counts = Array(7).fill(0);
        const revenue = Array(7).fill(0);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        sales.forEach(s => {
            const d = new Date(s.date).getDay();
            counts[d]++;
            revenue[d] += Number(s.totalAmount);
        });

        const maxVal = Math.max(...revenue, 1);
        return days.map((day, i) => ({
            day,
            value: revenue[i],
            height: (revenue[i] / maxVal) * 100
        }));
    }, [sales]);

    return (
        <div className="h-48 flex items-end justify-between gap-2 pt-6">
            {dayData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                     {d.value > 0 && (
                        <div className="absolute bottom-full mb-1 hidden group-hover:block bg-black text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10">
                            ₹{d.value.toLocaleString()}
                        </div>
                    )}
                    <div 
                        className={`w-full rounded-t-md transition-all duration-500 ${d.value > 0 ? 'bg-indigo-500 dark:bg-indigo-400 group-hover:bg-indigo-600' : 'bg-gray-100 dark:bg-slate-700'}`}
                        style={{ height: `${Math.max(d.height, 5)}%` }} 
                    />
                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium">{d.day}</span>
                </div>
            ))}
        </div>
    );
};

const RetentionChart: React.FC<{ filteredSales: Sale[], allSales: Sale[] }> = ({ filteredSales, allSales }) => {
    const data = useMemo(() => {
        const currentCustomerIds = new Set(filteredSales.map(s => s.customerId));
        let newCustomers = 0;
        let returningCustomers = 0;
        
        currentCustomerIds.forEach(custId => {
            const customerHistory = allSales.filter(s => s.customerId === custId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            if (customerHistory.length === 0) return;

            const isNew = filteredSales.some(s => s.id === customerHistory[0].id);
            
            if (isNew) newCustomers++;
            else returningCustomers++;
        });

        const total = newCustomers + returningCustomers;
        return { 
            new: newCustomers, 
            returning: returningCustomers, 
            newPct: total > 0 ? (newCustomers / total) * 100 : 0,
            retPct: total > 0 ? (returningCustomers / total) * 100 : 0
        };
    }, [filteredSales, allSales]);

    return (
        <div className="flex flex-col h-48 justify-center">
             <div className="flex items-center gap-6 mb-4 justify-center">
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                     <span className="text-xs text-gray-600 dark:text-gray-300">Returning ({data.returning})</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                     <span className="text-xs text-gray-600 dark:text-gray-300">New ({data.new})</span>
                 </div>
             </div>
             <div className="relative h-4 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden flex w-full">
                 <div style={{ width: `${data.retPct}%` }} className="bg-emerald-500 h-full transition-all duration-700"></div>
                 <div style={{ width: `${data.newPct}%` }} className="bg-blue-500 h-full transition-all duration-700"></div>
             </div>
             <div className="mt-6 text-center">
                 <p className="text-sm text-gray-600 dark:text-gray-400">
                     <strong className="text-emerald-600 dark:text-emerald-400">{data.retPct.toFixed(0)}%</strong> of customers this period are loyal regulars.
                 </p>
             </div>
        </div>
    );
};

const RiskAnalysisCard: React.FC<{ customers: Customer[], sales: Sale[], onNavigate: (id: string) => void }> = ({ customers, sales, onNavigate }) => {
    const riskData = useMemo(() => {
        const stats = { High: 0, Medium: 0, Low: 0, Safe: 0 };
        const highRiskList: { name: string, id: string, due: number }[] = [];

        customers.forEach(c => {
            const risk = calculateRisk(c, sales);
            stats[risk]++;
            
            if (risk === 'High') {
                const custSales = sales.filter(s => s.customerId === c.id);
                const totalRevenue = custSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
                const totalPaid = custSales.reduce((sum, s) => sum + s.payments.reduce((p, pay) => p + Number(pay.amount), 0), 0);
                const due = totalRevenue - totalPaid;
                highRiskList.push({ name: c.name, id: c.id, due });
            }
        });

        const total = customers.length;
        return { 
            stats, 
            highRiskList: highRiskList.sort((a, b) => b.due - a.due).slice(0, 5),
            percentages: {
                High: (stats.High / total) * 100,
                Medium: (stats.Medium / total) * 100,
                Low: (stats.Low / total) * 100,
                Safe: (stats.Safe / total) * 100,
            }
        };
    }, [customers, sales]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="Customer Risk Distribution">
                <div className="flex items-center justify-center gap-8 h-48">
                    {/* Simplified Donut Chart Representation */}
                     <div className="relative w-32 h-32 rounded-full bg-gray-100 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0" style={{
                            background: `conic-gradient(
                                #ef4444 0% ${riskData.percentages.High}%, 
                                #f59e0b ${riskData.percentages.High}% ${riskData.percentages.High + riskData.percentages.Medium}%, 
                                #10b981 ${riskData.percentages.High + riskData.percentages.Medium}% ${riskData.percentages.High + riskData.percentages.Medium + riskData.percentages.Low}%,
                                #94a3b8 ${riskData.percentages.High + riskData.percentages.Medium + riskData.percentages.Low}% 100%
                            )`
                        }}></div>
                        <div className="absolute w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center z-10">
                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total<br/>{customers.length}</span>
                        </div>
                    </div>
                    <div className="flex flex-col justify-center gap-2 text-xs">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-sm"></div><span>High Risk ({riskData.stats.High})</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-amber-500 rounded-sm"></div><span>Medium Risk ({riskData.stats.Medium})</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-sm"></div><span>Low Risk ({riskData.stats.Low})</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-slate-400 rounded-sm"></div><span>Safe ({riskData.stats.Safe})</span></div>
                    </div>
                </div>
                <p className="text-xs text-center text-gray-500 mt-2">High Risk = Owe >50% of purchase value & >₹5k</p>
            </Card>
            <Card title="High Risk Accounts (Top 5)">
                {riskData.highRiskList.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-gray-500 text-sm flex-col">
                        <ShieldCheck className="w-8 h-8 text-emerald-500 mb-2" />
                        <p>Great! No high risk customers found.</p>
                    </div>
                ) : (
                    <div className="space-y-3 overflow-y-auto h-48 pr-2">
                        {riskData.highRiskList.map(c => (
                            <div key={c.id} className="flex justify-between items-center p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50">
                                <div>
                                    <p className="font-bold text-sm text-gray-800 dark:text-gray-200">{c.name}</p>
                                    <button onClick={() => onNavigate(c.id)} className="text-xs text-red-600 hover:underline">View Profile</button>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-gray-500 dark:text-gray-400">Total Due</span>
                                    <span className="font-bold text-red-600">₹{c.due.toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};


const SmartInsightsSection: React.FC<{ filteredSales: Sale[], allSales: Sale[], customers: Customer[] }> = ({ filteredSales, allSales, customers }) => {
    const insights = useMemo(() => {
        if (filteredSales.length === 0) return null;

        const list: any[] = [];
        const totalRevenue = filteredSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);

        // 1. Peak Performance Day
        const dayRevenue = [0, 0, 0, 0, 0, 0, 0];
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        filteredSales.forEach(s => {
            const day = new Date(s.date).getDay();
            dayRevenue[day] += Number(s.totalAmount);
        });
        const bestDayIndex = dayRevenue.indexOf(Math.max(...dayRevenue));
        const bestDayShare = (dayRevenue[bestDayIndex] / totalRevenue) * 100;

        list.push({
            icon: Calendar,
            title: "Peak Trading Time",
            color: "bg-purple-500 text-purple-600",
            insight: `${dayNames[bestDayIndex]}s are your power days, generating ${bestDayShare.toFixed(0)}% of revenue.`,
            recommendation: `Ensure full staffing and stock on ${dayNames[bestDayIndex]}s.`
        });

        // 2. Bundle Recommendation (Using All Sales for better pattern matching)
        const pairCounts: Record<string, number> = {};
        allSales.forEach(s => {
            if (s.items.length > 1) {
                const categories = [...new Set(s.items.map(i => i.productId.split('-')[1] || 'Other'))].sort();
                if (categories.length > 1) {
                    for (let i = 0; i < categories.length; i++) {
                        for (let j = i + 1; j < categories.length; j++) {
                            const key = `${categories[i]} & ${categories[j]}`;
                            pairCounts[key] = (pairCounts[key] || 0) + 1;
                        }
                    }
                }
            }
        });
        const bestPair = Object.entries(pairCounts).sort((a, b) => b[1] - a[1])[0];
        if (bestPair) {
             list.push({
                icon: PackagePlus,
                title: "Bundle Opportunity",
                color: "bg-pink-500 text-pink-600",
                insight: `Customers frequently buy ${bestPair[0]} together.`,
                recommendation: "Create a combo deal for these categories to increase order value."
            });
        }

        // 3. Churn Risk (Dormant VIPs)
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
        
        const customerStats: Record<string, { totalSpend: number, lastDate: Date }> = {};
        allSales.forEach(s => {
            const d = new Date(s.date);
            if (!customerStats[s.customerId]) customerStats[s.customerId] = { totalSpend: 0, lastDate: d };
            customerStats[s.customerId].totalSpend += Number(s.totalAmount);
            if (d > customerStats[s.customerId].lastDate) customerStats[s.customerId].lastDate = d;
        });

        const avgSpend = Object.values(customerStats).reduce((sum, c) => sum + c.totalSpend, 0) / (Object.keys(customerStats).length || 1);
        const dormantVIPs = Object.values(customerStats).filter(c => c.totalSpend > avgSpend * 1.5 && c.lastDate < sixtyDaysAgo).length;

        if (dormantVIPs > 0) {
             list.push({
                icon: UserMinus,
                title: "Churn Risk Alert",
                color: "bg-red-500 text-red-600",
                insight: `${dormantVIPs} high-value customers haven't visited in 60 days.`,
                recommendation: "Send them a 'Miss You' offer or new arrival update."
            });
        }

        // 4. Sales Volatility (Consistency)
        const dailySales: Record<string, number> = {};
        filteredSales.forEach(s => {
            const dateStr = new Date(s.date).toDateString();
            dailySales[dateStr] = (dailySales[dateStr] || 0) + Number(s.totalAmount);
        });
        const dailyValues = Object.values(dailySales);
        const mean = totalRevenue / dailyValues.length;
        const variance = dailyValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / dailyValues.length;
        const cv = (Math.sqrt(variance) / mean) * 100;

        list.push({
            icon: Scale,
            title: "Sales Stability",
            color: "bg-teal-500 text-teal-600",
            insight: cv > 50 ? "Sales are highly volatile with inconsistent daily flow." : "Daily sales flow is consistent and predictable.",
            recommendation: cv > 50 ? "Run mid-week promotions to smooth out revenue dips." : "Good stability aids in inventory planning."
        });

        return list;
    }, [filteredSales, allSales]);

    if (!insights) return null;

    return (
        <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-md">
                    <Zap className="text-white w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Strategic AI Insights</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Automated business intelligence</p>
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
        if (selectedMonth === 'all') {
            const prevYear = (parseInt(selectedYear) - 1).toString();
            return sales.filter(s => new Date(s.date).getFullYear().toString() === prevYear);
        } else {
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
        let cost = 0;
        data.forEach(s => {
            s.items.forEach(item => {
                const product = products.find(p => p.id === item.productId);
                const itemCost = product ? Number(product.purchasePrice) : (Number(item.price) * 0.7); 
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
            const data = Array(12).fill(0).map((_, i) => ({ 
                label: months[i + 1].label.substr(0, 3), 
                sales: 0, 
                profit: 0 
            }));
            
            filteredSales.forEach(s => {
                const m = new Date(s.date).getMonth();
                data[m].sales += Number(s.totalAmount);
                let cost = 0;
                s.items.forEach(i => {
                    const p = products.find(prod => prod.id === i.productId);
                    cost += (p ? Number(p.purchasePrice) : Number(i.price) * 0.7) * Number(i.quantity);
                });
                data[m].profit += (Number(s.totalAmount) - cost);
            });
            return data;
        } else {
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

    const handleDownloadReport = () => {
        const doc = new jsPDF();
        
        doc.setFontSize(20);
        doc.setTextColor('#0d9488');
        doc.text('Business Performance Report', 14, 20);
        doc.setFontSize(10);
        doc.setTextColor('#666666');
        doc.text(`Period: ${selectedMonth === 'all' ? 'Full Year' : months[parseInt(selectedMonth) + 1].label} ${selectedYear}`, 14, 28);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 33);
        
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

    const handleNavigateCustomer = (id: string) => {
        dispatch({ type: 'SET_SELECTION', payload: { page: 'CUSTOMERS', id: id } });
        setCurrentPage('CUSTOMERS');
    };

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
                        }
                    }}
                />
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

            <SmartInsightsSection filteredSales={filteredSales} allSales={sales} customers={customers} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard title="Total Revenue" value={currentMetrics.revenue} prevValue={previousMetrics.revenue} icon={DollarSign} prefix="₹" />
                <KPICard title="Gross Profit (Est.)" value={currentMetrics.profit} prevValue={previousMetrics.profit} icon={TrendingUp} prefix="₹" />
                <KPICard title="Total Orders" value={currentMetrics.orders} prevValue={previousMetrics.orders} icon={ShoppingCart} />
                <KPICard title="Avg Order Value" value={currentMetrics.aov} prevValue={previousMetrics.aov} icon={Activity} prefix="₹" />
            </div>
            
            {/* New Risk Section */}
            <RiskAnalysisCard customers={customers} sales={sales} onNavigate={handleNavigateCustomer} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card title={selectedMonth === 'all' ? 'Monthly Sales Trend' : 'Daily Sales Trend'} className="lg:col-span-2">
                    <div className="h-64 flex items-end gap-2 pt-4 overflow-x-auto">
                        {chartData.map((d, i) => {
                            const height = maxChartValue > 0 ? (d.sales / maxChartValue) * 100 : 0;
                            return (
                                <div key={i} className="flex-1 min-w-[20px] flex flex-col items-center group relative">
                                    <div className="absolute bottom-full mb-2 hidden group-hover:block z-10 bg-black text-white text-xs p-2 rounded whitespace-nowrap pointer-events-none">
                                        <p>{d.label}</p>
                                        <p>Sales: ₹{d.sales.toLocaleString()}</p>
                                        <p>Profit: ₹{d.profit.toLocaleString()}</p>
                                    </div>
                                    <div 
                                        className="w-full bg-teal-500 hover:bg-teal-600 dark:bg-teal-600 dark:hover:bg-teal-500 rounded-t transition-all relative" 
                                        style={{ height: `${Math.max(height, 1)}%` }}
                                    ></div>
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-1 truncate w-full text-center">{d.label}</span>
                                </div>
                            );
                        })}
                    </div>
                </Card>
                
                <Card title="Payment Analysis" className="lg:col-span-1">
                    <div className="space-y-4">
                        {[
                            { label: 'Cash', value: paymentStats.cash, color: 'bg-green-500', icon: Wallet },
                            { label: 'UPI', value: paymentStats.upi, color: 'bg-blue-500', icon: Activity },
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
            </div>
            
            {/* New Customer Intelligence Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Weekly Trading Pattern">
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Average sales performance by day</p>
                        <BarChart2 size={16} className="text-gray-400" />
                    </div>
                    <DayOfWeekChart sales={filteredSales} />
                </Card>

                <Card title="Customer Loyalty">
                     <div className="flex justify-between items-center mb-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">New vs. Returning Customers</p>
                        <PieIcon size={16} className="text-gray-400" />
                    </div>
                    <RetentionChart filteredSales={filteredSales} allSales={sales} />
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card title="Top Selling Products">
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
                
                 <Card title="Category Sales">
                    <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                         {categoryData.length === 0 ? (
                            <p className="text-gray-500 text-sm">No category data available.</p>
                         ) : categoryData.map((cat) => (
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
