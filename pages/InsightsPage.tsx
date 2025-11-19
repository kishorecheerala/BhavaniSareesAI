
import React, { useState, useMemo, useEffect, useRef, PropsWithChildren } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Award, Lock, BarChart, Calendar, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import PinModal from '../components/PinModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Page, Sale, SaleItem } from '../types';
import Dropdown from '../components/Dropdown';

interface InsightsPageProps {
    setCurrentPage: (page: Page) => void;
}

// --- Helper Components for Charts ---

const Tooltip = ({ x, y, children }: PropsWithChildren<{ x: number, y: number }>) => (
    <div 
        className="absolute z-50 bg-gray-900 text-white text-xs rounded px-2 py-1 pointer-events-none shadow-lg transform -translate-x-1/2 -translate-y-full"
        style={{ left: x, top: y - 10 }}
    >
        {children}
        <div className="absolute left-1/2 top-100 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
    </div>
);

const SalesProfitChart = ({ data }: { data: { label: string, sales: number, profit: number }[] }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const height = 300;
    const padding = { top: 20, right: 0, bottom: 30, left: 40 };

    useEffect(() => {
        if (svgRef.current) {
            setWidth(svgRef.current.clientWidth);
        }
        const handleResize = () => {
            if (svgRef.current) setWidth(svgRef.current.clientWidth);
        }
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const maxVal = Math.max(...data.map(d => Math.max(d.sales, d.profit))) * 1.1 || 1000;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = (chartWidth / data.length) * 0.5;

    const getY = (val: number) => chartHeight - (val / maxVal) * chartHeight + padding.top;
    const getX = (index: number) => padding.left + (index * (chartWidth / data.length)) + (chartWidth / data.length) / 2;

    // Profit Line Path
    const linePath = data.map((d, i) => 
        `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.profit)}`
    ).join(' ');

    return (
        <div className="relative h-[300px] w-full select-none">
            <svg ref={svgRef} className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(tick => {
                    const y = padding.top + chartHeight * (1 - tick);
                    return (
                        <g key={tick}>
                            <line x1={padding.left} y1={y} x2={width} y2={y} stroke="#e5e7eb" strokeDasharray="4" className="dark:stroke-slate-700" />
                            <text x={padding.left - 5} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400">
                                {Math.round(maxVal * tick / 1000)}k
                            </text>
                        </g>
                    );
                })}

                {/* Bars (Sales) */}
                {data.map((d, i) => {
                    const x = getX(i) - barWidth / 2;
                    const y = getY(d.sales);
                    const h = chartHeight - (y - padding.top);
                    return (
                        <g key={`bar-${i}`}>
                            <rect 
                                x={x} 
                                y={y} 
                                width={barWidth} 
                                height={h} 
                                className="fill-teal-500 hover:fill-teal-400 transition-all duration-300 rx-1"
                                onMouseEnter={() => setHoverIndex(i)}
                                onMouseLeave={() => setHoverIndex(null)}
                            />
                            <text x={getX(i)} y={height - 10} textAnchor="middle" className="text-[10px] fill-gray-500 dark:fill-gray-400 font-medium">
                                {d.label}
                            </text>
                        </g>
                    );
                })}

                {/* Line (Profit) */}
                <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="3" className="drop-shadow-sm" />
                
                {/* Line Dots */}
                {data.map((d, i) => (
                    <circle 
                        key={`dot-${i}`} 
                        cx={getX(i)} 
                        cy={getY(d.profit)} 
                        r="4" 
                        className="fill-white stroke-amber-500 stroke-2 hover:r-6 transition-all"
                        onMouseEnter={() => setHoverIndex(i)}
                        onMouseLeave={() => setHoverIndex(null)}
                    />
                ))}
                
                {/* Interaction Overlay (for better mobile touch) */}
                 {data.map((d, i) => (
                    <rect
                        key={`overlay-${i}`}
                        x={getX(i) - (chartWidth / data.length) / 2}
                        y={padding.top}
                        width={chartWidth / data.length}
                        height={chartHeight}
                        fill="transparent"
                        onMouseEnter={() => setHoverIndex(i)}
                        onMouseLeave={() => setHoverIndex(null)}
                        onTouchStart={() => setHoverIndex(i)}
                    />
                ))}

            </svg>

            {/* Tooltip */}
            {hoverIndex !== null && width > 0 && (
                <Tooltip x={getX(hoverIndex)} y={Math.min(getY(data[hoverIndex].sales), getY(data[hoverIndex].profit))}>
                    <div className="font-bold mb-1">{data[hoverIndex].label}</div>
                    <div className="flex items-center gap-2 text-teal-200">
                        <span className="w-2 h-2 rounded-full bg-teal-400"></span>
                        Sales: ₹{data[hoverIndex].sales.toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2 text-amber-200">
                         <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                         Profit: ₹{data[hoverIndex].profit.toLocaleString()}
                    </div>
                </Tooltip>
            )}
            
             <div className="absolute top-0 right-0 flex gap-4 text-xs">
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-teal-500 rounded-sm"></span> Sales</div>
                <div className="flex items-center gap-1"><span className="w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-800"></span> Profit</div>
            </div>
        </div>
    );
};

const DailyTrendChart = ({ data }: { data: { day: number, value: number }[] }) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const height = 200;
    const padding = 10;

    useEffect(() => {
        if (svgRef.current) setWidth(svgRef.current.clientWidth);
    }, []);

    if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400">No data for this month</div>;

    const maxVal = Math.max(...data.map(d => d.value)) * 1.1 || 100;
    // Fill gaps for days if needed, but assuming continuous day index mapping for X
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    
    const getX = (day: number) => (day / daysInMonth) * width;
    const getY = (val: number) => height - (val / maxVal) * height;

    // Create Path
    let pathD = `M 0 ${height}`;
    data.forEach(d => {
        pathD += ` L ${getX(d.day)} ${getY(d.value)}`;
    });
    pathD += ` L ${width} ${height} Z`; // Close path for area fill

    const lineD = data.map((d, i) => `${i===0?'M':'L'} ${getX(d.day)} ${getY(d.value)}`).join(' ');

    return (
         <div className="relative h-[200px] w-full">
            <svg ref={svgRef} className="w-full h-full overflow-visible">
                <defs>
                    <linearGradient id="grad1" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                    </linearGradient>
                </defs>
                <path d={pathD} fill="url(#grad1)" />
                <path d={lineD} fill="none" stroke="#8b5cf6" strokeWidth="2" />
                 {data.filter(d => d.value > maxVal * 0.2).map((d, i) => (
                     // Show dots only for significant values to reduce clutter
                     <circle key={i} cx={getX(d.day)} cy={getY(d.value)} r="2" className="fill-white stroke-purple-600" />
                 ))}
            </svg>
         </div>
    );
}

// --- Main Component ---

const InsightsPage: React.FC<InsightsPageProps> = ({ setCurrentPage }) => {
    const { state, isDbLoaded, dispatch, showToast } = useAppContext();
    
    type PinState = 'checking' | 'locked' | 'unlocked' | 'no_pin_setup';
    const [pinState, setPinState] = useState<PinState>('checking');
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    const [chartYear, setChartYear] = useState<string>(() => {
        const now = new Date();
        return String(now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear());
    });

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

    const availableYearsForChart = useMemo(() => {
        if (!isDbLoaded) return [];
        const years = new Set(state.sales.map(s => {
            const d = new Date(s.date);
            return d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
        }));
        const currentFY = new Date().getMonth() < 3 ? new Date().getFullYear() - 1 : new Date().getFullYear();
        if (!years.has(currentFY)) years.add(currentFY);
        return Array.from(years).sort((a: number, b: number) => b - a);
    }, [state.sales, isDbLoaded]);

    // --- Data Aggregation ---

    const yearlyData: { label: string; sales: number; profit: number }[] = useMemo(() => {
        if (!isDbLoaded) return [];

        const year = parseInt(chartYear);
        const financialYearStart = new Date(year, 3, 1); // April 1st
        const financialYearEnd = new Date(year + 1, 3, 0); // March 31st

        const data = Array(12).fill(null).map((_, i) => {
            const monthIndex = (i + 3) % 12; // 0=Apr, 11=Mar
            const displayMonth = new Date(0, monthIndex).toLocaleString('default', { month: 'short' });
            return { label: displayMonth, sales: 0, profit: 0 };
        });

        state.sales.forEach(sale => {
            const saleDate = new Date(sale.date);
            if (saleDate >= financialYearStart && saleDate <= financialYearEnd) {
                const month = saleDate.getMonth();
                const financialMonthIndex = month >= 3 ? month - 3 : month + 9;
                
                const saleAmount = Number(sale.totalAmount);
                const costOfGoods = sale.items.reduce((sum, item) => {
                    const product = state.products.find(p => p.id === item.productId);
                    // Assuming current purchasePrice is the cost. 
                    // In a real app, we'd need historical CP, but this is an approximation.
                    return sum + (Number(product?.purchasePrice) || 0) * item.quantity;
                }, 0);

                data[financialMonthIndex].sales += saleAmount;
                data[financialMonthIndex].profit += (saleAmount - costOfGoods);
            }
        });

        return data;
    }, [state.sales, state.products, chartYear, isDbLoaded]);

    const dailyTrendData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        // Initialize array for all days in month up to today
        const todayDate = now.getDate();
        const days = Array.from({ length: todayDate }, (_, i) => ({ day: i + 1, value: 0 }));

        state.sales.forEach(sale => {
            const d = new Date(sale.date);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear && d.getDate() <= todayDate) {
                const dayIndex = d.getDate() - 1;
                if (days[dayIndex]) {
                    days[dayIndex].value += Number(sale.totalAmount);
                }
            }
        });

        return days;
    }, [state.sales]);

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
            percentageChange = 100; 
        }
        
        return { currentMonthSales, lastMonthSales, percentageChange };
    }, [state.sales]);

    const topCustomers = useMemo(() => {
        const customerTotals = state.sales.reduce((acc, sale) => {
            acc[sale.customerId] = (acc[sale.customerId] || 0) + Number(sale.totalAmount);
            return acc;
        }, {} as { [key: string]: number });

        const sorted = Object.entries(customerTotals).sort(([, a], [, b]) => Number(b) - Number(a)).slice(0, 5);
        const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

        return sorted.map(([customerId, total]) => ({
                customer: state.customers.find(c => c.id === customerId),
                total,
                percent: (total / maxVal) * 100
            }));
    }, [state.sales, state.customers]);

    const topProducts = useMemo(() => {
        const productTotals = state.sales.reduce((acc, sale) => {
            sale.items.forEach(item => {
                acc[item.productId] = (acc[item.productId] || 0) + Number(item.quantity);
            });
            return acc;
        }, {} as { [key: string]: number });
        
        const sorted = Object.entries(productTotals).sort(([, a], [, b]) => Number(b) - Number(a)).slice(0, 5);
        const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

        return sorted.map(([productId, quantity]) => ({
                product: state.products.find(p => p.id === productId),
                quantity,
                percent: (quantity / maxVal) * 100
            }));
    }, [state.sales, state.products]);

    const totalFinancials = useMemo(() => {
        const year = parseInt(chartYear);
        // Approx stats for the displayed FY
        return yearlyData.reduce((acc, curr) => ({
            sales: acc.sales + curr.sales,
            profit: acc.profit + curr.profit
        }), { sales: 0, profit: 0 });
    }, [yearlyData]);

    const totalCustomerDues = useMemo(() => state.sales.reduce((sum, sale) => {
        const paid = (sale.payments || []).reduce((pSum, p) => pSum + Number(p.amount), 0);
        return sum + (Number(sale.totalAmount) - paid);
    }, 0), [state.sales]);


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
                        <p className="text-gray-600 dark:text-gray-400">Please set or enter your PIN to view this sensitive information.</p>
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
        <div className="space-y-6 animate-fade-in-fast">
            <div className="flex justify-between items-center">
                 <h1 className="text-2xl font-bold text-primary">Business Insights</h1>
                 <div className="w-40">
                    <Dropdown
                        options={availableYearsForChart.map(year => ({ value: String(year), label: `FY ${year}-${String(year + 1).slice(2)}`}))}
                        value={chartYear}
                        onChange={setChartYear}
                    />
                 </div>
            </div>

            {/* Big Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 border-teal-500">
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-teal-800 dark:text-teal-200 uppercase tracking-wide">Total Revenue (FY)</span>
                        <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-bold text-teal-900 dark:text-teal-100">₹{totalFinancials.sales.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </Card>
                <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 border-amber-500">
                     <div className="flex flex-col">
                        <span className="text-sm font-medium text-amber-800 dark:text-amber-200 uppercase tracking-wide">Total Profit (Est.)</span>
                         <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-bold text-amber-900 dark:text-amber-100">₹{totalFinancials.profit.toLocaleString('en-IN')}</span>
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                                ({((totalFinancials.profit / (totalFinancials.sales || 1)) * 100).toFixed(1)}% margin)
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Main Chart */}
            <Card title={`Sales & Profit Performance (FY ${chartYear})`}>
                <SalesProfitChart data={yearlyData} />
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Daily Trend */}
                <Card className="relative overflow-hidden">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">This Month's Daily Trend</h3>
                            <p className="text-xs text-gray-500">Daily sales performance</p>
                        </div>
                        <div className={`flex flex-col items-end ${salesTrend.percentageChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            <span className="text-2xl font-bold">₹{salesTrend.currentMonthSales.toLocaleString('en-IN')}</span>
                            <div className="flex items-center text-xs font-semibold">
                                {salesTrend.percentageChange >= 0 ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                                {Math.abs(salesTrend.percentageChange).toFixed(1)}% vs last mo.
                            </div>
                        </div>
                    </div>
                    <DailyTrendChart data={dailyTrendData} />
                </Card>

                {/* Dues Summary */}
                <Card title="Dues Overview">
                    <div className="flex flex-col h-full justify-center gap-6 py-4">
                        <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-800 rounded-full text-red-600 dark:text-red-200">
                                    <ArrowDownRight size={24} />
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">To Collect</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Customer Dues</p>
                                </div>
                            </div>
                            <p className="text-2xl font-bold text-red-600 dark:text-red-400">₹{totalCustomerDues.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </Card>

                {/* Top Customers Bar Chart */}
                <Card title="Top 5 Customers (All Time)">
                    <div className="space-y-4 mt-2">
                        {topCustomers.map(({ customer, total, percent }, index) => (
                            <div key={customer?.id || index} className="w-full">
                                <div className="flex justify-between text-sm mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${index < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700'}`}>
                                            {index + 1}
                                        </div>
                                        <span className="font-semibold dark:text-gray-200">{customer?.name || 'Unknown'}</span>
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300">₹{total.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Top Products Bar Chart */}
                <Card title="Top 5 Products (All Time)">
                    <div className="space-y-4 mt-2">
                         {topProducts.map(({ product, quantity, percent }, index) => (
                             <div key={product?.id || index} className="w-full">
                                <div className="flex justify-between text-sm mb-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold ${index < 3 ? 'bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700'}`}>
                                            {index + 1}
                                        </div>
                                        <span className="font-semibold truncate max-w-[150px] dark:text-gray-200">{product?.name || 'Unknown'}</span>
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300">{quantity} units</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div>
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
