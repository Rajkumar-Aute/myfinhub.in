import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { driveService } from '../services/driveService';

const FinHubContext = createContext(null);

const STORAGE_KEY = 'myfinhub_local_data';
const LAST_SYNC_KEY = 'myfinhub_last_sync_time';

export function FinHubProvider({ children }) {
  // Load initial local data
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          appVersion: parsed.appVersion || '1.0.0',
          backupTimestamp: parsed.backupTimestamp || Date.now(),
          currencyCode: parsed.currencyCode || 'INR',
          currencySymbol: parsed.currencySymbol || '₹',
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          loans: Array.isArray(parsed.loans) ? parsed.loans : [],
          bankAccounts: Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts : []
        };
      }
    } catch (e) {
      console.error('Failed to parse local storage data:', e);
    }
    return {
      appVersion: '1.0.0',
      backupTimestamp: Date.now(),
      currencyCode: 'INR',
      currencySymbol: '₹',
      transactions: [],
      loans: [],
      bankAccounts: []
    };
  });

  const [user, setUser] = useState(() => driveService.getUser());
  const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | success | error
  const [syncMessage, setSyncMessage] = useState('');
  const [lastSyncTime, setLastSyncTime] = useState(() => {
    try {
      const saved = localStorage.getItem(LAST_SYNC_KEY);
      if (!saved) return null;
      const d = new Date(saved);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  });

  // Selected Month State for Dashboard & Monthly Reports
  const [selectedMonthKey, setSelectedMonthKey] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Persist locally whenever data changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('Failed to save to localStorage:', err);
    }
  }, [data]);

  // Compute live balances for each bank account (Opening Balance + Incomes - Expenses)
  const bankAccountsWithBalance = useMemo(() => {
    const accounts = data.bankAccounts || [];
    const transactions = data.transactions || [];

    return accounts.map(acc => {
      const accId = acc.id;
      const accName = acc.name || acc.accountName || '';

      const incomes = transactions
        .filter(t => (t.accountId === accId || (!t.accountId && t.accountName === accName)) && t.type === 'INCOME')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const expenses = transactions
        .filter(t => (t.accountId === accId || (!t.accountId && t.accountName === accName)) && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const isCard = acc.accountType === 'CREDIT_CARD';
      const creditLimit = Number(acc.creditLimit) || 0;
      const openingBal = Number(acc.openingBalance ?? acc.initialBalance) || 0;

      // For Credit Cards:
      // Starting spent: either explicit startingSpent or if openingBal was negative
      const initialSpent = isCard
        ? (Number(acc.startingSpent ?? (openingBal < 0 ? Math.abs(openingBal) : 0)) || 0)
        : 0;

      // Current spent increases with card expenses, decreases with bill payments / incomes
      const currentSpent = isCard ? Math.max(0, initialSpent + expenses - incomes) : 0;
      const availableLimit = isCard && creditLimit > 0 ? Math.max(0, creditLimit - currentSpent) : 0;
      const liveBal = isCard ? -currentSpent : (openingBal + incomes - expenses);

      return {
        ...acc,
        id: acc.id,
        name: acc.name || acc.accountName || 'Unnamed Account',
        accountName: acc.name || acc.accountName || 'Unnamed Account',
        bankName: acc.bankName || '',
        accountNumber: acc.accountNumber || '',
        accountType: acc.accountType || (isCard ? 'CREDIT_CARD' : 'BANK'),
        openingBalance: openingBal,
        initialBalance: openingBal,
        creditLimit,
        startingSpent: initialSpent,
        currentSpent,
        availableLimit,
        incomes,
        expenses,
        isLiability: isCard || !!acc.isLiability || openingBal < 0,
        isCreditCard: isCard,
        liveBalance: liveBal,
        currentBalance: liveBal
      };
    });
  }, [data.bankAccounts, data.transactions]);

  // Total balance across all accounts
  const totalBankBalance = useMemo(() => {
    return bankAccountsWithBalance.reduce((sum, acc) => sum + acc.liveBalance, 0);
  }, [bankAccountsWithBalance]);

  // Prepare Loans with Repayment Summaries
  const loansWithSummary = useMemo(() => {
    const rawLoans = data.loans || [];
    return rawLoans.map(item => {
      const l = item.loan || item;
      const reps = item.repayments || [];
      const totalRepaid = reps.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
      const principal = Number(l.principalAmount) || 0;
      const remaining = Math.max(0, principal - totalRepaid);

      return {
        id: l.id,
        partyName: l.partyName || 'Unknown Party',
        partyPhone: l.partyPhone || l.phoneNumber || '',
        type: l.type || 'BORROWED',
        principalAmount: principal,
        monthlyEmi: Number(l.monthlyEmi) || 0,
        dueDayOfMonth: Number(l.dueDayOfMonth) || 1,
        startDate: l.startDate || Date.now(),
        dueDate: l.dueDate || null,
        notes: l.notes || '',
        isSettled: !!l.isSettled,
        repayments: reps,
        totalRepaid,
        remainingBalance: remaining
      };
    });
  }, [data.loans]);

  // Sync to Google Drive
  const syncWithDrive = useCallback(async (customPayload = null) => {
    if (!driveService.isAuthenticated()) return;

    setSyncStatus('syncing');
    setSyncMessage('Syncing to Google Drive folder "My Fin Hub"...');

    try {
      const payloadToSave = customPayload || {
        ...data,
        backupTimestamp: Date.now(),
      };

      await driveService.uploadFinHubData(payloadToSave);
      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      setSyncStatus('success');
      setSyncMessage('Data safely synced to Google Drive!');
      setTimeout(() => setSyncStatus('idle'), 3500);
    } catch (err) {
      console.error('Drive Sync failed:', err);
      setSyncStatus('error');
      setSyncMessage(err.message || 'Drive sync failed');
    }
  }, [data]);

  // Pull / Restore from Google Drive
  const restoreFromDrive = useCallback(async () => {
    if (!driveService.isAuthenticated()) {
      setSyncStatus('error');
      setSyncMessage('Please sign in to Google Drive first.');
      return;
    }

    setSyncStatus('syncing');
    setSyncMessage('Fetching latest data from Google Drive...');

    try {
      const remoteData = await driveService.downloadFinHubData();
      if (!remoteData) {
        // No remote backup file in Drive yet: initialize the Google Drive folder & file automatically!
        setSyncMessage('Initializing My Fin Hub in your Google Drive...');
        await driveService.uploadFinHubData({
          ...data,
          backupTimestamp: Date.now(),
        });
        const now = new Date();
        setLastSyncTime(now);
        localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
        setSyncStatus('success');
        setSyncMessage('Google Drive connected & initialized successfully!');
        setTimeout(() => setSyncStatus('idle'), 3500);
        return;
      }

      setData({
        appVersion: remoteData.appVersion || '1.0.0',
        backupTimestamp: remoteData.backupTimestamp || Date.now(),
        currencyCode: remoteData.currencyCode || 'INR',
        currencySymbol: remoteData.currencySymbol || '₹',
        transactions: Array.isArray(remoteData.transactions) ? remoteData.transactions : [],
        loans: Array.isArray(remoteData.loans) ? remoteData.loans : [],
        bankAccounts: Array.isArray(remoteData.bankAccounts) ? remoteData.bankAccounts : []
      });

      const now = new Date();
      setLastSyncTime(now);
      localStorage.setItem(LAST_SYNC_KEY, now.toISOString());
      setSyncStatus('success');
      setSyncMessage('Successfully restored from Google Drive!');
      setTimeout(() => setSyncStatus('idle'), 3500);
    } catch (err) {
      console.error('Drive restore failed:', err);
      setSyncStatus('error');
      setSyncMessage(err.message || 'Drive restore failed');
    }
  }, [data]);

  // Automatically sync with Google Drive on mount if already authenticated
  useEffect(() => {
    if (driveService.isAuthenticated()) {
      restoreFromDrive();
    }
  }, [restoreFromDrive]);

  // Google Login & Logout
  const loginWithGoogle = useCallback((onSuccess, onError) => {
    driveService.signIn(
      (profile) => {
        setUser(profile);
        setSyncStatus('success');
        setSyncMessage(`Signed in as ${profile?.email || profile?.name || 'Google Account'}`);
        restoreFromDrive();
        onSuccess?.(profile);
      },
      (err) => {
        setSyncStatus('error');
        setSyncMessage(err.message || 'Login failed');
        onError?.(err);
      }
    );
  }, [restoreFromDrive]);

  const logoutFromGoogle = useCallback(() => {
    driveService.signOut();
    setUser(null);
    setSyncStatus('idle');
    setSyncMessage('');
  }, []);

  const saveClientId = useCallback((id) => {
    driveService.setClientId(id);
  }, []);

  // Transaction CRUD
  const addTransaction = useCallback((txn) => {
    const timestamp = txn.timestamp || Date.now();
    const d = new Date(timestamp);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const year = d.getFullYear();

    const newTxn = {
      id: crypto.randomUUID ? crypto.randomUUID() : `txn_${Date.now()}_${Math.random()}`,
      ...txn,
      timestamp,
      monthKey,
      year,
      amount: Number(txn.amount) || 0,
      principalPaid: Number(txn.principalPaid) || 0,
      interestPaid: Number(txn.interestPaid) || 0,
    };

    setData(prev => {
      let updatedLoans = prev.loans;
      if (newTxn.loanId && newTxn.principalPaid > 0) {
        updatedLoans = prev.loans.map(item => {
          const lId = item.loan ? item.loan.id : item.id;
          if (lId === newTxn.loanId) {
            const newRepayment = {
              id: crypto.randomUUID ? crypto.randomUUID() : `rep_${Date.now()}`,
              loanId: newTxn.loanId,
              amount: newTxn.principalPaid,
              paymentDate: timestamp,
              notes: 'Repayment from transaction'
            };
            return {
              ...item,
              repayments: [...(item.repayments || []), newRepayment]
            };
          }
          return item;
        });
      }

      const nextData = {
        ...prev,
        transactions: [newTxn, ...prev.transactions],
        loans: updatedLoans
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  const updateTransaction = useCallback((id, updatedFields) => {
    setData(prev => {
      const nextData = {
        ...prev,
        transactions: prev.transactions.map(t => {
          if (t.id === id) {
            const merged = { ...t, ...updatedFields };
            if (merged.timestamp) {
              const d = new Date(merged.timestamp);
              merged.monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
              merged.year = d.getFullYear();
            }
            return merged;
          }
          return t;
        })
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  const deleteTransaction = useCallback((id) => {
    setData(prev => {
      const nextData = {
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== id)
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  // Bank Account & Credit Card CRUD & Live Balance Adjustment
  const addBankAccount = useCallback((acc) => {
    const rawBal = Number(acc.openingBalance ?? acc.initialBalance) || 0;
    const isCard = acc.accountType === 'CREDIT_CARD';
    const creditLimit = Number(acc.creditLimit) || 0;
    const startingSpent = Number(acc.startingSpent) || (rawBal < 0 ? Math.abs(rawBal) : 0);

    const newAcc = {
      id: crypto.randomUUID ? crypto.randomUUID() : `acc_${Date.now()}`,
      name: (acc.name || acc.accountName || '').trim(),
      bankName: (acc.bankName || '').trim(),
      accountNumber: (acc.accountNumber || '').trim(),
      accountType: acc.accountType || (isCard ? 'CREDIT_CARD' : 'BANK'),
      creditLimit: isCard ? creditLimit : 0,
      startingSpent: isCard ? startingSpent : 0,
      openingBalance: isCard ? -startingSpent : rawBal,
      isLiability: isCard || (acc.isLiability !== undefined ? !!acc.isLiability : rawBal < 0),
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    setData(prev => {
      const nextData = {
        ...prev,
        bankAccounts: [...prev.bankAccounts, newAcc]
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  const updateBankAccount = useCallback((idOrAcc, maybeFields = {}) => {
    const id = typeof idOrAcc === 'string' ? idOrAcc : idOrAcc.id;
    const fields = typeof idOrAcc === 'object' ? idOrAcc : maybeFields;

    setData(prev => {
      const nextData = {
        ...prev,
        bankAccounts: prev.bankAccounts.map(a => {
          if (a.id === id) {
            const isCard = (fields.accountType || a.accountType) === 'CREDIT_CARD';
            const openBal = fields.openingBalance !== undefined
              ? Number(fields.openingBalance)
              : fields.initialBalance !== undefined
                ? Number(fields.initialBalance)
                : a.openingBalance;

            const creditLimit = fields.creditLimit !== undefined
              ? Number(fields.creditLimit)
              : (a.creditLimit || 0);

            const startingSpent = fields.startingSpent !== undefined
              ? Number(fields.startingSpent)
              : (a.startingSpent || (openBal < 0 ? Math.abs(openBal) : 0));

            return {
              ...a,
              ...fields,
              id: a.id,
              name: (fields.name || fields.accountName || a.name || '').trim(),
              bankName: (fields.bankName !== undefined ? fields.bankName : (a.bankName || '')).trim(),
              accountNumber: (fields.accountNumber !== undefined ? fields.accountNumber : (a.accountNumber || '')).trim(),
              accountType: fields.accountType || a.accountType || (isCard ? 'CREDIT_CARD' : 'BANK'),
              creditLimit: isCard ? creditLimit : (a.creditLimit || 0),
              startingSpent: isCard ? startingSpent : (a.startingSpent || 0),
              openingBalance: isCard ? -startingSpent : openBal,
              isLiability: isCard || (fields.isLiability !== undefined ? !!fields.isLiability : (openBal < 0 || a.isLiability)),
              updatedAt: Date.now()
            };
          }
          return a;
        })
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  // Directly adjust the available live balance or credit card spent
  const adjustAccountBalance = useCallback((accountId, newTargetBalance) => {
    const target = Number(newTargetBalance) || 0;
    setData(prev => {
      const transactions = prev.transactions || [];
      const account = (prev.bankAccounts || []).find(a => a.id === accountId);
      if (!account) return prev;

      const accName = account.name || account.accountName || '';
      const isCard = account.accountType === 'CREDIT_CARD';

      const incomes = transactions
        .filter(t => (t.accountId === accountId || (!t.accountId && t.accountName === accName)) && t.type === 'INCOME')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const expenses = transactions
        .filter(t => (t.accountId === accountId || (!t.accountId && t.accountName === accName)) && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      if (isCard) {
        // Target is target spent (positive number)
        const targetSpent = Math.abs(target);
        // targetSpent = startingSpent + expenses - incomes
        // => startingSpent = targetSpent - expenses + incomes
        const newStartingSpent = Math.max(0, targetSpent - expenses + incomes);
        const nextData = {
          ...prev,
          bankAccounts: prev.bankAccounts.map(a => {
            if (a.id === accountId) {
              return {
                ...a,
                startingSpent: newStartingSpent,
                openingBalance: -newStartingSpent,
                updatedAt: Date.now()
              };
            }
            return a;
          })
        };
        syncWithDrive(nextData);
        return nextData;
      }

      // Standard bank / cash account
      // target = newOpeningBal + incomes - expenses
      // => newOpeningBal = target - incomes + expenses
      const newOpeningBal = target - incomes + expenses;

      const nextData = {
        ...prev,
        bankAccounts: prev.bankAccounts.map(a => {
          if (a.id === accountId) {
            return {
              ...a,
              openingBalance: newOpeningBal,
              isLiability: target < 0 || a.isLiability,
              updatedAt: Date.now()
            };
          }
          return a;
        })
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  // Pay credit card bill from bank account
  const payCreditCardBill = useCallback((cardId, fromBankAccountId, amount, paymentMode = 'Bank Transfer', note = '') => {
    const parsedAmount = Number(amount) || 0;
    if (parsedAmount <= 0) return;

    setData(prev => {
      const card = (prev.bankAccounts || []).find(a => a.id === cardId);
      const bank = (prev.bankAccounts || []).find(a => a.id === fromBankAccountId);
      const cardName = card ? (card.name || card.accountName) : 'Credit Card';
      const bankName = bank ? (bank.name || bank.accountName) : 'Bank Account';
      const now = Date.now();
      const d = new Date(now);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const year = d.getFullYear();

      // 1. Expense out of bank account
      const bankTxn = {
        id: crypto.randomUUID ? crypto.randomUUID() : `txn_${Date.now()}_1`,
        type: 'EXPENSE',
        amount: parsedAmount,
        category: `Credit Card Bill - ${cardName}`,
        paymentMode,
        accountId: fromBankAccountId || null,
        accountName: bankName,
        timestamp: now,
        monthKey,
        year,
        note: note || `Bill payment for ${cardName}`,
        isCreditCardPayment: true
      };

      // 2. Inflow / reduction of debt into Credit Card
      const cardTxn = {
        id: crypto.randomUUID ? crypto.randomUUID() : `txn_${Date.now()}_2`,
        type: 'INCOME',
        amount: parsedAmount,
        category: `Bill Payment from ${bankName}`,
        paymentMode,
        accountId: cardId,
        accountName: cardName,
        timestamp: now + 1,
        monthKey,
        year,
        note: note || `Bill payment received from ${bankName}`,
        isCreditCardPayment: true
      };

      const nextData = {
        ...prev,
        transactions: [cardTxn, bankTxn, ...prev.transactions]
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  const deleteBankAccount = useCallback((id) => {
    setData(prev => {
      const nextData = {
        ...prev,
        bankAccounts: prev.bankAccounts.filter(a => a.id !== id)
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  // Loan CRUD
  const addLoan = useCallback((loanData) => {
    const loanId = crypto.randomUUID ? crypto.randomUUID() : `loan_${Date.now()}`;
    const newLoan = {
      loan: {
        id: loanId,
        partyName: (loanData.partyName || '').trim(),
        partyPhone: (loanData.partyPhone || loanData.phoneNumber || '').trim(),
        type: loanData.type || 'BORROWED',
        principalAmount: Number(loanData.principalAmount) || 0,
        monthlyEmi: Number(loanData.monthlyEmi) || 0,
        dueDayOfMonth: Number(loanData.dueDayOfMonth) || 1,
        startDate: loanData.startDate || Date.now(),
        dueDate: loanData.dueDate || null,
        notes: (loanData.notes || '').trim(),
        isSettled: false
      },
      repayments: []
    };

    setData(prev => {
      const nextData = {
        ...prev,
        loans: [newLoan, ...prev.loans]
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  const deleteLoan = useCallback((loanId) => {
    setData(prev => {
      const nextData = {
        ...prev,
        loans: prev.loans.filter(item => {
          const id = item.loan ? item.loan.id : item.id;
          return id !== loanId;
        })
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  const settleLoan = useCallback((loanId, isSettled) => {
    setData(prev => {
      const nextData = {
        ...prev,
        loans: prev.loans.map(item => {
          const id = item.loan ? item.loan.id : item.id;
          if (id === loanId) {
            if (item.loan) {
              return { ...item, loan: { ...item.loan, isSettled } };
            }
            return { ...item, isSettled };
          }
          return item;
        })
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  const addLoanRepayment = useCallback((loanId, repData) => {
    const newRep = {
      id: crypto.randomUUID ? crypto.randomUUID() : `rep_${Date.now()}`,
      loanId,
      amount: Number(repData.amount) || 0,
      paymentDate: repData.paymentDate || Date.now(),
      notes: (repData.notes || '').trim()
    };

    setData(prev => {
      const nextData = {
        ...prev,
        loans: prev.loans.map(item => {
          const id = item.loan ? item.loan.id : item.id;
          if (id === loanId) {
            return {
              ...item,
              repayments: [...(item.repayments || []), newRep]
            };
          }
          return item;
        })
      };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  // Currency Update
  const updateCurrency = useCallback((symbol, code) => {
    setData(prev => {
      const nextData = { ...prev, currencyCode: code, currencySymbol: symbol };
      syncWithDrive(nextData);
      return nextData;
    });
  }, [syncWithDrive]);

  // Export JSON (Standalone offline backup)
  const exportBackupJson = useCallback(() => {
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myfinhub_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [data]);

  // Import JSON backup
  const importBackupJson = useCallback((jsonStringOrFile) => {
    try {
      const text = typeof jsonStringOrFile === 'string' ? jsonStringOrFile : '';
      const parsed = JSON.parse(text);
      if (!parsed.transactions && !parsed.loans && !parsed.bankAccounts) {
        return { success: false, error: 'Unrecognized My Fin Hub backup JSON format.' };
      }

      const txList = Array.isArray(parsed.transactions) ? parsed.transactions : [];
      const accList = Array.isArray(parsed.bankAccounts) ? parsed.bankAccounts : [];
      const loanList = Array.isArray(parsed.loans) ? parsed.loans : [];

      setData({
        appVersion: parsed.appVersion || '1.0.0',
        backupTimestamp: parsed.backupTimestamp || Date.now(),
        currencyCode: parsed.currencyCode || 'INR',
        currencySymbol: parsed.currencySymbol || '₹',
        transactions: txList,
        loans: loanList,
        bankAccounts: accList
      });

      return {
        success: true,
        txCount: txList.length,
        accCount: accList.length,
        loanCount: loanList.length
      };
    } catch (err) {
      return { success: false, error: err.message || 'Failed to parse JSON file' };
    }
  }, []);

  return (
    <FinHubContext.Provider
      value={{
        data,
        transactions: data.transactions || [],
        bankAccounts: data.bankAccounts || [],
        bankAccountsWithBalance,
        accountsWithBalances: bankAccountsWithBalance,
        totalBankBalance,
        loansWithSummary,
        loans: data.loans || [],
        selectedMonthKey,
        setSelectedMonthKey,
        currencySymbol: data.currencySymbol || '₹',
        currencyCode: data.currencyCode || 'INR',
        user,
        googleUser: user,
        clientId: driveService.getClientId(),
        saveClientId,
        syncStatus,
        syncMessage,
        lastSyncTime,
        loginWithGoogle,
        logoutFromGoogle,
        login: loginWithGoogle,
        logout: logoutFromGoogle,
        syncWithDrive,
        syncToDrive: syncWithDrive,
        restoreFromDrive,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addBankAccount,
        updateBankAccount,
        adjustAccountBalance,
        deleteBankAccount,
        payCreditCardBill,
        addLoan,
        deleteLoan,
        settleLoan,
        addLoanRepayment,
        updateCurrency,
        exportBackupJson,
        exportJson: exportBackupJson,
        importBackupJson,
        importJson: importBackupJson
      }}
    >
      {children}
    </FinHubContext.Provider>
  );
}

export function useFinHub() {
  const context = useContext(FinHubContext);
  if (!context) throw new Error('useFinHub must be used within a FinHubProvider');
  return context;
}
