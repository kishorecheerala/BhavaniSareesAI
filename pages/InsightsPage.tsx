

import React, { useState, useMemo, useEffect, useRef, PropsWithChildren } from 'react';
import { IndianRupee, TrendingUp, TrendingDown, Award, Lock, BarChart, Calendar, ArrowUpRight, ArrowDownRight, ShoppingBag, PieChart, Activity, DollarSign } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import Card from '../components/Card';
import PinModal from '../components/PinModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { Page, Sale, Product } from '../types';
import Dropdown from '../components/Dropdown';

interface InsightsPageProps {
    setCurrentPage: (page: Page) => void;
}

// --- Helper Logic ---

const CATEGORY_MAP: Record<string, string> = {
    'KAN': 'Kanchi Pattu',
    'COT': 'Cotton',
    'SILK': 'Mysore Silk',
    'SYN': 'Synthetics',
    'BAN': 'Banarasi',
    'POC': 'Pochampally',
    'GAD': 'Gadwal',
    'CHA': 'Chanderi',
    'TUS': 'Tussar',
    'UPP': 'Uppada',
};

const getCategoryName = (id: string) => {
    const parts = id.split('-');
    if (parts.length > 1 && CATEGORY_MAP[parts[1]]) {
        return CATEGORY_MAP[parts[1]];
    }
    return 'Other';
};

