import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { driveService } from '../services/driveService';

const KhataContext = createContext(null);

const STORAGE_KEY = 'personal_khata_local_data';
const LAST_SYNC_KEY = 'personal_khata_last_sync_time';

export function KhataProvider({ children }) {
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

      const openingBal = Number(acc.openingBalance ?? acc.initialBalance) || 0;
      const liveBal = openingBal + incomes - expenses;

      return {
        id: acc.id,
        name: acc.name || acc.accountName || 'Unnamed Account',
        accountName: acc.name || acc.accountName || 'Unnamed Account',
        bankName: acc.bankName || '',
        accountNumber: acc.accountNumber || '',
        openingBalance: openingBal,
        initialBalance: openingBal,
        incomes,
        expenses,
        isLiability: !!acc.isLiability || openingBal < 0 || acc.accountType === 'CREDIT_CARD',
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
    setSyncMessage('Syncing to Google Drive folder "Personal Khata Book"...');

    try {
      const payloadToSave = customPayload || {
        ...data,
        backupTimestamp: Date.now(),
      };

      await driveService.uploadKhataData(payloadToSave);
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
      const remoteData = await driveService.downloadKhataData();
      if (!remoteData) {
        // No remote backup file in Drive yet: initialize the Google Drive folder & file automatically!
        setSyncMessage('Initializing Personal Khata Book in your Google Drive...');
        await driveService.uploadKhataData({
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
  }, []);

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

  // Bank Account CRUD & Live Balance Adjustment
  const addBankAccount = useCallback((acc) => {
    const rawBal = Number(acc.openingBalance ?? acc.initialBalance) || 0;
    const newAcc = {
      id: crypto.randomUUID ? crypto.randomUUID() : `acc_${Date.now()}`,
      name: (acc.name || acc.accountName || '').trim(),
      bankName: (acc.bankName || '').trim(),
      accountNumber: (acc.accountNumber || '').trim(),
      openingBalance: rawBal,
      isLiability: acc.isLiability !== undefined ? !!acc.isLiability : rawBal < 0,
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
            const openBal = fields.openingBalance !== undefined
              ? Number(fields.openingBalance)
              : fields.initialBalance !== undefined
                ? Number(fields.initialBalance)
                : a.openingBalance;

            return {
              ...a,
              ...fields,
              id: a.id,
              name: (fields.name || fields.accountName || a.name || '').trim(),
              bankName: (fields.bankName !== undefined ? fields.bankName : (a.bankName || '')).trim(),
              accountNumber: (fields.accountNumber !== undefined ? fields.accountNumber : (a.accountNumber || '')).trim(),
              openingBalance: openBal,
              isLiability: fields.isLiability !== undefined ? !!fields.isLiability : (openBal < 0 || a.isLiability),
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

  // Directly adjust the available live balance of an account
  const adjustAccountBalance = useCallback((accountId, newTargetBalance) => {
    const target = Number(newTargetBalance) || 0;
    setData(prev => {
      const transactions = prev.transactions || [];
      const account = (prev.bankAccounts || []).find(a => a.id === accountId);
      if (!account) return prev;

      const accName = account.name || account.accountName || '';
      const incomes = transactions
        .filter(t => (t.accountId === accountId || (!t.accountId && t.accountName === accName)) && t.type === 'INCOME')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const expenses = transactions
        .filter(t => (t.accountId === accountId || (!t.accountId && t.accountName === accName)) && t.type === 'EXPENSE')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

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
    a.download = `personal_khata_backup_${new Date().toISOString().slice(0, 10)}.json`;
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
        return { success: false, error: 'Unrecognized Khata Book backup JSON format.' };
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
    <KhataContext.Provider
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
    </KhataContext.Provider>
  );
}

export function useKhata() {
  const context = useContext(KhataContext);
  if (!context) throw new Error('useKhata must be used within a KhataProvider');
  return context;
}
