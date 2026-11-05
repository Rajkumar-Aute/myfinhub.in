import React, { useState, useEffect } from 'react';
import {
  X, PlusCircle, ArrowDownCircle, ArrowUpCircle, Landmark,
  CreditCard, Calendar, FileText, Check, AlertCircle, ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, BILL_SUB_OPTIONS, PAYMENT_MODES } from '../constants/categories';

export default function AddTransactionModal({ isOpen, onClose, initialData = null }) {
  const {
    addTransaction,
    updateTransaction,
    bankAccountsWithBalance,
    loansWithSummary,
    currencySymbol
  } = useKhata();

  const [type, setType] = useState('EXPENSE');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Grocery');
  const [customCategory, setCustomCategory] = useState('');
  const [billSubCategory, setBillSubCategory] = useState('');
  const [customBill, setCustomBill] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [dateStr, setDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  // Loan Repayment split (if category is Loan / EMI or repaying loan)
  const [isLoanRepayment, setIsLoanRepayment] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [principalPaid, setPrincipalPaid] = useState('');
  const [interestPaid, setInterestPaid] = useState('');

  const [error, setError] = useState('');

  // Filter active borrowed loans for repayment suggestions
  const activeBorrowedLoans = loansWithSummary.filter(l => l.type === 'BORROWED' && !l.isSettled);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type || 'EXPENSE');
      setAmount(initialData.amount ? String(initialData.amount) : '');
      setDateStr(initialData.timestamp ? new Date(initialData.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
      setPaymentMode(initialData.paymentMode || 'UPI');
      setSelectedAccountId(initialData.accountId || '');
      setNote(initialData.note || '');

      const isExp = (initialData.type || 'EXPENSE') === 'EXPENSE';
      const cat = initialData.category || (isExp ? 'Grocery' : 'Salary');

      if (cat.startsWith('Bill - ') || cat.startsWith('Bills - ')) {
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

      if (initialData.loanId || initialData.principalPaid > 0 || initialData.interestPaid > 0) {
        setIsLoanRepayment(true);
        setSelectedLoanId(initialData.loanId || '');
        setPrincipalPaid(initialData.principalPaid ? String(initialData.principalPaid) : '');
        setInterestPaid(initialData.interestPaid ? String(initialData.interestPaid) : '');
      } else {
        setIsLoanRepayment(false);
        setSelectedLoanId('');
        setPrincipalPaid('');
        setInterestPaid('');
      }
    } else {
      // Reset form
      setType('EXPENSE');
      setAmount('');
      setCategory('Grocery');
      setCustomCategory('');
      setBillSubCategory('');
      setCustomBill('');
      setPaymentMode('UPI');
      setSelectedAccountId(bankAccountsWithBalance.length > 0 ? bankAccountsWithBalance[0].id : '');
      setDateStr(new Date().toISOString().split('T')[0]);
      setNote('');
      setIsLoanRepayment(false);
      setSelectedLoanId('');
      setPrincipalPaid('');
      setInterestPaid('');
      setError('');
    }
  }, [initialData, isOpen, bankAccountsWithBalance.length]);

  if (!isOpen) return null;

  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === 'INCOME') {
      setCategory('Salary');
      setIsLoanRepayment(false);
    } else {
      setCategory('Grocery');
    }
  };

  const handleCategorySelect = (cat) => {
    setCategory(cat);
    if (cat === 'Bills') {
      if (!billSubCategory) setBillSubCategory('Electricity');
    } else if (cat === 'Loan / EMI') {
      setIsLoanRepayment(true);
      if (activeBorrowedLoans.length > 0 && !selectedLoanId) {
        setSelectedLoanId(activeBorrowedLoans[0].id);
      }
    } else {
      if (isLoanRepayment && cat !== 'Loan / EMI') {
        setIsLoanRepayment(false);
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
    if (category === 'Bills') {
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

    if (isLoanRepayment) {
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
      type,
      amount: parsedAmount,
      category: finalCategory,
      paymentMode,
      accountId: selectedAccountId || null,
      accountName: selectedAcc ? selectedAcc.name : null,
      timestamp: new Date(dateStr + 'T12:00:00').getTime(),
      note: note.trim(),
      principalPaid: pPaid,
      interestPaid: iPaid,
      loanId: lId
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
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl ${type === 'EXPENSE' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {type === 'EXPENSE' ? <ArrowDownCircle className="w-5 h-5" /> : <ArrowUpCircle className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {initialData ? 'Edit Entry' : 'Add New Transaction'}
              </h2>
              <p className="text-xs text-gray-500">
                {type === 'EXPENSE' ? 'Record spending or loan EMI' : 'Record received income'}
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

          {/* Type Toggle: Expense vs Income */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleTypeChange('EXPENSE')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                type === 'EXPENSE'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('INCOME')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                type === 'INCOME'
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Income
            </button>
          </div>

          {/* Quick Loan Repayment Banner (if Expense and active loans exist) */}
          {type === 'EXPENSE' && activeBorrowedLoans.length > 0 && !isLoanRepayment && (
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-amber-900">
                <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Paying a loan EMI or borrowed udhar?</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsLoanRepayment(true);
                  setCategory('Loan / EMI');
                  if (!selectedLoanId && activeBorrowedLoans.length > 0) {
                    setSelectedLoanId(activeBorrowedLoans[0].id);
                  }
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors whitespace-nowrap shadow-sm"
              >
                Split Capital & Interest
              </button>
            </div>
          )}

          {/* Amount Field */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
              Amount ({currencySymbol}) *
            </label>
            <div className="relative rounded-xl shadow-sm">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-400 font-bold text-xl">
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
                  if (isLoanRepayment && !principalPaid && !interestPaid) {
                    setPrincipalPaid(e.target.value);
                  }
                }}
                className={`w-full pl-10 pr-4 py-3 text-2xl font-bold rounded-xl border focus:outline-none focus:ring-2 transition-all ${
                  type === 'EXPENSE'
                    ? 'border-gray-200 focus:border-red-500 focus:ring-red-200 text-red-600'
                    : 'border-gray-200 focus:border-emerald-600 focus:ring-emerald-200 text-emerald-700'
                }`}
              />
            </div>
          </div>

          {/* Loan Repayment Split Box */}
          {isLoanRepayment && (
            <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                  <Landmark className="w-4 h-4 text-purple-600" />
                  Loan Repayment Details
                </span>
                <button
                  type="button"
                  onClick={() => setIsLoanRepayment(false)}
                  className="text-xs text-purple-600 hover:text-purple-800 underline font-medium"
                >
                  Disable split
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Loan / EMI
                </label>
                <select
                  value={selectedLoanId}
                  onChange={(e) => setSelectedLoanId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                >
                  <option value="">-- Choose active loan --</option>
                  {activeBorrowedLoans.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.partyName} (Bal: {currencySymbol}{l.remainingBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Capital / Principal
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={principalPaid}
                    onChange={(e) => setPrincipalPaid(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-300"
                  />
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
                </div>
              </div>
            </div>
          )}

          {/* Category Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Select Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map((cat) => {
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    className={`px-3 py-2.5 rounded-xl text-xs font-medium text-left border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-sm font-semibold'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    <span className="truncate">{cat}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 ml-1" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Category Input if "Other" or "Other - all other expenses" */}
            {(category === 'Other - all other expenses' || category === 'Other') && (
              <div className="mt-3 p-3 bg-purple-50/60 border border-purple-200 rounded-xl">
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
            {category === 'Bills' && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
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
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all ${
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

          {/* Bank Account Selection (Linked to Balance) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Link to Bank / Account
              </label>
              <span className="text-xs text-gray-400">Updates live balance</span>
            </div>

            {bankAccountsWithBalance.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-center">
                <p className="text-xs text-gray-500">No bank accounts added yet.</p>
                <p className="text-xs text-emerald-700 font-medium mt-0.5">
                  You can still record transaction or add accounts via Bank Accounts modal.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedAccountId('')}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                    selectedAccountId === ''
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-semibold'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">None / Unlinked</div>
                  <div className="text-[11px] text-gray-400">No account impact</div>
                </button>

                {bankAccountsWithBalance.map((acc) => {
                  const isSelected = selectedAccountId === acc.id;
                  const isNegative = acc.liveBalance < 0;
                  return (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setSelectedAccountId(acc.id)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    paymentMode === mode
                      ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
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
                placeholder="e.g. D-Mart bill, fuel for Pune trip"
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
            className="px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-md transition-all ${
              type === 'EXPENSE'
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-200'
            }`}
          >
            {initialData ? 'Update Transaction' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  );
}
