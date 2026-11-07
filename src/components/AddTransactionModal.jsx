import React, { useState, useEffect } from 'react';
import {
  X, PlusCircle, ArrowDownCircle, ArrowUpCircle, Landmark,
  CreditCard, Calendar, FileText, Check, AlertCircle, ChevronDown, ChevronUp, Sparkles,
  TrendingUp, TrendingDown, PiggyBank
} from 'lucide-react';
import { useFinHub } from '../context/FinHubContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, BILL_SUB_OPTIONS, PAYMENT_MODES } from '../constants/categories';

export const INVESTMENT_CATEGORIES = [
  'Mutual Funds (SIP / Lumpsum)',
  'Stocks / Demat',
  'Gold / SGB',
  'Fixed Deposit (FD)',
  'PPF / EPF',
  'Crypto',
  'Other Investment'
];

export default function AddTransactionModal({ isOpen, onClose, initialData = null }) {
  const {
    addTransaction,
    updateTransaction,
    bankAccountsWithBalance,
    loansWithSummary,
    currencySymbol
  } = useFinHub();

  // Mode: 'EXPENSE' | 'INCOME' | 'INVESTMENT' | 'LOAN_REPAYMENT'
  const [entryMode, setEntryMode] = useState('EXPENSE');
  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [customCategory, setCustomCategory] = useState('');
  const [customInvestment, setCustomInvestment] = useState('');
  const [billSubCategory, setBillSubCategory] = useState('');
  const [customBill, setCustomBill] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Loan Repayment split
  const [isLoanRepayment, setIsLoanRepayment] = useState(false);
  const [isInvestment, setIsInvestment] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [principalPaid, setPrincipalPaid] = useState('');
  const [interestPaid, setInterestPaid] = useState('');

  const [error, setError] = useState('');

  const isInvestAccount = (acc) => {
    const type = (acc.accountType || '').toUpperCase();
    const name = ((acc.name || acc.accountName || '') + ' ' + (acc.bankName || '')).toLowerCase();
    return type === 'INVESTMENT' || name.includes('invest') || name.includes('mutual') || name.includes('stock') || name.includes('gold') || name.includes('fd') || name.includes('ppf');
  };

  const bankAndCashAccounts = bankAccountsWithBalance.filter(a => a.accountType !== 'CREDIT_CARD' && !isInvestAccount(a));
  const creditCardAccounts = bankAccountsWithBalance.filter(a => a.accountType === 'CREDIT_CARD');

  // Filter active borrowed loans for repayment suggestions
  const activeBorrowedLoans = loansWithSummary.filter(l => l.type === 'BORROWED' && !l.isSettled);

  useEffect(() => {
    if (initialData) {
      const isL = !!(initialData.isLoanRepayment || initialData.loanId || (initialData.principalPaid > 0) || initialData.category === 'Loan Repayment / EMI' || initialData.category === 'Loan / EMI');
      const isInv = !!(initialData.isInvestment || (typeof initialData.category === 'string' && initialData.category.startsWith('Investment')));
      const determinedMode = initialData.entryMode || (isL ? 'LOAN_REPAYMENT' : isInv ? 'INVESTMENT' : initialData.type === 'INCOME' ? 'INCOME' : 'EXPENSE');

      setEntryMode(determinedMode);
      setType(determinedMode === 'INCOME' ? 'INCOME' : 'EXPENSE');
      setIsLoanRepayment(isL || determinedMode === 'LOAN_REPAYMENT');
      setIsInvestment(isInv || determinedMode === 'INVESTMENT');

      setAmount(initialData.amount ? String(initialData.amount) : '');
      setDateStr(initialData.timestamp ? new Date(initialData.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setPaymentMode(initialData.paymentMode || 'UPI');
      setSelectedAccountId(initialData.accountId || '');
      setNote(initialData.note || '');

      const isExp = determinedMode === 'EXPENSE';
      const cat = initialData.category || (determinedMode === 'INCOME' ? 'Salary' : determinedMode === 'INVESTMENT' ? 'Mutual Funds (SIP / Lumpsum)' : 'Grocery');

      if (determinedMode === 'INVESTMENT') {
        const invClean = cat.replace(/^Investment - /, '');
        if (INVESTMENT_CATEGORIES.includes(invClean)) {
          setCategory(invClean);
        } else {
          setCategory('Other Investment');
          setCustomInvestment(invClean);
        }
      } else if (cat.startsWith('Bill - ') || cat.startsWith('Bills - ')) {
        setCategory('Bills');
        const sub = cat.replace(/^Bills? - /, '');
        if (BILL_SUB_OPTIONS.includes(sub)) {
          setBillSubCategory(sub);
        } else {
          setBillSubCategory('Other Bill');
          setCustomBill(sub);
        }
      } else if (cat.startsWith('Other - ') || (!EXPENSE_CATEGORIES.includes(cat) && !INCOME_CATEGORIES.includes(cat))) {
        setCategory(isExp ? 'Other - all other expenses' : 'Other');
        setCustomCategory(cat.replace(/^Other - /, ''));
      } else {
        setCategory(cat);
      }

      if (isL) {
        setSelectedLoanId(initialData.loanId || (activeBorrowedLoans.length > 0 ? activeBorrowedLoans[0].id : ''));
        setPrincipalPaid(initialData.principalPaid ? String(initialData.principalPaid) : '');
        setInterestPaid(initialData.interestPaid ? String(initialData.interestPaid) : '');
      } else {
        setSelectedLoanId('');
        setPrincipalPaid('');
        setInterestPaid('');
      }
    } else {
      // Reset form
      setEntryMode('EXPENSE');
      setType('EXPENSE');
      setAmount('');
      setCategory('Grocery');
      setCustomCategory('');
      setCustomInvestment('');
      setBillSubCategory('');
      setCustomBill('');
      setPaymentMode('UPI');
      setSelectedAccountId(bankAccountsWithBalance.length > 0 ? bankAccountsWithBalance[0].id : '');
      setDateStr(new Date().toISOString().split('T')[0]);
      setNote('');
      setIsLoanRepayment(false);
      setIsInvestment(false);
      setSelectedLoanId('');
      setPrincipalPaid('');
      setInterestPaid('');
      setError('');
    }
  }, [initialData, isOpen, bankAccountsWithBalance.length]);

  if (!isOpen) return null;

  const handleEntryModeChange = (newMode) => {
    setEntryMode(newMode);
    setError('');

    if (newMode === 'INCOME') {
      setType('INCOME');
      setIsLoanRepayment(false);
      setIsInvestment(false);
      setCategory('Salary');
    } else if (newMode === 'INVESTMENT') {
      setType('EXPENSE');
      setIsLoanRepayment(false);
      setIsInvestment(true);
      setCategory('Mutual Funds (SIP / Lumpsum)');
    } else if (newMode === 'LOAN_REPAYMENT') {
      setType('EXPENSE');
      setIsLoanRepayment(true);
      setIsInvestment(false);
      setCategory('Loan Repayment / EMI');
      if (activeBorrowedLoans.length > 0 && !selectedLoanId) {
        setSelectedLoanId(activeBorrowedLoans[0].id);
      }
    } else { // 'EXPENSE'
      setType('EXPENSE');
      setIsLoanRepayment(false);
      setIsInvestment(false);
      setCategory('Grocery');
    }
  };

  const handleCategorySelect = (cat) => {
    setCategory(cat);
    if (cat === 'Bills') {
      if (!billSubCategory) setBillSubCategory('Electricity');
    } else if (cat === 'Loan Repayment / EMI' || cat === 'Loan / EMI') {
      setIsLoanRepayment(true);
      setEntryMode('LOAN_REPAYMENT');
      if (activeBorrowedLoans.length > 0 && !selectedLoanId) {
        setSelectedLoanId(activeBorrowedLoans[0].id);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    // Determine final category string
    let finalCategory = category;
    if (entryMode === 'INVESTMENT') {
      if (category === 'Other Investment' && customInvestment.trim()) {
        finalCategory = `Investment - ${customInvestment.trim()}`;
      } else if (!category.startsWith('Investment')) {
        finalCategory = `Investment - ${category}`;
      }
    } else if (entryMode === 'LOAN_REPAYMENT') {
      finalCategory = 'Loan Repayment / EMI';
    } else if (category === 'Bills') {
      if (billSubCategory === 'Other Bill' && customBill.trim()) {
        finalCategory = `Bill - ${customBill.trim()}`;
      } else if (billSubCategory) {
        finalCategory = `Bill - ${billSubCategory}`;
      } else {
        finalCategory = 'Bills';
      }
    } else if (category === 'Other - all other expenses' || category === 'Other') {
      if (customCategory.trim()) {
        finalCategory = `Other - ${customCategory.trim()}`;
      } else {
        finalCategory = type === 'EXPENSE' ? 'Other - all other expenses' : 'Other';
      }
    }

    // Calculate loan split
    let pPaid = 0;
    let iPaid = 0;
    let lId = null;

    if (entryMode === 'LOAN_REPAYMENT' || isLoanRepayment) {
      lId = selectedLoanId || null;
      pPaid = parseFloat(principalPaid) || 0;
      iPaid = parseFloat(interestPaid) || 0;

      // If user didn't split, treat entire amount as principal
      if (pPaid === 0 && iPaid === 0) {
        pPaid = parsedAmount;
      }
    }

    // Selected account info
    const selectedAcc = bankAccountsWithBalance.find(a => a.id === selectedAccountId);

    const transactionData = {
      type: entryMode === 'INCOME' ? 'INCOME' : 'EXPENSE',
      amount: parsedAmount,
      category: finalCategory,
      paymentMode,
      accountId: selectedAccountId || null,
      accountName: selectedAcc ? selectedAcc.name : null,
      timestamp: new Date(dateStr + 'T12:00:00').getTime(),
      note: note.trim(),
      principalPaid: pPaid,
      interestPaid: iPaid,
      loanId: lId,
      isInvestment: entryMode === 'INVESTMENT',
      isLoanRepayment: entryMode === 'LOAN_REPAYMENT' || isLoanRepayment
    };

    if (initialData?.id) {
      updateTransaction(initialData.id, transactionData);
    } else {
      addTransaction(transactionData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              entryMode === 'EXPENSE'
                ? 'bg-rose-100 text-rose-700'
                : entryMode === 'INCOME'
                  ? 'bg-emerald-100 text-emerald-700'
                  : entryMode === 'INVESTMENT'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-purple-100 text-purple-700'
            }`}>
              {entryMode === 'EXPENSE' ? (
                <ArrowDownCircle className="w-5 h-5" />
              ) : entryMode === 'INCOME' ? (
                <ArrowUpCircle className="w-5 h-5" />
              ) : entryMode === 'INVESTMENT' ? (
                <PiggyBank className="w-5 h-5" />
              ) : (
                <Landmark className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {initialData
                  ? (entryMode === 'INVESTMENT' ? 'Edit Investment' : entryMode === 'LOAN_REPAYMENT' ? 'Edit Loan Repayment' : entryMode === 'INCOME' ? 'Edit Income' : 'Edit Expense')
                  : (entryMode === 'INVESTMENT' ? 'Record Investment' : entryMode === 'LOAN_REPAYMENT' ? 'Record Loan Repayment / EMI' : entryMode === 'INCOME' ? 'Add New Income' : 'Add New Expense')}
              </h2>
              <p className="text-xs text-gray-500">
                {entryMode === 'EXPENSE'
                  ? 'Record daily spending, shopping or bills'
                  : entryMode === 'INCOME'
                    ? 'Record received salary, rent, or business income'
                    : entryMode === 'INVESTMENT'
                      ? 'Record Mutual Funds, Stocks, Gold, FD, PPF, or Crypto'
                      : 'Record loan EMI installment or borrowed debt payment'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 4 Modes Toggle: Expense vs Income vs Investment vs Loan Repay */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleEntryModeChange('EXPENSE')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                entryMode === 'EXPENSE'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => handleEntryModeChange('INCOME')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                entryMode === 'INCOME'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowUpCircle className="w-3.5 h-3.5" />
              <span>Income</span>
            </button>
            <button
              type="button"
              onClick={() => handleEntryModeChange('INVESTMENT')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                entryMode === 'INVESTMENT'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PiggyBank className="w-3.5 h-3.5" />
              <span>Investment</span>
            </button>
            <button
              type="button"
              onClick={() => handleEntryModeChange('LOAN_REPAYMENT')}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                entryMode === 'LOAN_REPAYMENT'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Landmark className="w-3.5 h-3.5" />
              <span>Loan Repay</span>
            </button>
          </div>

          {/* Quick Loan Repayment Banner (if Expense and active loans exist) */}
          {entryMode === 'EXPENSE' && activeBorrowedLoans.length > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Paying a loan EMI or borrowed udhar?</span>
              </div>
              <button
                type="button"
                onClick={() => handleEntryModeChange('LOAN_REPAYMENT')}
                className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-sm cursor-pointer"
              >
                Switch to Loan Repayment
              </button>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              {entryMode === 'INVESTMENT'
                ? `Invested Amount (${currencySymbol}) *`
                : entryMode === 'LOAN_REPAYMENT'
                  ? `Total EMI / Repayment Amount (${currencySymbol}) *`
                  : entryMode === 'INCOME'
                    ? `Income Amount (${currencySymbol}) *`
                    : `Expense Amount (${currencySymbol}) *`}
            </label>
            <div className="relative rounded-xl shadow-sm">
              <span className={`absolute inset-y-0 left-0 pl-4 flex items-center font-bold text-xl ${
                entryMode === 'INVESTMENT'
                  ? 'text-indigo-600'
                  : entryMode === 'LOAN_REPAYMENT'
                    ? 'text-purple-600'
                    : entryMode === 'INCOME'
                      ? 'text-emerald-600'
                      : 'text-rose-600'
              }`}>
                {currencySymbol}
              </span>
              <input
                type="number"
                step="any"
                required
                autoFocus
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  if (entryMode === 'LOAN_REPAYMENT' && !principalPaid && !interestPaid) {
                    setPrincipalPaid(e.target.value);
                  }
                }}
                className={`w-full pl-10 pr-4 py-3 text-2xl font-bold rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                  entryMode === 'INVESTMENT'
                    ? 'border-indigo-200 focus:border-indigo-600 focus:ring-indigo-200 text-indigo-700'
                    : entryMode === 'LOAN_REPAYMENT'
                      ? 'border-purple-200 focus:border-purple-600 focus:ring-purple-200 text-purple-700'
                      : entryMode === 'INCOME'
                        ? 'border-emerald-200 focus:border-emerald-600 focus:ring-emerald-200 text-emerald-700'
                        : 'border-gray-200 focus:border-rose-500 focus:ring-rose-200 text-rose-600'
                }`}
              />
            </div>
          </div>

          {/* Loan Repayment Split Box */}
          {entryMode === 'LOAN_REPAYMENT' && (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-purple-600" />
                  Loan Repayment & Debt Reduction
                </span>
                {amount && (
                  <button
                    type="button"
                    onClick={() => {
                      setPrincipalPaid(amount);
                      setInterestPaid('0');
                    }}
                    className="text-[11px] text-purple-700 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-md font-semibold transition"
                  >
                    100% Principal
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Borrowed Loan / Udhar *
                </label>
                {activeBorrowedLoans.length === 0 ? (
                  <div className="p-2.5 bg-white border border-dashed border-purple-300 rounded-lg text-xs text-purple-800">
                    ℹ️ No active borrowed loans found in Loans view. This repayment will be recorded under <strong>Loan Repayment / EMI</strong>.
                  </div>
                ) : (
                  <select
                    value={selectedLoanId}
                    onChange={(e) => setSelectedLoanId(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 font-medium"
                  >
                    <option value="">-- Choose active loan to reduce debt --</option>
                    {activeBorrowedLoans.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.partyName} (Debt: {currencySymbol}{l.remainingBalance.toLocaleString()}) {l.monthlyEmi > 0 ? `• EMI ${currencySymbol}${l.monthlyEmi}` : ''}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Capital / Principal Paid
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={principalPaid}
                    onChange={(e) => setPrincipalPaid(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">Directly lowers loan balance</span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Interest Paid
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={interestPaid}
                    onChange={(e) => setInterestPaid(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
                  <span className="text-[10px] text-gray-400 block mt-0.5">Bank interest / fee charge</span>
                </div>
              </div>
            </div>
          )}

          {/* Category Selection for EXPENSE, INCOME, and INVESTMENT */}
          {entryMode !== 'LOAN_REPAYMENT' && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                {entryMode === 'INVESTMENT' ? 'Select Investment Type' : 'Select Category'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(entryMode === 'INVESTMENT'
                  ? INVESTMENT_CATEGORIES
                  : entryMode === 'INCOME'
                    ? INCOME_CATEGORIES
                    : EXPENSE_CATEGORIES
                ).map((cat) => {
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? entryMode === 'INVESTMENT'
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-xs font-bold'
                            : entryMode === 'INCOME'
                              ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-xs font-bold'
                              : 'bg-rose-50 border-rose-400 text-rose-900 shadow-xs font-bold'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {isSelected && (
                        <Check className={`w-3.5 h-3.5 flex-shrink-0 ml-1 ${
                          entryMode === 'INVESTMENT'
                            ? 'text-indigo-600'
                            : entryMode === 'INCOME'
                              ? 'text-emerald-600'
                              : 'text-rose-600'
                        }`} />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Custom Category Input if "Other" */}
              {entryMode === 'INVESTMENT' && category === 'Other Investment' && (
                <div className="mt-3 p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl animate-fadeIn">
                  <label className="block text-xs font-semibold text-indigo-900 mb-1">
                    ✏️ Type Investment Asset Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SGB Sovereign Gold, Real Estate REIT, Startup equity, P2P"
                    value={customInvestment}
                    onChange={(e) => setCustomInvestment(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}

              {(entryMode === 'EXPENSE' || entryMode === 'INCOME') &&
                (category === 'Other - all other expenses' || category === 'Other') && (
                <div className="mt-3 p-3 bg-purple-50/60 border border-purple-200 rounded-xl animate-fadeIn">
                  <label className="block text-xs font-semibold text-purple-900 mb-1">
                    ✏️ Type Custom Category Name:
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cinema tickets, Gym membership, Pet food"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              )}

              {/* Bill Sub-options if "Bills" */}
              {entryMode === 'EXPENSE' && category === 'Bills' && (
                <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2 animate-fadeIn">
                  <span className="block text-xs font-semibold text-gray-700">
                    Select Bill Type or enter description:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {BILL_SUB_OPTIONS.map((sub) => {
                      const isSelected = billSubCategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => setBillSubCategory(sub)}
                          className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-700 text-white border-emerald-700 font-medium'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>

                  {billSubCategory === 'Other Bill' && (
                    <div className="pt-2">
                      <input
                        type="text"
                        placeholder="Type custom bill name (e.g. Society Maintenance, Property Tax)"
                        value={customBill}
                        onChange={(e) => setCustomBill(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Bank / Credit Card Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                {entryMode === 'INVESTMENT'
                  ? 'Invested From Bank / Account'
                  : entryMode === 'LOAN_REPAYMENT'
                    ? 'Paid From Bank / Account'
                    : entryMode === 'INCOME'
                      ? 'Deposit To Bank / Account'
                      : 'Pay From Bank or Credit Card'}
              </label>
              <span className="text-xs text-gray-400">Updates live balance or card limit</span>
            </div>

            {/* Credit Cards (Spend using Card) */}
            {creditCardAccounts.length > 0 && entryMode === 'EXPENSE' && (
              <div className="space-y-1.5 p-3 bg-rose-50/60 border border-rose-200/80 rounded-2xl">
                <span className="text-[11px] font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-rose-600" />
                  <span>Pay With Credit Card (Deducts from available limit)</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  {creditCardAccounts.map((card) => {
                    const isSelected = selectedAccountId === card.id;
                    const cardLimit = card.creditLimit || 0;
                    const cardSpent = card.currentSpent || 0;
                    const cardAvail = card.availableLimit !== undefined ? card.availableLimit : Math.max(0, cardLimit - cardSpent);

                    return (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          setSelectedAccountId(card.id);
                          setPaymentMode('Card');
                        }}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-rose-500 bg-white text-rose-950 font-semibold shadow-xs ring-2 ring-rose-400'
                            : 'border-rose-200 bg-white/80 text-gray-800 hover:bg-white'
                        }`}
                      >
                        <div className="text-xs font-bold truncate flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                            {card.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />}
                        </div>
                        <div className="text-[11px] text-gray-500 mt-1.5 flex items-center justify-between">
                          <span>
                            Avail Limit: <strong className="text-emerald-700 font-bold">{currencySymbol}{cardAvail.toLocaleString()}</strong>
                          </span>
                          <span className="text-rose-600 font-semibold">
                            Spent: {currencySymbol}{cardSpent.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Bank Accounts & Cash */}
            <div className="space-y-1.5">
              {creditCardAccounts.length > 0 && entryMode === 'EXPENSE' && (
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1 pt-1">
                  <Landmark className="w-3.5 h-3.5" />
                  <span>Bank Accounts & Cash</span>
                </span>
              )}

              {bankAndCashAccounts.length === 0 && creditCardAccounts.length === 0 ? (
                <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
                  <p className="text-xs text-gray-500">No bank accounts or credit cards added yet.</p>
                  <p className="text-xs text-emerald-700 font-medium mt-0.5">
                    You can still record transaction or add accounts via Bank Accounts modal.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedAccountId('')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      selectedAccountId === ''
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">None / Unlinked</div>
                    <div className="text-[11px] text-gray-400">No account impact</div>
                  </button>

                  {bankAndCashAccounts.map((acc) => {
                    const isSelected = selectedAccountId === acc.id;
                    const isNegative = acc.liveBalance < 0;
                    return (
                      <button
                        key={acc.id}
                        type="button"
                        onClick={() => setSelectedAccountId(acc.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold shadow-xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-xs font-bold truncate flex items-center justify-between">
                          <span>{acc.name}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-700" />}
                        </div>
                        <div className="text-[11px] text-gray-500 truncate mt-0.5">
                          Bal: <span className={isNegative ? 'text-red-600 font-medium' : 'text-emerald-700 font-medium'}>
                            {currencySymbol}{acc.liveBalance.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Payment Mode
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_MODES.map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                    paymentMode === mode
                      ? 'bg-gray-900 text-white border-gray-900 shadow-xs'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Note Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Date
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                Notes / Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder={
                  entryMode === 'INVESTMENT'
                    ? 'e.g. Monthly SIP in Nifty 50, bought 10 shares of Infosys'
                    : entryMode === 'LOAN_REPAYMENT'
                      ? 'e.g. Month 14 EMI installment for Home Loan'
                      : 'e.g. D-Mart bill, fuel for Pune trip'
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all cursor-pointer ${
              entryMode === 'INVESTMENT'
                ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                : entryMode === 'LOAN_REPAYMENT'
                  ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-200'
                  : entryMode === 'INCOME'
                    ? 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-200'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
            }`}
          >
            {initialData
              ? 'Update Entry'
              : entryMode === 'INVESTMENT'
                ? 'Save Investment'
                : entryMode === 'LOAN_REPAYMENT'
                  ? 'Save Loan Repayment'
                  : entryMode === 'INCOME'
                    ? 'Save Income'
                    : 'Save Expense'}
          </button>
        </div>
      </div>
    </div>
  );
}
