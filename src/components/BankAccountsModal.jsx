import React, { useState, useEffect } from 'react';
import { useKhata } from '../context/KhataContext';
import { Landmark, X, Trash2, Edit2, Plus, Check, ArrowRight, ShieldAlert, Sparkles } from 'lucide-react';

export default function BankAccountsModal({ isOpen, onClose, initialAccountToEdit = null }) {
  const {
    bankAccountsWithBalance,
    addBankAccount,
    updateBankAccount,
    adjustAccountBalance,
    deleteBankAccount,
    currencySymbol,
    totalBankBalance
  } = useKhata();

  const [mode, setMode] = useState('LIST'); // 'LIST' | 'EDIT' | 'ADD'
  const [selectedAccount, setSelectedAccount] = useState(null);

  // Form State
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [balanceText, setBalanceText] = useState('');
  const [isNegative, setIsNegative] = useState(false);

  useEffect(() => {
    if (initialAccountToEdit) {
      if (initialAccountToEdit.id) {
        startEditAccount(initialAccountToEdit);
      } else {
        setSelectedAccount(null);
        setBankName(initialAccountToEdit.bankName || '');
        setAccountNumber(initialAccountToEdit.accountNumber || '');
        setAccountName(initialAccountToEdit.name || initialAccountToEdit.accountName || '');
        setBalanceText('');
        setIsNegative(false);
        setMode('ADD');
      }
    } else {
      setMode('LIST');
      setSelectedAccount(null);
    }
  }, [initialAccountToEdit, isOpen]);

  if (!isOpen) return null;

  const startEditAccount = (acc) => {
    setSelectedAccount(acc);
    setBankName(acc.bankName || '');
    setAccountNumber(acc.accountNumber || '');
    setAccountName(acc.name || acc.accountName || '');
    const currentBal = acc.liveBalance !== undefined ? acc.liveBalance : (acc.openingBalance || 0);
    setIsNegative(currentBal < 0);
    setBalanceText(Math.abs(currentBal) ? String(Math.abs(currentBal)) : '0');
    setMode('EDIT');
  };

  const startAddAccount = () => {
    setSelectedAccount(null);
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setBalanceText('');
    setIsNegative(false);
    setMode('ADD');
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

    const rawBal = parseFloat(balanceText) || 0;
    const targetBalance = isNegative ? -rawBal : rawBal;

    const isCash = bankName.trim().toLowerCase().includes('cash') || accountName.trim().toLowerCase().includes('cash');
    const computedType = isCash ? 'CASH' : isNegative ? 'CREDIT_CARD' : 'BANK';

    if (mode === 'EDIT' && selectedAccount) {
      // 1. Update basic account info
      updateBankAccount(selectedAccount.id, {
        name: computedName,
        accountName: computedName,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountType: computedType,
        isLiability: isNegative
      });

      // 2. Adjust available live balance to match user input
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleUp">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {mode === 'LIST' ? 'Bank Accounts & Balances' : mode === 'EDIT' ? 'Update Account & Balance' : 'Add Bank / Account'}
              </h2>
              <p className="text-xs text-gray-500">
                {mode === 'LIST'
                  ? `Total Net Balance: ${currencySymbol}${totalBankBalance.toLocaleString()}`
                  : 'Update balance to match your actual bank passbook'}
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
          {mode === 'LIST' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Your Accounts ({bankAccountsWithBalance.length})
                </span>
                <button
                  type="button"
                  onClick={startAddAccount}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add New Account</span>
                </button>
              </div>

              {bankAccountsWithBalance.length === 0 ? (
                <div className="py-12 text-center text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <Landmark className="w-10 h-10 mx-auto mb-2 opacity-30 text-gray-400" />
                  <p className="text-xs font-medium text-gray-600">No bank accounts added yet.</p>
                  <button
                    onClick={startAddAccount}
                    className="mt-2 text-xs font-bold text-emerald-700 underline"
                  >
                    Click here to add your first bank account
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {bankAccountsWithBalance.map((acc) => {
                    const isNeg = acc.liveBalance < 0;
                    return (
                      <div
                        key={acc.id}
                        className="p-4 bg-gray-50/80 hover:bg-gray-100/70 border border-gray-200/70 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900 truncate">{acc.name}</span>
                            {acc.isLiability && (
                              <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                                CC / Liability
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate mt-0.5">
                            {acc.bankName || 'Account'} {acc.accountNumber ? `••• ${acc.accountNumber}` : ''}
                          </div>
                          <div className="text-[11px] text-gray-400 mt-1">
                            Initial Opening: {currencySymbol}{acc.openingBalance.toLocaleString()}
                          </div>
                        </div>

                        {/* Balance & Actions */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[11px] text-gray-400 block font-medium">Available Balance</span>
                            <span className={`text-base font-extrabold ${isNeg ? 'text-red-600' : 'text-emerald-700'}`}>
                              {currencySymbol}{acc.liveBalance.toLocaleString()}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 pl-2 border-l border-gray-200">
                            <button
                              onClick={() => startEditAccount(acc)}
                              className="p-2 text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors font-medium text-xs flex items-center gap-1"
                              title="Update Balance & Details"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(acc)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
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
                <div className="space-y-1.5 pb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    Account Category
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountName('');
                        setBankName('');
                        setAccountNumber('');
                        setIsNegative(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all font-semibold cursor-pointer ${
                        !bankName.toLowerCase().includes('cash') && !accountName.toLowerCase().includes('cash') && !isNegative
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      🏦 Bank Account
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountName('Cash in Hand');
                        setBankName('Cash');
                        setAccountNumber('');
                        setIsNegative(false);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all font-bold cursor-pointer ${
                        bankName.toLowerCase().includes('cash') || accountName.toLowerCase().includes('cash')
                          ? 'border-teal-600 bg-teal-50 text-teal-800'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      💵 Liquid Cash / Wallet
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountName('Credit Card');
                        setBankName('');
                        setIsNegative(true);
                      }}
                      className={`px-3 py-1.5 text-xs rounded-xl border transition-all font-semibold cursor-pointer ${
                        isNegative
                          ? 'border-rose-600 bg-rose-50 text-rose-800'
                          : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      💳 Credit Card / Loan
                    </button>
                  </div>
                </div>
              )}

              {mode === 'EDIT' && (
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                  <span>
                    Updating the <strong>Available Balance</strong> will adjust the balance automatically to match your real bank amount.
                  </span>
                </div>
              )}

              {/* Available Balance Input (Prominent) */}
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                    {mode === 'EDIT' ? 'Current Available Balance' : 'Opening / Starting Balance'} *
                  </label>
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
                      Credit Card / Loan (-)
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className={`absolute left-3.5 top-2.5 text-lg font-black ${isNegative ? 'text-red-600' : 'text-emerald-700'}`}>
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
                      isNegative
                        ? 'border-red-200 focus:border-red-500 focus:ring-red-200 text-red-600'
                        : 'border-gray-200 focus:border-emerald-600 focus:ring-emerald-200 text-emerald-700'
                    }`}
                  />
                </div>
              </div>

              {/* Account Name / Nickname */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Account Name / Nickname *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. sbi1, hdfc-salary, cash all, axis-cc"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                />
              </div>

              {/* Bank Name */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Bank Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. State Bank of India, HDFC Bank, ICICI, IndusInd"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Account Number / Last 4 Digits (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5678 or 123456789012"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 text-sm"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setMode('LIST')}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  &larr; Back to Accounts List
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-200"
                >
                  {mode === 'EDIT' ? 'Update Account & Balance' : 'Save Account'}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer (for List mode) */}
        {mode === 'LIST' && (
          <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              💡 Tip: Click on any account to edit its balance anytime.
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
