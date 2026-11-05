import React, { useState } from 'react';
import {
  Landmark, ArrowDownCircle, ArrowUpCircle, Plus, CheckCircle,
  Clock, AlertCircle, Phone, Calendar, Trash2, ChevronDown,
  ChevronUp, DollarSign, X, Check
} from 'lucide-react';
import { useKhata } from '../context/KhataContext';

export default function LoansView() {
  const {
    loansWithSummary,
    addLoan,
    deleteLoan,
    settleLoan,
    addLoanRepayment,
    currencySymbol
  } = useKhata();

  const [activeTab, setActiveTab] = useState('BORROWED'); // 'BORROWED' | 'LENT'
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [repayingLoan, setRepayingLoan] = useState(null);
  const [expandedLoanId, setExpandedLoanId] = useState(null);

  // New Loan Form State
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [monthlyEmi, setMonthlyEmi] = useState('');
  const [dueDayOfMonth, setDueDayOfMonth] = useState('5');
  const [notes, setNotes] = useState('');

  // Repayment Form State
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentNotes, setRepaymentNotes] = useState('');

  // Filter loans by tab
  const displayedLoans = loansWithSummary.filter(l => l.type === activeTab);

  // Totals for active tab
  const totals = displayedLoans.reduce((acc, curr) => {
    acc.principal += curr.principalAmount;
    acc.repaid += curr.totalRepaid;
    acc.remaining += curr.remainingBalance;
    return acc;
  }, { principal: 0, repaid: 0, remaining: 0 });

  const handleCreateLoan = (e) => {
    e.preventDefault();
    const principal = parseFloat(principalAmount);
    if (isNaN(principal) || principal <= 0 || !partyName.trim()) {
      alert('Please enter valid name and amount');
      return;
    }

    addLoan({
      type: activeTab,
      partyName: partyName.trim(),
      partyPhone: partyPhone.trim(),
      principalAmount: principal,
      monthlyEmi: parseFloat(monthlyEmi) || 0,
      dueDayOfMonth: parseInt(dueDayOfMonth, 10) || 1,
      startDate: Date.now(),
      notes: notes.trim()
    });

    // Reset & close
    setPartyName('');
    setPartyPhone('');
    setPrincipalAmount('');
    setMonthlyEmi('');
    setDueDayOfMonth('5');
    setNotes('');
    setIsAddModalOpen(false);
  };

  const handleRecordRepayment = (e) => {
    e.preventDefault();
    const amount = parseFloat(repaymentAmount);
    if (isNaN(amount) || amount <= 0 || !repayingLoan) {
      alert('Please enter a valid repayment amount');
      return;
    }

    addLoanRepayment(repayingLoan.id, {
      amount,
      paymentDate: Date.now(),
      notes: repaymentNotes.trim()
    });

    setRepayingLoan(null);
    setRepaymentAmount('');
    setRepaymentNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Bar: Tabs & Add Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('BORROWED')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'BORROWED'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
            <span>Borrowed / Loans (Liabilities)</span>
          </button>
          <button
            onClick={() => setActiveTab('LENT')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'LENT'
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <ArrowUpCircle className="w-4 h-4" />
            <span>Given / Udhar (Assets)</span>
          </button>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className={`flex items-center justify-center gap-1.5 px-4 py-2.5 text-white font-bold text-xs rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] ${
            activeTab === 'BORROWED'
              ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
              : 'bg-emerald-700 hover:bg-emerald-800 shadow-emerald-200'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>{activeTab === 'BORROWED' ? '+ Add Loan / Borrowing' : '+ Add Money Lent / Udhar'}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
            {activeTab === 'BORROWED' ? 'Total Borrowed' : 'Total Lent'}
          </span>
          <span className="text-2xl font-black text-gray-900 mt-1 block">
            {currencySymbol}{totals.principal.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">Initial principal amount</span>
        </div>

        <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-xs">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider block">
            {activeTab === 'BORROWED' ? 'Total Repaid' : 'Total Received'}
          </span>
          <span className="text-2xl font-black text-emerald-700 mt-1 block">
            {currencySymbol}{totals.repaid.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">Cleared so far</span>
        </div>

        <div className={`p-4 border rounded-2xl shadow-xs ${
          activeTab === 'BORROWED'
            ? 'bg-red-50/80 border-red-200'
            : 'bg-emerald-50/80 border-emerald-200'
        }`}>
          <span className={`text-xs font-bold uppercase tracking-wider block ${
            activeTab === 'BORROWED' ? 'text-red-700' : 'text-emerald-800'
          }`}>
            {activeTab === 'BORROWED' ? 'Remaining to Pay' : 'Pending to Collect'}
          </span>
          <span className={`text-2xl font-black mt-1 block ${
            activeTab === 'BORROWED' ? 'text-red-700' : 'text-emerald-800'
          }`}>
            {currencySymbol}{totals.remaining.toLocaleString()}
          </span>
          <span className="text-[11px] text-gray-500 block mt-0.5">Active balance</span>
        </div>
      </div>

      {/* Loans Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedLoans.length === 0 ? (
          <div className="md:col-span-2 py-16 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
            <Landmark className="w-12 h-12 mx-auto mb-2 opacity-30 text-gray-400" />
            <p className="text-sm font-semibold text-gray-600">No {activeTab.toLowerCase()} records yet.</p>
            <p className="text-xs text-gray-400 mt-1">Keep track of personal loans, bank loans, and family udhar here.</p>
          </div>
        ) : (
          displayedLoans.map((loan) => {
            const isSettled = loan.isSettled;
            const progress = loan.principalAmount > 0
              ? Math.min(100, Math.round((loan.totalRepaid / loan.principalAmount) * 100))
              : 100;
            const isExpanded = expandedLoanId === loan.id;

            return (
              <div
                key={loan.id}
                className={`p-5 rounded-2xl border transition-all ${
                  isSettled
                    ? 'bg-gray-50/90 border-gray-200 opacity-80'
                    : 'bg-white border-gray-200/80 shadow-xs hover:border-gray-300'
                }`}
              >
                {/* Header: Party Name & Status */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-gray-900 text-base">{loan.partyName}</h4>
                      {isSettled ? (
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Settled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full flex items-center gap-1">
                          <Clock className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                    {loan.partyPhone && (
                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{loan.partyPhone}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-gray-400 block">Remaining Due</span>
                    <span className={`text-lg font-black ${isSettled ? 'text-gray-500' : (loan.type === 'BORROWED' ? 'text-red-600' : 'text-emerald-700')}`}>
                      {currencySymbol}{loan.remainingBalance.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex justify-between text-xs font-semibold text-gray-600">
                    <span>Repaid: {currencySymbol}{loan.totalRepaid.toLocaleString()}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isSettled ? 'bg-emerald-600' : (loan.type === 'BORROWED' ? 'bg-red-500' : 'bg-emerald-600')
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Meta: EMI & Due Day */}
                <div className="mt-3.5 grid grid-cols-2 gap-2 text-xs bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-gray-400 block">Principal:</span>
                    <span className="font-bold text-gray-800">{currencySymbol}{loan.principalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Monthly EMI:</span>
                    <span className="font-bold text-gray-800">
                      {loan.monthlyEmi > 0 ? `${currencySymbol}${loan.monthlyEmi.toLocaleString()} (Due: ${loan.dueDayOfMonth}th)` : 'None / Lump-sum'}
                    </span>
                  </div>
                </div>

                {loan.notes && (
                  <p className="text-xs text-gray-500 italic mt-2.5">
                    "{loan.notes}"
                  </p>
                )}

                {/* Action Buttons */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 flex items-center gap-1"
                  >
                    <span>Repayments ({loan.repayments.length})</span>
                    {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    {!isSettled && (
                      <button
                        onClick={() => {
                          setRepayingLoan(loan);
                          setRepaymentAmount(loan.monthlyEmi > 0 ? String(loan.monthlyEmi) : '');
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors shadow-xs"
                      >
                        + Repay
                      </button>
                    )}

                    <button
                      onClick={() => settleLoan(loan.id, !loan.isSettled)}
                      className="px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      title={loan.isSettled ? 'Reopen Loan' : 'Mark as Settled'}
                    >
                      {loan.isSettled ? 'Reopen' : 'Settle'}
                    </button>

                    <button
                      onClick={() => {
                        if (window.confirm(`Delete loan entry for "${loan.partyName}"?`)) {
                          deleteLoan(loan.id);
                        }
                      }}
                      className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete Loan"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Repayment History Dropdown */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Repayment Log:
                    </span>
                    {loan.repayments.length === 0 ? (
                      <p className="text-xs text-gray-400 italic">No repayments recorded yet.</p>
                    ) : (
                      loan.repayments.map((rep) => (
                        <div key={rep.id} className="p-2 bg-gray-50 rounded-lg text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-emerald-700">+{currencySymbol}{rep.amount.toLocaleString()}</span>
                            {rep.notes && <span className="text-gray-500 ml-2 italic">"{rep.notes}"</span>}
                          </div>
                          <span className="text-[10px] text-gray-400">
                            {new Date(rep.paymentDate).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Add Loan Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-base">
                {activeTab === 'BORROWED' ? 'Add Borrowed Loan / Liability' : 'Add Money Given / Udhar'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLoan} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Party / Bank Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder={activeTab === 'BORROWED' ? 'e.g. HDFC Personal Loan, Rahul Sharma' : 'e.g. Amit Patil, Shop advance'}
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Principal Amount ({currencySymbol}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={principalAmount}
                    onChange={(e) => setPrincipalAmount(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="Mobile number"
                    value={partyPhone}
                    onChange={(e) => setPartyPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Monthly EMI (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={monthlyEmi}
                    onChange={(e) => setMonthlyEmi(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Due Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dueDayOfMonth}
                    onChange={(e) => setDueDayOfMonth(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. 5-year tenure at 10.5%, repayment expected by Diwali"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
                >
                  Save Loan Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Repayment Modal */}
      {repayingLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-scaleUp">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">
                Record Repayment for {repayingLoan.partyName}
              </h3>
              <button onClick={() => setRepayingLoan(null)} className="p-1 text-gray-400 hover:text-gray-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRecordRepayment} className="p-5 space-y-4">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Remaining Balance:</span>
                  <span className="font-bold text-emerald-800">{currencySymbol}{repayingLoan.remainingBalance.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Repayment Amount ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  autoFocus
                  placeholder="0.00"
                  value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                  className="w-full px-3 py-2.5 text-base font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Month 12 EMI, NEFT transfer"
                  value={repaymentNotes}
                  onChange={(e) => setRepaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRepayingLoan(null)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
