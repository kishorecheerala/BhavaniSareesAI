import React, { useState, useMemo, useEffect } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Award, Lock, BarChart } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import PinModal from '../components/PinModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Page, Sale, SaleItem } from '../types';

interface InsightsPageProps {
    setCurrentPage: (page: Page) => void;
}

const InsightsPage: React.FC<InsightsPageProps> = ({ setCurrentPage }) => {
    const { state, isDbLoaded, dispatch, showToast } = useAppContext();
    
    type PinState = 'checking' | 'locked' | 'unlocked' | 'no_pin_setup';
    const [pinState, setPinState] = useState<PinState>('checking');
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    const [profitFilterMonth, setProfitFilterMonth] = useState(new Date().getMonth());
    const [profitFilterYear, setProfitFilterYear] = useState(new Date().getFullYear());

    const [chartYear, setChartYear] = useState(() => {
        const now = new Date();
        // If current month is Jan, Feb, or Mar (0, 1, 2), the financial year started last calendar year.
        return now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
    });

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    useEffect(() => {
        if (!isDbLoaded) return;
        if (state.pin) {
            setPinState('locked');
        } else {
            setPinState('no_pin_setup');
        }
    }, [isDbLoaded, state.pin]);

    const handlePinSet = (pin: string) => {
        dispatch({ type: 'SET_PIN', payload: pin });
        setPinState('unlocked');
        showToast('PIN set successfully! Insights are now unlocked.');
    };

    const handlePinCorrect = () => {
        setPinState('unlocked');
    };
    
    const handleConfirmReset = () => {
        dispatch({ type: 'REMOVE_PIN' });
        setIsResetConfirmOpen(false);
        showToast('PIN has been reset. Please set a new one.', 'info');
    };
    
    const handleCancelPin = () => {
        setCurrentPage('DASHBOARD');
    };

    const availableYearsForProfit = useMemo(() => {
        const years = new Set(state.sales.map(s => new Date(s.date).getFullYear()));
        const currentYear = new Date().getFullYear();
        if (!years.has(currentYear)) years.add(currentYear);
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [state.sales]);

    const filteredProfit = useMemo(() => {
        if (!isDbLoaded) return 0;
        let relevantSales = state.sales.filter(sale => {
            const saleDate = new Date(sale.date);
            if (profitFilterYear === -1) return true; // All time
            if (profitFilterMonth === -1) return saleDate.getFullYear() === profitFilterYear; // Specific year
            return saleDate.getFullYear() === profitFilterYear && saleDate.getMonth() === profitFilterMonth; // Specific month and year
        });
        
        let totalProfit = 0;
        relevantSales.forEach(sale => {
            let costOfGoods = sale.items.reduce((cost, item) => {
                const product = state.products.find(p => p.id === item.productId);
                return cost + (Number(product?.purchasePrice) || 0) * (Number(item.quantity) || 0);
            }, 0);
            totalProfit += (Number(sale.totalAmount) || 0) - costOfGoods;
        });
        return totalProfit;
    }, [state.sales, state.products, isDbLoaded, profitFilterMonth, profitFilterYear]);
    
    const profitCardTitle = useMemo(() => {
        if (profitFilterYear === -1) return "Estimated All-Time Profit";
        if (profitFilterMonth === -1) return `Estimated Profit for ${profitFilterYear}`;
        return `Profit for ${monthNames[profitFilterMonth]} ${profitFilterYear}`;
    }, [profitFilterMonth, profitFilterYear, monthNames]);

    const availableYearsForChart = useMemo(() => {
        if (!isDbLoaded) return [];
        const years = new Set(state.sales.map(s => {
            const d = new Date(s.date);
            return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
        }));
        const currentFY = new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        if (!years.has(currentFY)) years.add(currentFY);
        // FIX: Explicitly type the sort parameters 'a' and 'b' as numbers to resolve a TypeScript type inference issue.
        return Array.from(years).sort((a, b) => b - a);
    }, [state.sales, isDbLoaded]);

    const yearlySalesData = useMemo(() => {
        if (!isDbLoaded) return { monthlySales: Array(12).fill(0), maxSale: 0, totalSales: 0 };

        const financialYearStart = new Date(chartYear, 3, 1); // April 1st
        const financialYearEnd = new Date(chartYear + 1, 3, 0); // March 31st

        const monthlySales = Array(12).fill(0);

        state.sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate >= financialYearStart && saleDate <= financialYearEnd) {
                const month = saleDate.getMonth(); // 0-11
                // Map JS month to financial year month index (Apr=0, May=1, ..., Mar=11)
                const financialMonthIndex = month >= 3 ? month - 3 : month + 9;
                monthlySales[financialMonthIndex] += Number(sale.totalAmount);
            }
        });
        
        const maxSale = Math.max(...monthlySales);
        const totalSales = monthlySales.reduce((sum, sale) => sum + sale, 0);

        return { monthlySales, maxSale: maxSale > 0 ? maxSale : 1, totalSales }; // Avoid division by zero
    }, [state.sales, chartYear, isDbLoaded]);

    const salesTrend = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const currentMonthSales = state.sales
            .filter(s => { const d = new Date(s.date); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; })
            .reduce((sum, s) => sum + Number(s.totalAmount), 0);
        
        const lastMonthSales = state.sales
            .filter(s => { const d = new Date(s.date); return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear; })
            .reduce((sum, s) => sum + Number(s.totalAmount), 0);
        
        let percentageChange = 0;
        if (lastMonthSales > 0) {
            percentageChange = ((currentMonthSales - lastMonthSales) / lastMonthSales) * 100;
        } else if (currentMonthSales > 0) {
            percentageChange = 100; // Treat as 100% increase if last month was zero
        }
        
        return { currentMonthSales, lastMonthSales, percentageChange };
    }, [state.sales]);

    const topCustomers = useMemo(() => {
        const customerTotals = state.sales.reduce((acc, sale) => {
            acc[sale.customerId] = (acc[sale.customerId] || 0) + Number(sale.totalAmount);
            return acc;
        }, {} as { [key: string]: number });

        return Object.entries(customerTotals)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .slice(0, 5)
            .map(([customerId, total]) => ({
                customer: state.customers.find(c => c.id === customerId),
                total
            }));
    }, [state.sales, state.customers]);

    const topProducts = useMemo(() => {
        const productTotals = state.sales.reduce((acc, sale) => {
            sale.items.forEach(item => {
                acc[item.productId] = (acc[item.productId] || 0) + Number(item.quantity);
            });
            return acc;
        }, {} as { [key: string]: number });
        
        return Object.entries(productTotals)
            .sort(([, a], [, b]) => Number(b) - Number(a))
            .slice(0, 5)
            .map(([productId, quantity]) => ({
                product: state.products.find(p => p.id === productId),
                quantity
            }));
    }, [state.sales, state.products]);

    const totalCustomerDues = useMemo(() => state.sales.reduce((sum, sale) => {
        const paid = (sale.payments || []).reduce((pSum, p) => pSum + Number(p.amount), 0);
        return sum + (Number(sale.totalAmount) - paid);
    }, 0), [state.sales]);

    const totalPurchaseDues = useMemo(() => state.purchases.reduce((sum, pur) => {
        const paid = (pur.payments || []).reduce((pSum, p) => pSum + Number(p.amount), 0);
        return sum + (Number(pur.totalAmount) - paid);
    }, 0), [state.purchases]);

    if (pinState !== 'unlocked') {
        return (
            <div>
                <ConfirmationModal
                    isOpen={isResetConfirmOpen}
                    onClose={() => setIsResetConfirmOpen(false)}
                    onConfirm={handleConfirmReset}
                    title="Confirm PIN Reset"
                    confirmText="Yes, Reset PIN"
                    confirmVariant="danger"
                >
                    Are you sure? This will permanently remove your current PIN. You will be asked to set a new one. This action cannot be undone.
                </ConfirmationModal>
                <h1 className="text-2xl font-bold text-primary mb-4">Business Insights</h1>
                <Card>
                    <div className="text-center py-8">
                        <Lock size={48} className="mx-auto text-gray-400 mb-4" />
                        <h2 className="text-xl font-semibold">Security PIN Required</h2>
                        <p className="text-gray-600">Please set or enter your PIN to view this sensitive information.</p>
                    </div>
                </Card>
                {pinState === 'locked' && (
                    <PinModal
                        mode="enter"
                        correctPin={state.pin}
                        onCorrectPin={handlePinCorrect}
                        onResetRequest={() => setIsResetConfirmOpen(true)}
                        onCancel={handleCancelPin}
                    />
                )}
                {pinState === 'no_pin_setup' && (
                    <PinModal
                        mode="setup"
                        onSetPin={handlePinSet}
                        onCancel={handleCancelPin}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Business Insights</h1>

            <Card title={profitCardTitle} className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-500">
                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                    <select value={profitFilterMonth} onChange={(e) => setProfitFilterMonth(parseInt(e.target.value))} className="w-full p-2 rounded-lg custom-select disabled:opacity-50" disabled={profitFilterYear === -1}>
                        <option value={-1}>All Months</option>
                        {monthNames.map((month, index) => <option key={month} value={index}>{month}</option>)}
                    </select>
                    <select value={profitFilterYear} onChange={(e) => { const newYear = parseInt(e.target.value); setProfitFilterYear(newYear); if (newYear === -1) setProfitFilterMonth(-1); }} className="w-full p-2 rounded-lg custom-select">
                        <option value={-1}>All Time</option>
                        {availableYearsForProfit.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
                <p className="text-5xl md:text-6xl font-extrabold tracking-tight text-center text-amber-900">
                    ₹{filteredProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </Card>

            <Card title={
                <div className="flex items-center gap-2">
                    <BarChart size={20} />
                    <span>Sales for Financial Year {chartYear}-{String(chartYear + 1).slice(2)}</span>
                </div>
            } className="bg-gradient-to-br from-indigo-50 to-purple-100 border-indigo-500">
                <div className="flex justify-end mb-4">
                    <select value={chartYear} onChange={(e) => setChartYear(parseInt(e.target.value))} className="p-2 rounded-lg custom-select">
                        {availableYearsForChart.map(year => (
                            <option key={year} value={year}>{year}-{String(year + 1).slice(2)}</option>
                        ))}
                    </select>
                </div>
                <div className="w-full">
                    <div className="flex justify-end text-sm text-gray-600">
                        Total Sales: <span className="font-bold ml-2">₹{yearlySalesData.totalSales.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex items-end justify-around h-64 mt-4 p-2 bg-white/50 rounded-lg border border-gray-200">
                        {yearlySalesData.monthlySales.map((sale, index) => {
                            const heightPercentage = (sale / yearlySalesData.maxSale) * 100;
                            const monthLabels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
                            return (
                                <div key={index} className="flex flex-col items-center w-full h-full justify-end">
                                    <div
                                        className="w-4/5 bg-indigo-400 hover:bg-indigo-600 rounded-t-md transition-all duration-300 ease-in-out"
                                        style={{ height: `${heightPercentage}%` }}
                                        title={`${monthLabels[index]}: ₹${sale.toLocaleString('en-IN')}`}
                                    />
                                    <span className="text-xs mt-1 text-gray-700">{monthLabels[index]}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Sales Trend">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-sm text-gray-500">This Month's Sales</p>
                            <p className="text-3xl font-bold text-primary">₹{salesTrend.currentMonthSales.toLocaleString('en-IN')}</p>
                            <p className="text-xs text-gray-400">vs ₹{salesTrend.lastMonthSales.toLocaleString('en-IN')} last month</p>
                        </div>
                        <div className={`flex items-center gap-1 font-bold ${salesTrend.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {salesTrend.percentageChange >= 0 ? <TrendingUp size={20}/> : <TrendingDown size={20}/>}
                            <span>{salesTrend.percentageChange.toFixed(1)}%</span>
                        </div>
                    </div>
                </Card>

                <Card title="Financial Summary">
                    <div className="flex justify-around text-center">
                        <div>
                            <p className="text-sm text-gray-500">Customer Dues</p>
                            <p className="text-3xl font-bold text-red-600">₹{totalCustomerDues.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-500">Purchase Dues</p>
                            <p className="text-3xl font-bold text-amber-600">₹{totalPurchaseDues.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </Card>

                <Card title="Top Customers (All Time)">
                    <div className="space-y-3">
                        {topCustomers.map(({ customer, total }, index) => (
                            <div key={customer?.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    {index === 0 && <Award size={16} className="text-amber-500" />}
                                    <span className="font-semibold">{customer?.name || 'Unknown'}</span>
                                </div>
                                <span className="font-bold">₹{total.toLocaleString('en-IN')}</span>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card title="Top Selling Products (All Time)">
                    <div className="space-y-3">
                         {topProducts.map(({ product, quantity }, index) => (
                             <div key={product?.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    {index === 0 && <Award size={16} className="text-amber-500" />}
                                    <span className="font-semibold">{product?.name || 'Unknown'}</span>
                                </div>
                                <span className="font-bold">{quantity} units</span>
                            </div>
                        ))}
                    </div>
                </Card>

            </div>
        </div>
    );
};

export default InsightsPage;