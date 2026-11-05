import React, { useState, useMemo } from 'react';
import {
  BarChart3, PieChart, TrendingUp, TrendingDown, Calendar,
  Share2, Check, Download, ArrowUpRight, ArrowDownRight,
  Landmark, CreditCard, ChevronLeft, ChevronRight, Layers
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';

export default function ReportsView() {
  const {
    transactions,
    bankAccountsWithBalance,
    loansWithSummary,
    currencySymbol,
    selectedMonthKey,
    setSelectedMonthKey
  } = useKhata();

  const [viewMode, setViewMode] = useState('MONTHLY'); // 'MONTHLY' | 'YEARLY'
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
  const [copied, setCopied] = useState(false);

  // Available years from transactions
  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear()]);
    transactions.forEach(t => {
      if (t.year) years.add(t.year);
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  // Filter transactions based on viewMode
  const scopedTransactions = useMemo(() => {
    if (viewMode === 'MONTHLY') {
      return transactions.filter(t => t.monthKey === selectedMonthKey);
    } else {
      return transactions.filter(t => t.year === selectedYear);
    }
  }, [transactions, viewMode, selectedMonthKey, selectedYear]);

  // Overall calculations
  const { totalIncome, totalExpense, netSavings, savingsRate, capitalPaid, interestPaid } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    let cap = 0;
    let intr = 0;

    scopedTransactions.forEach(t => {
      if (t.type === 'INCOME') inc += t.amount;
      if (t.type === 'EXPENSE') {
        exp += t.amount;
        cap += (t.principalPaid || 0);
        intr += (t.interestPaid || 0);
      }
    });

    const net = inc - exp;
    const rate = inc > 0 ? Math.round((net / inc) * 100) : 0;

    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: net,
      savingsRate: rate,
      capitalPaid: cap,
      interestPaid: intr
    };
  }, [scopedTransactions]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    scopedTransactions.filter(t => t.type === 'EXPENSE').forEach(t => {
      // Group Bills if needed or use full category
      const cat = t.category || 'Other';
      map[cat] = (map[cat] || 0) + t.amount;
    });

    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [scopedTransactions, totalExpense]);

  // Account spending breakdown
  const accountBreakdown = useMemo(() => {
    const map = {};
    scopedTransactions.forEach(t => {
      const accName = t.accountName || 'Unlinked / Cash';
      if (!map[accName]) map[accName] = { income: 0, expense: 0 };
      if (t.type === 'INCOME') map[accName].income += t.amount;
      if (t.type === 'EXPENSE') map[accName].expense += t.amount;
    });

    return Object.entries(map).map(([accountName, data]) => ({
      accountName,
      ...data,
      net: data.income - data.expense
    })).sort((a, b) => b.expense - a.expense);
  }, [scopedTransactions]);

  const periodLabel = useMemo(() => {
    if (viewMode === 'MONTHLY') {
      const [y, m] = selectedMonthKey.split('-').map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    return `Year ${selectedYear}`;
  }, [viewMode, selectedMonthKey, selectedYear]);

  // Copy shareable summary text
  const handleCopySummary = () => {
    let text = `📊 *Personal Khata Book - ${periodLabel} Report*\n`;
    text += `💰 Income: ${currencySymbol}${totalIncome.toLocaleString()}\n`;
    text += `💸 Expenses: ${currencySymbol}${totalExpense.toLocaleString()}\n`;
    text += `📈 Net Savings: ${currencySymbol}${netSavings.toLocaleString()} (${savingsRate}%)\n`;

    if (capitalPaid > 0 || interestPaid > 0) {
      text += `🏦 Loan Repayments: Capital ${currencySymbol}${capitalPaid.toLocaleString()} | Interest ${currencySymbol}${interestPaid.toLocaleString()}\n`;
    }

    if (categoryBreakdown.length > 0) {
      text += `\n*Top Spending Categories:*\n`;
      categoryBreakdown.slice(0, 5).forEach((c, idx) => {
        text += `${idx + 1}. ${c.category}: ${currencySymbol}${c.amount.toLocaleString()} (${c.percentage}%)\n`;
      });
    }

    text += `\n_Generated via Personal Khata Book_`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header: View Mode & Period Switcher */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setViewMode('MONTHLY')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'MONTHLY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Monthly Report
          </button>
          <button
            onClick={() => setViewMode('YEARLY')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'YEARLY' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Yearly Report
          </button>
        </div>

        {/* Period Selector & Export */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {viewMode === 'MONTHLY' ? (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              <span>{periodLabel}</span>
            </div>
          ) : (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-3 py-2 text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
          >
            {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Share Summary'}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">Total Income</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">
            {currencySymbol}{totalIncome.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">Cash flow in</span>
        </div>

        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider block">Total Expenses</span>
          <span className="text-xl font-black text-red-600 mt-1 block">
            {currencySymbol}{totalExpense.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">Spent out</span>
        </div>

        <div className={`p-4 border rounded-2xl shadow-xs ${
          netSavings >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-red-50/70 border-red-200'
        }`}>
          <span className={`text-xs font-bold uppercase tracking-wider block ${
            netSavings >= 0 ? 'text-emerald-800' : 'text-red-700'
          }`}>
            Net Savings
          </span>
          <span className={`text-xl font-black mt-1 block ${
            netSavings >= 0 ? 'text-emerald-800' : 'text-red-700'
          }`}>
            {currencySymbol}{netSavings.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-500 block mt-0.5">
            {savingsRate}% savings rate
          </span>
        </div>

        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-purple-700 uppercase tracking-wider block">Capital Paid</span>
          <span className="text-xl font-black text-purple-700 mt-1 block">
            {currencySymbol}{capitalPaid.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">
            Interest: {currencySymbol}{interestPaid.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Breakdown Grid: Category & Accounts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <PieChart className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-gray-900 text-sm">Expenses by Category</h3>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              No expenses recorded in this period.
            </div>
          ) : (
            <div className="space-y-3.5">
              {categoryBreakdown.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-gray-800 truncate">{item.category}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{currencySymbol}{item.amount.toLocaleString()}</span>
                      <span className="text-gray-400 text-[11px] w-8 text-right font-medium">{item.percentage}%</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-600 rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bank & Account Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-4">
            <Landmark className="w-5 h-5 text-emerald-700" />
            <h3 className="font-bold text-gray-900 text-sm">Account Activity Breakdown</h3>
          </div>

          {accountBreakdown.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-xs">
              No account transactions recorded in this period.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {accountBreakdown.map((item) => (
                <div key={item.accountName} className="py-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-xs text-gray-900 block">{item.accountName}</span>
                    <span className="text-[11px] text-gray-400">
                      In: +{currencySymbol}{item.income.toLocaleString()} | Out: -{currencySymbol}{item.expense.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${item.net >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {item.net >= 0 ? '+' : ''}{currencySymbol}{item.net.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-gray-400 block">Period Net</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
