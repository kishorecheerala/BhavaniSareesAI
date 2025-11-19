
import React from 'react';

const SkeletonElement: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse-bg rounded-lg ${className}`} />
);

const AppSkeletonLoader: React.FC = () => {
    return (
        <div className="flex flex-col h-screen font-sans bg-background dark:bg-slate-900">
            {/* Header */}
            <header className="bg-gradient-to-r from-primary to-secondary text-white shadow-md p-4 flex items-center justify-between">
                <div className="w-8"></div> {/* Spacer */}
                <div className="h-6 w-36 bg-white/30 dark:bg-slate-700/30 rounded-md"></div>
                <div className="w-6 h-6 bg-white/30 dark:bg-slate-700/30 rounded-full"></div>
            </header>

            {/* Main Content mimicking Dashboard */}
            <main className="flex-grow overflow-y-auto p-4 pb-20 space-y-6">
                <SkeletonElement className="h-8 w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-amber-400">
                        <SkeletonElement className="h-20" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-amber-400">
                        <SkeletonElement className="h-20" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-amber-400">
                        <SkeletonElement className="h-20" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-amber-400">
                        <SkeletonElement className="h-20" />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6 border-t-4 border-amber-400">
                     <SkeletonElement className="h-8 w-1/2 mb-4" />
                     <SkeletonElement className="h-32" />
                </div>
            </main>

            {/* Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-primary shadow-lg z-50">
                <div className="flex justify-around max-w-2xl mx-auto">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div key={index} className="flex flex-col items-center justify-center w-full pt-2 pb-1">
                             <div className="w-6 h-6 mb-1 bg-purple-200/30 dark:bg-purple-900/30 rounded-md"></div>
                             <div className="w-12 h-2 bg-purple-200/30 dark:bg-purple-900/30 rounded"></div>
                        </div>
                    ))}
                </div>
            </nav>
        </div>
    );
};

export default AppSkeletonLoader;
