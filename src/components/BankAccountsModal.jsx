import React, { useState, useEffect } from 'react';
import { useFinHub } from '../context/FinHubContext';
import {
  Landmark, X, Trash2, Edit2, Plus, Check, ArrowRight, ShieldAlert,
  Sparkles, TrendingUp, Banknote, CreditCard, ArrowDownRight, ArrowUpRight
} from 'lucide-react';

export default function BankAccountsModal({ isOpen, onClose, initialAccountToEdit = null }) {
  const {
    bankAccountsWithBalance,
    addBankAccount,
    updateBankAccount,
    adjustAccountBalance,
    deleteBankAccount,
    payCreditCardBill,
    currencySymbol,
    totalBankBalance
  } = useFinHub();

  const [mode, setMode] = useState('LIST'); // 'LIST' | 'EDIT' | 'ADD' | 'PAY_BILL'
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Form State
  const [accountType, setAccountType] = useState('BANK'); // 'BANK' | 'CASH' | 'INVESTMENT' | 'CREDIT_CARD'
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [balanceText, setBalanceText] = useState('');
  const [creditLimitText, setCreditLimitText] = useState('');
  const [spentText, setSpentText] = useState('');
  const [isNegative, setIsNegative] = useState(false);

  // Pay Bill Form State
  const [payingCard, setPayingCard] = useState(null);
  const [billAmountText, setBillAmountText] = useState('');
  const [payFromBankId, setPayFromBankId] = useState('');

  const isInvestAccount = (acc) => {
    const type = (acc.accountType || '').toUpperCase();
    const name = ((acc.name || acc.accountName || '') + ' ' + (acc.bankName || '')).toLowerCase();
    return type === 'INVESTMENT' || name.includes('invest') || name.includes('mutual') || name.includes('stock') || name.includes('gold') || name.includes('fd') || name.includes('ppf');
  };

  const isCashAccount = (acc) => {
    const type = (acc.accountType || '').toUpperCase();
    const name = ((acc.name || acc.accountName || '') + ' ' + (acc.bankName || '')).toLowerCase();
    return type === 'CASH' || name.includes('cash');
  };

  useEffect(() => {
    if (initialAccountToEdit) {
      if (initialAccountToEdit.id) {
        startEditAccount(initialAccountToEdit);
      } else {
        setSelectedAccount(null);
        startAddAccount(initialAccountToEdit.accountType || 'BANK');
      }
    } else {
      setMode('LIST');
      setSelectedAccount(null);
    }
  }, [initialAccountToEdit, isOpen]);

  if (!isOpen) return null;

  const startEditAccount = (acc) => {
    setSelectedAccount(acc);
    const type = acc.accountType || (isInvestAccount(acc) ? 'INVESTMENT' : isCashAccount(acc) ? 'CASH' : acc.isCreditCard ? 'CREDIT_CARD' : 'BANK');
    setAccountType(type);
    setBankName(acc.bankName || '');
    setAccountNumber(acc.accountNumber || '');
    setAccountName(acc.name || acc.accountName || '');

    if (type === 'CREDIT_CARD') {
      setCreditLimitText(acc.creditLimit ? String(acc.creditLimit) : '');
      const currentSpent = acc.currentSpent !== undefined ? acc.currentSpent : (acc.startingSpent || 0);
      setSpentText(currentSpent ? String(currentSpent) : '0');
    } else {
      const currentBal = acc.liveBalance !== undefined ? acc.liveBalance : (acc.openingBalance || 0);
      setIsNegative(currentBal < 0);
      setBalanceText(Math.abs(currentBal) ? String(Math.abs(currentBal)) : '0');
    }
    setMode('EDIT');
  };

  const startAddAccount = (presetType = 'BANK') => {
    setSelectedAccount(null);
    setAccountType(presetType);
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setBalanceText('');
    setCreditLimitText('');
    setSpentText('0');
    setIsNegative(false);
    setMode('ADD');
  };

  const startPayBill = (card) => {
    setPayingCard(card);
    setBillAmountText(card.currentSpent ? String(card.currentSpent) : '');
    const bankOptions = bankAccountsWithBalance.filter(a => a.accountType !== 'CREDIT_CARD' && !isInvestAccount(a));
    setPayFromBankId(bankOptions.length > 0 ? bankOptions[0].id : '');
    setMode('PAY_BILL');
  };

  const handleConfirmPayBill = (e) => {
    e.preventDefault();
    if (!payingCard) return;

    const parsedAmount = parseFloat(billAmountText);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Please enter a valid bill payment amount');
      return;
    }

    if (!payFromBankId) {
      alert('Please select a bank account to pay the bill from');
      return;
    }

    payCreditCardBill(payingCard.id, payFromBankId, parsedAmount, 'Bank Transfer', `Bill payment for ${payingCard.name}`);
    setMode('LIST');
    setPayingCard(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!bankName.trim() && !accountName.trim()) {
      alert('Please enter at least an Account Name or Bank Name');
      return;
    }

    const computedName = accountName.trim()
      ? accountName.trim()
      : accountNumber.trim()
        ? `${bankName.trim()} (${accountNumber.trim().slice(-4)})`
        : bankName.trim();

    // 1. CREDIT CARD SUBMISSION
    if (accountType === 'CREDIT_CARD') {
      const limit = parseFloat(creditLimitText) || 0;
      const spent = parseFloat(spentText) || 0;

      if (mode === 'EDIT' && selectedAccount) {
        updateBankAccount(selectedAccount.id, {
          name: computedName,
          accountName: computedName,
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountType: 'CREDIT_CARD',
          creditLimit: limit,
          startingSpent: spent,
          isLiability: true
        });

        // Adjust live spent
        adjustAccountBalance(selectedAccount.id, spent);
      } else {
        addBankAccount({
          name: computedName,
          accountName: computedName,
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          accountType: 'CREDIT_CARD',
          creditLimit: limit,
          startingSpent: spent,
          openingBalance: -spent,
          isLiability: true
        });
      }

      setMode('LIST');
      setSelectedAccount(null);
      return;
    }

    // 2. STANDARD BANK / CASH / INVESTMENT SUBMISSION
    const rawBal = parseFloat(balanceText) || 0;
    const targetBalance = isNegative ? -rawBal : rawBal;

    let computedType = accountType;
    if (computedType === 'BANK') {
      const isCash = bankName.trim().toLowerCase().includes('cash') || accountName.trim().toLowerCase().includes('cash');
      const isInvest = bankName.trim().toLowerCase().includes('invest') || accountName.trim().toLowerCase().includes('invest');
      if (isCash) computedType = 'CASH';
      else if (isInvest) computedType = 'INVESTMENT';
    }

    if (mode === 'EDIT' && selectedAccount) {
      updateBankAccount(selectedAccount.id, {
        name: computedName,
        accountName: computedName,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountType: computedType,
        isLiability: isNegative
      });

      adjustAccountBalance(selectedAccount.id, targetBalance);
      setMode('LIST');
      setSelectedAccount(null);
    } else if (mode === 'ADD') {
      addBankAccount({
        name: computedName,
        accountName: computedName,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountType: computedType,
        openingBalance: targetBalance,
        isLiability: isNegative
      });
      setMode('LIST');
    }
  };

  const handleDelete = (acc) => {
    const name = acc.name || acc.accountName;
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteBankAccount(acc.id);
      if (selectedAccount?.id === acc.id) {
        setMode('LIST');
        setSelectedAccount(null);
      }
    }
  };

  // Calculations for live credit card input
  const previewLimit = parseFloat(creditLimitText) || 0;
  const previewSpent = parseFloat(spentText) || 0;
  const previewAvailable = Math.max(0, previewLimit - previewSpent);
  const previewUtilization = previewLimit > 0 ? Math.min(100, Math.round((previewSpent / previewLimit) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${
              accountType === 'CREDIT_CARD' || mode === 'PAY_BILL'
                ? 'bg-rose-100 text-rose-700'
                : accountType === 'INVESTMENT'
                  ? 'bg-indigo-100 text-indigo-800'
                  : accountType === 'CASH'
                    ? 'bg-teal-100 text-teal-800'
                    : 'bg-emerald-100 text-emerald-800'
            }`}>
              {accountType === 'CREDIT_CARD' || mode === 'PAY_BILL' ? (
                <CreditCard className="w-5 h-5" />
              ) : accountType === 'INVESTMENT' ? (
                <TrendingUp className="w-5 h-5" />
              ) : accountType === 'CASH' ? (
                <Banknote className="w-5 h-5" />
              ) : (
                <Landmark className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {mode === 'PAY_BILL'
                  ? `Pay Credit Card Bill`
                  : mode === 'LIST'
                    ? 'Bank Accounts & Credit Cards'
                    : mode === 'EDIT'
                      ? (accountType === 'CREDIT_CARD' ? 'Update Credit Card & Limit' : accountType === 'INVESTMENT' ? 'Update Investment' : 'Update Account & Balance')
                      : (accountType === 'CREDIT_CARD' ? 'Add Credit Card' : accountType === 'INVESTMENT' ? 'Add Investment' : accountType === 'CASH' ? 'Add Cash / Wallet' : 'Add Bank Account')}
              </h2>
              <p className="text-xs text-gray-500">
                {mode === 'PAY_BILL'
                  ? `Pay outstanding bill from your bank account`
                  : mode === 'LIST'
                    ? `Total Net Bank: ${currencySymbol}${totalBankBalance.toLocaleString()}`
                    : accountType === 'CREDIT_CARD'
                      ? 'Set credit limit and current spent to track available limit'
                      : 'Enter starting balance and account details'}
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
        <div className="p-6 overflow-y-auto flex-1">
          {mode === 'PAY_BILL' ? (
            /* Pay Credit Card Bill Form */
            <form onSubmit={handleConfirmPayBill} className="space-y-4">
              <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-900">Card to Pay:</span>
                  <span className="text-xs font-extrabold text-rose-800">{payingCard?.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-rose-700">
                  <span>Current Outstanding Spent:</span>
                  <span className="font-extrabold text-sm">{currencySymbol}{payingCard?.currentSpent?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-emerald-700 pt-1 border-t border-rose-200/60">
                  <span>Available Credit Limit:</span>
                  <span className="font-bold">{currencySymbol}{payingCard?.availableLimit?.toLocaleString()} / {currencySymbol}{payingCard?.creditLimit?.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Bill Amount to Pay ({currencySymbol}) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-lg font-black text-rose-700">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    step="any"
                    required
                    autoFocus
                    placeholder="0.00"
                    value={billAmountText}
                    onChange={(e) => setBillAmountText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xl font-bold rounded-xl border border-rose-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                  Pay From Bank Account *
                </label>
                <select
                  value={payFromBankId}
                  onChange={(e) => setPayFromBankId(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-600 font-semibold"
                >
                  {bankAccountsWithBalance
                    .filter(a => a.accountType !== 'CREDIT_CARD' && !isInvestAccount(a))
                    .map(a => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Available: {currencySymbol}{a.liveBalance.toLocaleString()})
                      </option>
                    ))}
                </select>
                <span className="text-[11px] text-gray-500 block mt-1">
                  Amount will be debited from this bank account and credited to your card, reducing spent and restoring credit limit.
                </span>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setMode('LIST')}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  &larr; Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-rose-200 cursor-pointer"
                >
                  Confirm Bill Payment
                </button>
              </div>
            </form>
          ) : mode === 'LIST' ? (
            /* Accounts List View */
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Accounts, Cards & Investments ({bankAccountsWithBalance.length})
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => startAddAccount('CREDIT_CARD')}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>+ Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startAddAccount('INVESTMENT')}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>+ Invest</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startAddAccount('BANK')}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Bank</span>
                  </button>
                </div>
              </div>

              {bankAccountsWithBalance.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-3">
                  <Landmark className="w-10 h-10 mx-auto opacity-30 text-gray-400" />
                  <p className="text-xs font-medium text-gray-600">No bank accounts or credit cards added yet.</p>
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <button
                      onClick={() => startAddAccount('BANK')}
                      className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-xs font-bold hover:bg-emerald-800 cursor-pointer"
                    >
                      + Add Bank Account
                    </button>
                    <button
                      onClick={() => startAddAccount('CREDIT_CARD')}
                      className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 cursor-pointer"
                    >
                      + Add Credit Card
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {bankAccountsWithBalance.map((acc) => {
                    const isCard = acc.accountType === 'CREDIT_CARD';
                    const isInvest = isInvestAccount(acc);
                    const isCash = isCashAccount(acc);
                    const isNeg = acc.liveBalance < 0;

                    // Credit card utilization
                    const cardLimit = acc.creditLimit || 0;
                    const cardSpent = acc.currentSpent || 0;
                    const cardAvail = acc.availableLimit !== undefined ? acc.availableLimit : Math.max(0, cardLimit - cardSpent);
                    const utilPercent = cardLimit > 0 ? Math.min(100, Math.round((cardSpent / cardLimit) * 100)) : 0;

                    return (
                      <div
                        key={acc.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          isCard
                            ? 'bg-rose-50/40 border-rose-200/80 hover:bg-rose-50/70'
                            : isInvest
                              ? 'bg-indigo-50/30 border-indigo-200/80 hover:bg-indigo-50/60'
                              : 'bg-gray-50/80 hover:bg-gray-100/70 border-gray-200/70'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-gray-900 truncate">{acc.name}</span>
                              {isCard ? (
                                <span className="px-2 py-0.5 bg-rose-100 border border-rose-200 text-rose-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                                  <CreditCard className="w-3 h-3" />
                                  Credit Card
                                </span>
                              ) : isInvest ? (
                                <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-full">
                                  📈 Investment
                                </span>
                              ) : isCash ? (
                                <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-bold rounded-full">
                                  💵 Cash
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold rounded-full">
                                  🏦 Bank
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-gray-500 truncate mt-0.5">
                              {acc.bankName || (isCard ? 'Credit Card' : isInvest ? 'Portfolio' : 'Account')} {acc.accountNumber ? `•••• ${acc.accountNumber}` : ''}
                            </div>
                          </div>

                          {/* Balance Display */}
                          <div className="text-right flex-shrink-0">
                            {isCard ? (
                              <div>
                                <span className="text-[11px] text-gray-500 block font-medium">Available Limit</span>
                                <span className="text-base font-extrabold text-emerald-700 block">
                                  {currencySymbol}{cardAvail.toLocaleString()}
                                </span>
                                <span className="text-[11px] text-rose-600 font-semibold block">
                                  Spent: {currencySymbol}{cardSpent.toLocaleString()}
                                </span>
                              </div>
                            ) : (
                              <div>
                                <span className="text-[11px] text-gray-400 block font-medium">
                                  {isInvest ? 'Invested Value' : 'Available Balance'}
                                </span>
                                <span className={`text-base font-extrabold ${
                                  isInvest ? 'text-indigo-700' : isNeg ? 'text-red-600' : 'text-emerald-700'
                                }`}>
                                  {currencySymbol}{acc.liveBalance.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Credit Card Specific Limit Bar & Pay Bill Action */}
                        {isCard && (
                          <div className="mt-3 pt-3 border-t border-rose-100 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-[150px]">
                              <div className="flex justify-between text-[10px] font-bold text-gray-500 mb-1">
                                <span>Limit: {currencySymbol}{cardLimit.toLocaleString()}</span>
                                <span>{utilPercent}% used</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    utilPercent > 75 ? 'bg-red-600' : utilPercent > 40 ? 'bg-amber-500' : 'bg-emerald-600'
                                  }`}
                                  style={{ width: `${utilPercent}%` }}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {cardSpent > 0 && (
                                <button
                                  type="button"
                                  onClick={() => startPayBill(acc)}
                                  className="px-2.5 py-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors shadow-xs cursor-pointer"
                                >
                                  Pay Bill
                                </button>
                              )}
                              <button
                                onClick={() => startEditAccount(acc)}
                                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-rose-100/70 rounded-lg transition-colors cursor-pointer"
                                title="Update Card & Limit"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(acc)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Card"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Standard Account Actions */}
                        {!isCard && (
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 text-[11px] text-gray-400">
                            <span>
                              {isInvest ? 'Initial Invested: ' : 'Initial Opening: '}{currencySymbol}{acc.openingBalance.toLocaleString()}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => startEditAccount(acc)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors font-medium text-xs flex items-center gap-1 cursor-pointer"
                                title="Update Balance & Details"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDelete(acc)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Add or Edit Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'ADD' && (
                <div className="space-y-2 pb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Account Category
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType('BANK');
                        setAccountName('');
                        setBankName('');
                        setAccountNumber('');
                        setIsNegative(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all font-semibold cursor-pointer ${
                        accountType === 'BANK'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      🏦 Bank Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType('CASH');
                        setAccountName('Cash in Hand');
                        setBankName('Cash');
                        setAccountNumber('');
                        setIsNegative(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all font-bold cursor-pointer ${
                        accountType === 'CASH'
                          ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      💵 Liquid Cash / Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType('INVESTMENT');
                        setAccountName('Mutual Funds');
                        setBankName('Groww / Zerodha');
                        setAccountNumber('');
                        setIsNegative(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all font-bold cursor-pointer ${
                        accountType === 'INVESTMENT'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-800 shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      📈 Investment
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountType('CREDIT_CARD');
                        setAccountName('');
                        setBankName('');
                        setAccountNumber('');
                        setCreditLimitText('');
                        setSpentText('0');
                        setIsNegative(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all font-bold cursor-pointer ${
                        accountType === 'CREDIT_CARD'
                          ? 'border-rose-600 bg-rose-50 text-rose-800 shadow-xs'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      💳 Credit Card
                    </button>
                  </div>

                  {/* Sub-presets for Investments */}
                  {accountType === 'INVESTMENT' && (
                    <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl space-y-2 animate-fadeIn">
                      <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                        Quick Investment Presets
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { label: '📊 Mutual Funds', name: 'Mutual Funds', broker: 'Groww / Zerodha' },
                          { label: '📈 Stocks / Demat', name: 'Stocks / Demat', broker: 'Zerodha / Angel' },
                          { label: '🪙 Gold / SGB', name: 'Gold / SGB', broker: 'Sovereign Gold / Tanishq' },
                          { label: '🏛️ Fixed Deposit (FD)', name: 'Fixed Deposit (FD)', broker: 'Bank FD' },
                          { label: '🛡️ PPF / EPF', name: 'PPF / EPF', broker: 'Post Office / EPFO' },
                          { label: '🌐 Crypto', name: 'Crypto Portfolio', broker: 'CoinDCX / Binance' }
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => {
                              setAccountName(preset.name);
                              setBankName(preset.broker);
                              setIsNegative(false);
                            }}
                            className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition-all cursor-pointer ${
                              accountName === preset.name
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-100/70'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* DEDICATED CREDIT CARD FORM FIELDS */}
              {accountType === 'CREDIT_CARD' ? (
                <div className="space-y-4 animate-fadeIn">
                  {/* Credit Card Limits Box */}
                  <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-900 flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-rose-600" />
                        Credit Limit & Current Spent
                      </span>
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                        {previewUtilization}% Utilized
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Total Credit Limit ({currencySymbol}) *
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-sm font-bold text-gray-400">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            step="any"
                            required
                            placeholder="e.g. 100000"
                            value={creditLimitText}
                            onChange={(e) => setCreditLimitText(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-base font-bold rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Current Spent / Unpaid ({currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2 text-sm font-bold text-rose-500">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            step="any"
                            placeholder="0.00"
                            value={spentText}
                            onChange={(e) => setSpentText(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 text-base font-bold rounded-xl border border-rose-200 focus:outline-none focus:ring-2 focus:ring-rose-400 bg-white text-rose-700"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Calculated Available Limit Preview */}
                    <div className="pt-2 border-t border-rose-200/60 flex items-center justify-between">
                      <span className="text-xs font-semibold text-gray-600">Available Credit Limit:</span>
                      <span className="text-base font-extrabold text-emerald-700">
                        {currencySymbol}{previewAvailable.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Card Name */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Card Name / Nickname *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. HDFC Regalia, SBI Cashback, ICICI Amazon Pay"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-600 text-sm"
                    />
                  </div>

                  {/* Bank / Issuer */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Bank / Card Issuer (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank, SBI Card, ICICI Bank, Axis Bank"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-600 text-sm"
                    />
                  </div>

                  {/* Last 4 Digits */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Last 4 Digits of Card (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="e.g. 4321"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-600 text-sm"
                    />
                  </div>
                </div>
              ) : (
                /* STANDARD BANK / CASH / INVESTMENT FORM */
                <div className="space-y-4">
                  {mode === 'EDIT' && (
                    <div className={`p-3 border rounded-xl flex items-center gap-2 text-xs ${
                      accountType === 'INVESTMENT'
                        ? 'bg-indigo-50/70 border-indigo-200 text-indigo-900'
                        : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                    }`}>
                      <Sparkles className={`w-4 h-4 flex-shrink-0 ${
                        accountType === 'INVESTMENT' ? 'text-indigo-700' : 'text-emerald-700'
                      }`} />
                      <span>
                        Updating the <strong>{accountType === 'INVESTMENT' ? 'Invested Value' : 'Available Balance'}</strong> will adjust your records to match real values.
                      </span>
                    </div>
                  )}

                  {/* Balance Input (Prominent) */}
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                        {accountType === 'INVESTMENT'
                          ? (mode === 'EDIT' ? 'Current Portfolio / Invested Value *' : 'Initial Invested Amount *')
                          : (mode === 'EDIT' ? 'Current Available Balance *' : 'Opening / Starting Balance *')}
                      </label>
                      {accountType !== 'INVESTMENT' && (
                        <div className="flex items-center space-x-1 bg-gray-200 p-0.5 rounded-lg text-xs font-semibold">
                          <button
                            type="button"
                            onClick={() => setIsNegative(false)}
                            className={`px-2.5 py-1 rounded-md transition ${
                              !isNegative ? 'bg-white text-emerald-700 shadow-xs' : 'text-gray-600'
                            }`}
                          >
                            Saving / Asset (+)
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsNegative(true)}
                            className={`px-2.5 py-1 rounded-md transition ${
                              isNegative ? 'bg-red-600 text-white shadow-xs' : 'text-gray-600'
                            }`}
                          >
                            Overdraft (-)
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="relative">
                      <span className={`absolute left-3.5 top-2.5 text-lg font-black ${
                        accountType === 'INVESTMENT'
                          ? 'text-indigo-700'
                          : isNegative
                            ? 'text-red-600'
                            : 'text-emerald-700'
                      }`}>
                        {isNegative ? `- ${currencySymbol}` : currencySymbol}
                      </span>
                      <input
                        type="number"
                        step="any"
                        required
                        autoFocus
                        placeholder="0.00"
                        value={balanceText}
                        onChange={(e) => setBalanceText(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2.5 text-xl font-bold rounded-xl border bg-white focus:outline-none focus:ring-2 transition-all ${
                          accountType === 'INVESTMENT'
                            ? 'border-indigo-200 focus:border-indigo-600 focus:ring-indigo-200 text-indigo-700'
                            : isNegative
                              ? 'border-red-200 focus:border-red-500 focus:ring-red-200 text-red-600'
                              : 'border-gray-200 focus:border-emerald-600 focus:ring-emerald-200 text-emerald-700'
                        }`}
                      />
                    </div>
                  </div>

                  {/* Account Name / Nickname */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {accountType === 'INVESTMENT' ? 'Investment / Portfolio Name *' : 'Account Name / Nickname *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        accountType === 'INVESTMENT'
                          ? 'e.g. Zerodha - Stocks, Groww Mutual Funds, SBI FD, SGB Gold'
                          : 'e.g. sbi1, hdfc-salary, cash all'
                      }
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                    />
                  </div>

                  {/* Bank Name / Platform */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {accountType === 'INVESTMENT' ? 'Platform / Broker / Fund / Bank (Optional)' : 'Bank Name (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        accountType === 'INVESTMENT'
                          ? 'e.g. Zerodha, Groww, Angel One, ICICI Direct, SBI'
                          : 'e.g. State Bank of India, HDFC Bank, ICICI, IndusInd'
                      }
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                    />
                  </div>

                  {/* Account / Folio Number */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      {accountType === 'INVESTMENT' ? 'Folio / Demat / Account ID (Optional)' : 'Account Number / Last 4 Digits (Optional)'}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        accountType === 'INVESTMENT'
                          ? 'e.g. 12081600... or Folio 987654'
                          : 'e.g. 5678 or 123456789012'
                      }
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setMode('LIST')}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  &larr; Back to Accounts List
                </button>

                <button
                  type="submit"
                  className={`px-6 py-2.5 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer ${
                    accountType === 'CREDIT_CARD'
                      ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                      : accountType === 'INVESTMENT'
                        ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                        : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-200'
                  }`}
                >
                  {mode === 'EDIT'
                    ? (accountType === 'CREDIT_CARD' ? 'Update Credit Card' : accountType === 'INVESTMENT' ? 'Update Investment' : 'Update Account & Balance')
                    : (accountType === 'CREDIT_CARD' ? 'Save Credit Card' : accountType === 'INVESTMENT' ? 'Save Investment' : 'Save Account')}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer (for List mode) */}
        {mode === 'LIST' && (
          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              💡 Tip: Click on any card or account to edit balance or pay credit card bill.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
