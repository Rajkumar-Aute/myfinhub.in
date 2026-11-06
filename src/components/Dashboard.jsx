import React, { useState, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, Wallet, Landmark, Plus, ArrowUpRight,
  ArrowDownRight, Calendar, Search, Edit2, Trash2, ChevronLeft,
  ChevronRight, AlertCircle, ShieldCheck, CreditCard, Filter, ArrowRight, Banknote
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';

export default function Dashboard({
  onOpenAddTransaction,
  onEditTransaction,
  onOpenBankAccounts,
  onNavigateToLoans
}) {
  const {
    transactions,
    deleteTransaction,
    bankAccountsWithBalance,
    totalBankBalance,
    loansWithSummary,
    currencySymbol,
    selectedMonthKey,
    setSelectedMonthKey
  } = useKhata();

  const [accountCardTab, setAccountCardTab] = useState('BANKS'); // 'BANKS' | 'LOANS'
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // ALL | EXPENSE | INCOME

  // Calculate monthly summary
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => t.monthKey === selectedMonthKey);
  }, [transactions, selectedMonthKey]);

  const { totalIncome, totalExpense, netSavings } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    monthTransactions.forEach(t => {
      if (t.type === 'INCOME') inc += t.amount;
      else if (t.type === 'EXPENSE') exp += t.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netSavings: inc - exp
    };
  }, [monthTransactions]);

  // Safe to spend gauge
  const dailyGauge = useMemo(() => {
    if (!selectedMonthKey) return null;
    const [yearStr, monthStr] = selectedMonthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10); // 1-12
    const totalDaysInMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && (today.getMonth() + 1) === month;
    const currentDay = isCurrentMonth ? today.getDate() : totalDaysInMonth;
    const daysRemaining = Math.max(1, totalDaysInMonth - currentDay + 1);

    const safeDaily = netSavings > 0 ? (netSavings / daysRemaining) : 0;
    const dailyAvgExpense = currentDay > 0 ? (totalExpense / currentDay) : 0;

    return {
      totalDaysInMonth,
      currentDay,
      daysRemaining,
      safeDaily,
      dailyAvgExpense,
      isCurrentMonth
    };
  }, [selectedMonthKey, netSavings, totalExpense]);

  // Helper to identify Liquid Cash accounts
  const isCashAccount = (acc) => {
    const type = (acc.accountType || '').toUpperCase();
    const name = ((acc.name || acc.accountName || '') + ' ' + (acc.bankName || '')).toLowerCase();
    return type === 'CASH' || name.includes('cash') || name.includes('रोकड़') || name.includes('नकद');
  };

  // Total Net Balance across all Bank Accounts (excluding Cash & Liabilities)
  const totalBankNetBalance = useMemo(() => {
    return bankAccountsWithBalance
      .filter(acc => !acc.isLiability && !isCashAccount(acc))
      .reduce((sum, acc) => sum + (Number(acc.liveBalance) || 0), 0);
  }, [bankAccountsWithBalance]);

  // Total Liquid Cash across all Cash / Wallet accounts
  const totalLiquidCash = useMemo(() => {
    return bankAccountsWithBalance
      .filter(acc => isCashAccount(acc))
      .reduce((sum, acc) => sum + (Number(acc.liveBalance) || 0), 0);
  }, [bankAccountsWithBalance]);

  // Total Debt across all Loan Accounts (pending borrowed loans + liability accounts)
  const totalLoanDebt = useMemo(() => {
    const loanPending = (loansWithSummary || [])
      .filter(l => l.type === 'BORROWED' && !l.isSettled)
      .reduce((sum, l) => sum + (Number(l.remainingBalance) || 0), 0);
    const ccLiability = bankAccountsWithBalance
      .filter(acc => acc.isLiability && acc.liveBalance < 0)
      .reduce((sum, acc) => sum + Math.abs(acc.liveBalance), 0);
    return loanPending + ccLiability;
  }, [loansWithSummary, bankAccountsWithBalance]);

  // Month navigation
  const handlePrevMonth = () => {
    const [y, m] = selectedMonthKey.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    const newMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonthKey(newMonthKey);
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonthKey.split('-').map(Number);
    const d = new Date(y, m, 1);
    const newMonthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonthKey(newMonthKey);
  };

  const monthLabel = useMemo(() => {
    if (!selectedMonthKey) return '';
    const [y, m] = selectedMonthKey.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [selectedMonthKey]);

  // Filtered passbook transactions
  const filteredTransactions = useMemo(() => {
    return monthTransactions
      .filter(t => {
        if (filterType !== 'ALL' && t.type !== filterType) return false;
        if (!searchTerm) return true;
        const s = searchTerm.toLowerCase();
        return (
          t.category.toLowerCase().includes(s) ||
          (t.note && t.note.toLowerCase().includes(s)) ||
          (t.accountName && t.accountName.toLowerCase().includes(s)) ||
          t.paymentMode.toLowerCase().includes(s) ||
          String(t.amount).includes(s)
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [monthTransactions, filterType, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Month Navigation & Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100/80 border border-slate-200/80 rounded-xl">
            <Calendar className="w-4 h-4 text-emerald-700" />
            <span className="font-extrabold text-slate-800 text-sm tracking-tight">{monthLabel}</span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onOpenAddTransaction('EXPENSE')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm shadow-rose-200 transition-all"
          >
            <TrendingDown className="w-4 h-4 stroke-[2.5]" />
            <span>+ Expense</span>
          </button>
          <button
            onClick={() => onOpenAddTransaction('INCOME')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-200 transition-all"
          >
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
            <span>+ Income</span>
          </button>
        </div>
      </div>

      {/* Financial Summary & Bank Accounts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Income, Expense, Net Savings & Daily Gauge */}
        <div className="lg:col-span-2 space-y-6">
          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Income */}
            <div className="p-5 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Total Income</span>
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-emerald-700 tracking-tight">
                  {currencySymbol}{totalIncome.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">Earned in {monthLabel.split(' ')[0]}</div>
              </div>
            </div>

            {/* Total Expenses */}
            <div className="p-5 bg-rose-50/60 border border-rose-200/80 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-800 uppercase tracking-wider">Total Expenses</span>
                <span className="p-2 bg-rose-100 text-rose-600 rounded-xl">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-rose-600 tracking-tight">
                  {currencySymbol}{totalExpense.toLocaleString()}
                </div>
                <div className="text-xs text-slate-500 mt-1">Spent in {monthLabel.split(' ')[0]}</div>
              </div>
            </div>

            {/* Net Savings */}
            <div className={`p-5 rounded-2xl border shadow-sm ${
              netSavings >= 0
                ? 'bg-slate-900 border-slate-800 text-white'
                : 'bg-rose-950 border-rose-900 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">
                  {netSavings >= 0 ? 'Net Savings' : 'Deficit'}
                </span>
                <span className="p-2 bg-white/10 rounded-xl">
                  <Wallet className="w-4 h-4 text-white" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black tracking-tight">
                  {currencySymbol}{netSavings.toLocaleString()}
                </div>
                <div className="text-xs opacity-75 mt-1">
                  {totalIncome > 0
                    ? `${Math.round((netSavings / totalIncome) * 100)}% savings rate`
                    : 'Balance this month'}
                </div>
              </div>
            </div>
          </div>

          {/* Safe-to-Spend Daily Gauge */}
          {dailyGauge && (
            <div className="p-5 bg-white border border-slate-200/80 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Safe-to-Spend Daily Budget</h3>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Day {dailyGauge.currentDay} of {dailyGauge.totalDaysInMonth} ({dailyGauge.daysRemaining} days left)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-xs text-slate-500 block font-medium">Avg Spent per Day</span>
                  <span className="text-lg font-black text-slate-800">
                    {currencySymbol}{Math.round(dailyGauge.dailyAvgExpense).toLocaleString()}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">Based on expenses so far</span>
                </div>

                <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/70">
                  <span className="text-xs text-emerald-800 font-bold block">Allowed Daily Spending</span>
                  <span className="text-lg font-black text-emerald-700">
                    {currencySymbol}{Math.round(dailyGauge.safeDaily).toLocaleString()} / day
                  </span>
                  <span className="text-[11px] text-emerald-600 font-medium block mt-0.5">To maintain positive savings</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Banks & Loan Accounts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          <div className="pb-3 border-b border-slate-100 mb-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-slate-900 text-sm">Banks & Loan Accounts</h3>
              </div>
              <button
                onClick={() => {
                  if (accountCardTab === 'LOANS') {
                    onNavigateToLoans?.();
                  } else {
                    onOpenBankAccounts?.(null);
                  }
                }}
                className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200/70 cursor-pointer"
              >
                {accountCardTab === 'LOANS' ? 'Manage Loans' : 'Manage Banks'}
              </button>
            </div>

            {/* Total Net Balance, Liquid Cash & Total Debt Summary */}
            <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/70 space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium truncate">
                  Total Net Balance in All Bank Accounts:
                </span>
                <span className="font-extrabold text-emerald-700 flex-shrink-0 text-sm">
                  {currencySymbol}{totalBankNetBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium truncate">
                  Total Liquid Cash (Cash in Hand):
                </span>
                <span className="font-extrabold text-teal-700 flex-shrink-0 text-sm">
                  {currencySymbol}{totalLiquidCash.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-600 font-medium truncate">
                  Total Debt in All Loan Accounts:
                </span>
                <span className="font-extrabold text-rose-600 flex-shrink-0 text-sm">
                  {currencySymbol}{totalLoanDebt.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Switcher Tabs: Bank Accounts vs Loan Accounts */}
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setAccountCardTab('BANKS')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  accountCardTab === 'BANKS'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Bank Accounts ({bankAccountsWithBalance.length})
              </button>
              <button
                type="button"
                onClick={() => setAccountCardTab('LOANS')}
                className={`flex-1 py-1.5 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  accountCardTab === 'LOANS'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Loan Accounts ({(loansWithSummary || []).length})
              </button>
            </div>
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[340px] pr-1 flex-1">
            {accountCardTab === 'BANKS' ? (
              bankAccountsWithBalance.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <Landmark className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p>No accounts added yet.</p>
                  <div className="mt-3 flex items-center justify-center gap-3">
                    <button
                      onClick={() => onOpenBankAccounts?.(null)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      + Add Bank Account
                    </button>
                    <button
                      onClick={() => onOpenBankAccounts?.({ name: 'Cash in Hand', bankName: 'Cash', accountType: 'CASH' })}
                      className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                    >
                      + Add Liquid Cash
                    </button>
                  </div>
                </div>
              ) : (
                bankAccountsWithBalance.map((acc) => {
                  const isNeg = acc.liveBalance < 0;
                  const isCash = isCashAccount(acc);
                  return (
                    <div
                      key={acc.id}
                      onClick={() => onOpenBankAccounts?.(acc)}
                      className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-300 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                      title="Click to update available balance or edit details"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          {isCash && <Banknote className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />}
                          <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                            {acc.name}
                          </span>
                          {isCash ? (
                            <span className="px-1.5 py-0.5 bg-teal-100 text-teal-800 text-[9px] font-bold rounded">
                              Liquid Cash
                            </span>
                          ) : acc.isLiability ? (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[9px] font-bold rounded">
                              CC / Loan
                            </span>
                          ) : null}
                          <Edit2 className="w-3 h-3 text-slate-300 group-hover:text-emerald-700 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {acc.bankName || (isCash ? 'Liquid Cash' : 'General Account')} {acc.accountNumber ? `••• ${acc.accountNumber}` : ''}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-extrabold ${isNeg ? 'text-rose-600' : isCash ? 'text-teal-700' : 'text-emerald-700'}`}>
                          {currencySymbol}{acc.liveBalance.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          Init: {currencySymbol}{acc.openingBalance.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              (loansWithSummary || []).length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                  <p>No loan accounts added yet.</p>
                  <button
                    onClick={() => onNavigateToLoans?.()}
                    className="mt-2 text-emerald-700 font-bold underline text-xs cursor-pointer"
                  >
                    + Add Loan Account
                  </button>
                </div>
              ) : (
                (loansWithSummary || []).map((loan) => {
                  const isBorrowed = loan.type === 'BORROWED';
                  return (
                    <div
                      key={loan.id}
                      onClick={() => onNavigateToLoans?.()}
                      className="p-3 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200/70 hover:border-emerald-300 rounded-xl flex items-center justify-between transition-all cursor-pointer group"
                      title="Click to view and manage loan details"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-slate-900 group-hover:text-emerald-800 transition-colors truncate">
                            {loan.partyName}
                          </span>
                          <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                            isBorrowed ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {isBorrowed ? 'Borrowed Loan' : 'Lent / Udhar'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {loan.monthlyEmi > 0 ? `EMI: ${currencySymbol}${loan.monthlyEmi.toLocaleString()}/mo` : 'No monthly EMI'}
                          {loan.isSettled ? ' • Settled' : ''}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-sm font-extrabold ${isBorrowed ? 'text-rose-600' : 'text-emerald-700'}`}>
                          {currencySymbol}{loan.remainingBalance.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">
                          {isBorrowed ? 'Pending Debt' : 'To Receive'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>
      </div>

      {/* Passbook / Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Passbook Header & Filters */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-50/70">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Passbook Entries</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {filteredTransactions.length} transaction{filteredTransactions.length !== 1 ? 's' : ''} in {monthLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Type Filter Buttons */}
            <div className="inline-flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'ALL'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType('EXPENSE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'EXPENSE'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setFilterType('INCOME')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filterType === 'INCOME'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Income
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search passbook..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-52 pl-9 pr-3.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* List Content */}
        <div className="divide-y divide-slate-100">
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <AlertCircle className="w-10 h-10 mx-auto mb-2 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-600">No transactions found for this period.</p>
              <p className="text-xs text-slate-400 mt-1">Click + Expense or + Income to record your first entry.</p>
            </div>
          ) : (
            filteredTransactions.map((tx) => {
              const isExp = tx.type === 'EXPENSE';
              const dateStr = new Date(tx.timestamp).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short'
              });

              return (
                <div
                  key={tx.id}
                  className="p-4 sm:px-5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 group"
                >
                  {/* Left: Icon, Category & Notes */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                      isExp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {isExp ? <ArrowDownRight className="w-5 h-5 stroke-[2.5]" /> : <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm truncate">{tx.category}</span>
                        {tx.accountName && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md border border-slate-200/60 truncate max-w-[120px]">
                            {tx.accountName}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-medium rounded border border-slate-200">
                          {tx.paymentMode}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1 flex-wrap">
                        <span className="font-medium text-slate-400">{dateStr}</span>
                        {tx.note && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="truncate max-w-[200px] sm:max-w-md text-slate-600 italic">
                              "{tx.note}"
                            </span>
                          </>
                        )}
                        {(tx.principalPaid > 0 || tx.interestPaid > 0) && (
                          <span className="text-[11px] text-purple-600 font-semibold">
                            (Capital: {currencySymbol}{tx.principalPaid} | Interest: {currencySymbol}{tx.interestPaid})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Actions */}
                  <div className="flex items-center gap-3.5 flex-shrink-0">
                    <div className="text-right">
                      <div className={`text-base font-extrabold tracking-tight ${
                        isExp ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        {isExp ? '-' : '+'}{currencySymbol}{tx.amount.toLocaleString()}
                      </div>
                    </div>

                    {/* Quick Edit/Delete */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onEditTransaction(tx)}
                        className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Edit Transaction"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this transaction?')) {
                            deleteTransaction(tx.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