const COLORS = ['#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

// --- Components ---

const Tooltip = ({ x, y, children }: PropsWithChildren<{ x: number, y: number }>) => (
    <div 
        className="absolute z-50 bg-gray-900/95 backdrop-blur text-white text-xs rounded-lg px-3 py-2 pointer-events-none shadow-xl transform -translate-x-1/2 -translate-y-full border border-white/10"
        style={{ left: x, top: y - 12 }}
    >
        {children}
        <div className="absolute left-1/2 top-full transform -translate-x-1/2 border-4 border-transparent border-t-gray-900/95"></div>
    </div>
);

const SalesProfitChart = ({ data }: { data: { label: string, sales: number, profit: number }[] }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [width, setWidth] = useState(0);
    const height = 300;
    const padding = { top: 40, right: 20, bottom: 40, left: 50 };

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

    if (data.length === 0) return <div className="h-[300px] flex items-center justify-center text-gray-400">No data available</div>;

    const maxVal = Math.max(...data.map(d => Math.max(d.sales, d.profit))) * 1.1 || 1000;
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const barWidth = Math.min(40, (chartWidth / data.length) * 0.6);

    const getY = (val: number) => chartHeight - (val / maxVal) * chartHeight + padding.top;
    const getX = (index: number) => padding.left + (index * (chartWidth / data.length)) + (chartWidth / data.length) / 2;

    // Smooth line generator
    const generateSmoothPath = (points: {x: number, y: number}[]) => {
        if (points.length === 0) return "";
        const d = points.reduce((acc, point, i, a) => {
            if (i === 0) return `M ${point.x},${point.y}`;
            const cpsX = a[i - 1].x + (point.x - a[i - 1].x) / 2;
            return `${acc} C ${cpsX},${a[i - 1].y} ${cpsX},${point.y} ${point.x},${point.y}`;
        }, "");
        return d;
    };

    const profitPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.profit) }));
    const linePath = generateSmoothPath(profitPoints);

    return (
        <div className="relative h-[300px] w-full select-none">
            <svg ref={svgRef} className="w-full h-full overflow-visible">
                {/* Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map(tick => {
                    const y = padding.top + chartHeight * (1 - tick);
                    return (
                        <g key={tick}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeDasharray="4" className="dark:stroke-slate-700" />
                            <text x={padding.left - 10} y={y + 4} textAnchor="end" className="text-[10px] fill-gray-400 font-mono">
                                {(Math.round(maxVal * tick / 1000)) + 'k'}
                            </text>
                        </g>
                    );
                })}

                {/* Bars (Sales) */}
                {data.map((d, i) => {
                    const x = getX(i) - barWidth / 2;
                    const y = getY(d.sales);
                    const h = Math.max(0, chartHeight - (y - padding.top));
                    const isHovered = hoverIndex === i;
                    return (
                        <g key={`bar-${i}`}>
                            <rect 
                                x={x} 
                                y={y} 
                                width={barWidth} 
                                height={h} 
                                rx={4}
                                className={`transition-all duration-200 ${isHovered ? 'fill-teal-400 dark:fill-teal-300' : 'fill-teal-500/80 dark:fill-teal-500'}`}
                            />
                            {/* Label */}
                             {width > 400 && (
                                <text x={getX(i)} y={height - 15} textAnchor="middle" className={`text-[10px] font-medium transition-colors ${isHovered ? 'fill-teal-600 dark:fill-teal-300' : 'fill-gray-500 dark:fill-gray-400'}`}>
                                    {d.label}
                                </text>
                             )}
                        </g>
                    );
                })}

                {/* Line (Profit) */}
                <path d={linePath} fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" className="drop-shadow-md" />
                
                {/* Line Dots & Overlay */}
                {data.map((d, i) => (
                    <g key={`group-${i}`}>
                         {/* Invisible Overlay for easier touch/hover */}
                        <rect
                            x={getX(i) - (chartWidth / data.length) / 2}
                            y={padding.top}
                            width={chartWidth / data.length}
                            height={chartHeight}
                            fill="transparent"
                            onMouseEnter={() => setHoverIndex(i)}
                            onMouseLeave={() => setHoverIndex(null)}
                            onTouchStart={() => setHoverIndex(i)}
                        />
                        {/* Profit Dot */}
                        <circle 
                            cx={getX(i)} 
                            cy={getY(d.profit)} 
                            r={hoverIndex === i ? 6 : 4}
                            className="fill-white stroke-amber-500 stroke-2 transition-all duration-200 pointer-events-none"
                        />
                    </g>
                ))}
            </svg>

            {/* Tooltip */}
            {hoverIndex !== null && width > 0 && (
                <Tooltip x={getX(hoverIndex)} y={Math.min(getY(data[hoverIndex].sales), getY(data[hoverIndex].profit))}>
                    <div className="font-bold mb-2 border-b border-white/10 pb-1">{data[hoverIndex].label}</div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <div className="text-teal-200 text-[10px] uppercase font-semibold">Revenue</div>
                        <div className="text-right font-mono font-bold">₹{data[hoverIndex].sales.toLocaleString()}</div>
                        
                        <div className="text-amber-200 text-[10px] uppercase font-semibold">Profit</div>
                        <div className="text-right font-mono font-bold">₹{data[hoverIndex].profit.toLocaleString()}</div>
                        
                        <div className="text-gray-400 text-[10px] uppercase font-semibold mt-1 pt-1 border-t border-white/10">Margin</div>
                        <div className="text-right font-mono text-xs mt-1 pt-1 border-t border-white/10">
                            {data[hoverIndex].sales > 0 ? ((data[hoverIndex].profit / data[hoverIndex].sales) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                </Tooltip>
            )}
            
             <div className="absolute top-0 left-0 w-full flex justify-between px-4 items-center">
                <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm">Monthly Performance</h3>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-teal-500 rounded-sm"></span> Sales</div>
                    <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-500 rounded-full border-2 border-white dark:border-slate-800"></span> Profit</div>
                </div>
            </div>
        </div>
    );
};

const CategoryDonutChart = ({ data }: { data: { name: string, value: number }[] }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercent = 0;
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

    if (total === 0) return <div className="h-[250px] flex items-center justify-center text-gray-400">No sales data</div>;

    // Calculate chart segments
    const segments = data.map((item, index) => {
        const startPercent = cumulativePercent;
        const percent = item.value / total;
        cumulativePercent += percent;
        
        // SVG Arc Math
        const x = Math.cos(2 * Math.PI * startPercent);
        const y = Math.sin(2 * Math.PI * startPercent);
        // Not implementing full SVG arc path drawing here for brevity as it's complex to get right without a library.
        // Instead, utilizing the stroke-dasharray trick on circles.
        return { ...item, percent, color: COLORS[index % COLORS.length] };
    });

    // Simple CSS Conic Gradient for the donut
    const conicGradient = segments.map(s => `${s.color} 0 ${s.percent * 100}%`).join(', ');
    let currentAngle = 0;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 h-[300px]">
            <div className="relative w-48 h-48">
                 <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full overflow-visible">
                    {segments.map((segment, i) => {
                        const circumference = 2 * Math.PI * 40; // r=40
                        const strokeDasharray = `${segment.percent * circumference} ${circumference}`;
                        const strokeDashoffset = -currentAngle * circumference;
                        currentAngle += segment.percent;
                        
                        return (
                            <circle
                                key={i}
                                cx="50"
                                cy="50"
                                r="40"
                                fill="transparent"
                                stroke={segment.color}
                                strokeWidth={hoveredIndex === i ? "14" : "10"}
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                className="transition-all duration-300 cursor-pointer hover:opacity-90"
                                onMouseEnter={() => setHoveredIndex(i)}
                                onMouseLeave={() => setHoveredIndex(null)}
                            />
                        );
                    })}
                    {/* Center Text */}
                    <foreignObject x="25" y="25" width="50" height="50">
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 dark:text-gray-300">
                             <span className="text-[10px] font-semibold uppercase opacity-70">Total</span>
                             <span className="text-xs font-bold">₹{(total/1000).toFixed(0)}k</span>
                        </div>
                    </foreignObject>
                </svg>
            </div>

            <div className="flex-1 w-full max-w-xs">
                 <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                    {segments.map((segment, i) => (
                        <div 
                            key={i} 
                            className={`flex items-center justify-between p-2 rounded-md transition-colors ${hoveredIndex === i ? 'bg-gray-100 dark:bg-slate-700' : ''}`}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: segment.color }}></span>
                                <span className="text-sm font-medium dark:text-gray-200 truncate max-w-[100px] sm:max-w-[140px]">{segment.name}</span>
                            </div>
                            <div className="text-right">
                                <div className="text-sm font-bold dark:text-white">{(segment.percent * 100).toFixed(1)}%</div>
                                <div className="text-[10px] text-gray-500">₹{segment.value.toLocaleString()}</div>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, subtext, trend, icon: Icon, colorClass }: any) => (
    <Card className={`relative overflow-hidden ${colorClass} border-l-4`}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-sm font-medium opacity-80 uppercase tracking-wide">{title}</p>
                <h3 className="text-2xl font-bold mt-1">{value}</h3>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Icon size={20} className="opacity-90" />
            </div>
        </div>
        <div className="mt-4 flex items-center text-sm font-medium">
            {trend > 0 ? (
                <span className="flex items-center text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded">
                    <ArrowUpRight size={14} className="mr-1" /> {Math.abs(trend).toFixed(1)}%
                </span>
            ) : (
                <span className="flex items-center text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded">
                    <ArrowDownRight size={14} className="mr-1" /> {Math.abs(trend).toFixed(1)}%
                </span>
            )}
            <span className="ml-2 opacity-70 text-xs">vs last month</span>
        </div>
    </Card>
);


// --- Main Component ---

const InsightsPage: React.FC<InsightsPageProps> = ({ setCurrentPage }) => {
    const { state, isDbLoaded, dispatch, showToast } = useAppContext();
    
    type PinState = 'checking' | 'locked' | 'unlocked' | 'no_pin_setup';
    const [pinState, setPinState] = useState<PinState>('checking');
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

    const [chartYear, setChartYear] = useState<string>(() => {
        const now = new Date();
        // Default to current financial year (April to March)
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
                // Cost estimation: Using current product purchase price (approximation)
                const costOfGoods = sale.items.reduce((sum, item) => {
                    const product = state.products.find(p => p.id === item.productId);
                    return sum + (Number(product?.purchasePrice) || 0) * Number(item.quantity);
                }, 0);

                data[financialMonthIndex].sales += saleAmount;
                data[financialMonthIndex].profit += (saleAmount - costOfGoods);
            }
        });

        return data;
    }, [state.sales, state.products, chartYear, isDbLoaded]);

    // KPI Calculations
    const kpiData = useMemo(() => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        const getMetrics = (m: number, y: number) => {
            const monthSales = state.sales.filter(s => { const d = new Date(s.date); return d.getMonth() === m && d.getFullYear() === y; });
            const revenue = monthSales.reduce((sum, s) => sum + Number(s.totalAmount), 0);
            const cost = monthSales.reduce((sum, s) => sum + s.items.reduce((is, i) => is + (Number(state.products.find(p => p.id === i.productId)?.purchasePrice) || 0) * Number(i.quantity), 0), 0);
            const profit = revenue - cost;
            const orders = monthSales.length;
            const aov = orders > 0 ? revenue / orders : 0;
            return { revenue, profit, orders, aov };
        };

        const curr = getMetrics(currentMonth, currentYear);
        const prev = getMetrics(lastMonth, lastMonthYear);

        const calcTrend = (c: number, p: number) => {
            if (p === 0) return c === 0 ? 0 : 100;
            return ((c - p) / p) * 100;
        };

        return {
            revenue: { value: curr.revenue, trend: calcTrend(Number(curr.revenue), Number(prev.revenue)) },
            profit: { value: curr.profit, trend: calcTrend(Number(curr.profit), Number(prev.profit)) },
            orders: { value: curr.orders, trend: calcTrend(Number(curr.orders), Number(prev.orders)) },
            aov: { value: curr.aov, trend: calcTrend(Number(curr.aov), Number(prev.aov)) },
        };
    }, [state.sales, state.products]);

    const categoryData = useMemo(() => {
        const categories: Record<string, number> = {};
        state.sales.forEach(sale => {
            sale.items.forEach(item => {
                const cat = getCategoryName(item.productId);
                categories[cat] = (categories[cat] || 0) + (Number(item.price) * Number(item.quantity));
            });
        });
        return Object.entries(categories)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [state.sales]);

    const topProducts = useMemo(() => {
        const productTotals = state.sales.reduce((acc, sale) => {
            sale.items.forEach(item => {
                acc[item.productId] = (acc[item.productId] || 0) + Number(item.quantity);
            });
            return acc;
        }, {} as { [key: string]: number });
        
        const sorted = Object.entries(productTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

        return sorted.map(([productId, quantity]) => ({
                product: state.products.find(p => p.id === productId),
                quantity,
                percent: (quantity / maxVal) * 100
            }));
    }, [state.sales, state.products]);

    const topCustomers = useMemo(() => {
         const customerTotals = state.sales.reduce((acc, sale) => {
            acc[sale.customerId] = (acc[sale.customerId] || 0) + Number(sale.totalAmount);
            return acc;
        }, {} as { [key: string]: number });

        const sorted = Object.entries(customerTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
        const maxVal = sorted.length > 0 ? sorted[0][1] : 1;

        return sorted.map(([customerId, total]) => ({
                customer: state.customers.find(c => c.id === customerId),
                total,
                percent: (total / maxVal) * 100
            }));
    }, [state.sales, state.customers]);


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
                    <div className="text-center py-12">
                        <div className="bg-gray-100 dark:bg-slate-700 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Lock size={40} className="text-primary" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Insights Locked</h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-xs mx-auto">Protected financial data. Please enter your PIN to access detailed business analytics.</p>
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
        <div className="space-y-6 animate-fade-in-fast pb-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                 <div>
                    <h1 className="text-2xl font-bold text-primary">Business Overview</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Performance metrics for {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                 </div>
                 <div className="w-48">
                    <Dropdown
                        options={availableYearsForChart.map(year => ({ value: String(year), label: `FY ${year}-${String(year + 1).slice(2)}`}))}
                        value={chartYear}
                        onChange={setChartYear}
                    />
                 </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard 
                    title="Total Revenue" 
                    value={`₹${kpiData.revenue.value.toLocaleString('en-IN')}`} 
                    trend={kpiData.revenue.trend} 
                    icon={IndianRupee}
                    colorClass="bg-teal-50 dark:bg-teal-900/20 text-teal-900 dark:text-teal-100 border-teal-500"
                />
                <KPICard 
                    title="Net Profit (Est.)" 
                    value={`₹${kpiData.profit.value.toLocaleString('en-IN')}`} 
                    trend={kpiData.profit.trend} 
                    icon={DollarSign}
                    colorClass="bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 border-amber-500"
                />
                 <KPICard 
                    title="Total Orders" 
                    value={kpiData.orders.value} 
                    trend={kpiData.orders.trend} 
                    icon={ShoppingBag}
                    colorClass="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-blue-500"
                />
                <KPICard 
                    title="Avg Order Value" 
                    value={`₹${kpiData.aov.value.toLocaleString('en-IN', {maximumFractionDigits: 0})}`} 
                    trend={kpiData.aov.trend} 
                    icon={Activity}
                    colorClass="bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-100 border-purple-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Chart Area */}
                <div className="lg:col-span-2">
                    <Card title={`Financial Performance (FY ${chartYear})`} className="h-full">
                        <SalesProfitChart data={yearlyData} />
                    </Card>
                </div>
                
                {/* Category Chart */}
                <div>
                    <Card title="Sales by Category" className="h-full">
                        <CategoryDonutChart data={categoryData} />
                    </Card>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top Products List */}
                <Card title="Top Selling Products">
                     <div className="space-y-5 mt-2">
                         {topProducts.map(({ product, quantity, percent }, index) => (
                             <div key={product?.id || index} className="relative">
                                <div className="flex justify-between items-end mb-1">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm dark:text-gray-200 truncate w-40 sm:w-auto">{product?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{product?.id}</div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300">{quantity} Sold</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-teal-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {topProducts.length === 0 && <p className="text-center text-gray-400 py-4">No sales data yet.</p>}
                    </div>
                </Card>

                {/* Top Customers List */}
                <Card title="Top Customers">
                     <div className="space-y-5 mt-2">
                        {topCustomers.map(({ customer, total, percent }, index) => (
                            <div key={customer?.id || index} className="relative">
                                <div className="flex justify-between items-end mb-1">
                                    <div className="flex items-center gap-3">
                                         <div className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-sm dark:text-gray-200">{customer?.name || 'Unknown'}</div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">{customer?.area}</div>
                                        </div>
                                    </div>
                                    <span className="font-bold text-gray-700 dark:text-gray-300">₹{total.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div className="bg-blue-500 h-2 rounded-full transition-all duration-500" style={{ width: `${percent}%` }}></div>
                                </div>
                            </div>
                        ))}
                        {topCustomers.length === 0 && <p className="text-center text-gray-400 py-4">No customer data yet.</p>}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default InsightsPage;
