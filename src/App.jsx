import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import LoansView from './components/LoansView';
import ReportsView from './components/ReportsView';
import AddTransactionModal from './components/AddTransactionModal';
import BankAccountsModal from './components/BankAccountsModal';
import SettingsModal from './components/SettingsModal';
import LoginScreen from './components/LoginScreen';
import { useKhata } from './context/KhataContext';
import { Plus } from 'lucide-react';

export default function App() {
  const { user } = useKhata();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'loans' | 'reports'

  // Standalone offline override state (if user explicitly clicks 'Use Offline Mode')
  const [isOfflineMode, setIsOfflineMode] = useState(() => {
    return localStorage.getItem('khata_use_offline_mode') === 'true';
  });

  // Modal visibility states
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [txInitialData, setTxInitialData] = useState(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [bankAccountToEdit, setBankAccountToEdit] = useState(null);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // If user is NOT connected to Google Drive and has NOT chosen offline mode,
  // show the Google Login screen by default!
  if (!user && !isOfflineMode) {
    return (
      <LoginScreen
        onContinueOffline={() => {
          setIsOfflineMode(true);
          localStorage.setItem('khata_use_offline_mode', 'true');
        }}
      />
    );
  }

  const handleOpenAddTx = (type = 'EXPENSE') => {
    setTxInitialData({ type });
    setIsAddTxOpen(true);
  };

  const handleEditTx = (tx) => {
    setTxInitialData(tx);
    setIsAddTxOpen(true);
  };

  const handleOpenBankAccounts = (acc = null) => {
    setBankAccountToEdit(acc);
    setIsBankModalOpen(true);
  };

  const handleOpenLogin = () => {
    setIsOfflineMode(false);
    localStorage.removeItem('khata_use_offline_mode');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-gray-900 pb-20 sm:pb-8">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenBankAccounts={() => handleOpenBankAccounts(null)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenConnectDrive={handleOpenLogin}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {activeTab === 'dashboard' && (
          <Dashboard
            onOpenAddTransaction={handleOpenAddTx}
            onEditTransaction={handleEditTx}
            onOpenBankAccounts={handleOpenBankAccounts}
          />
        )}

        {activeTab === 'loans' && <LoansView />}

        {activeTab === 'reports' && <ReportsView />}
      </main>

      {/* Floating Action Button for Quick Add (Mobile & Desktop) */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => handleOpenAddTx('EXPENSE')}
          className="flex items-center gap-2 px-5 py-3.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full shadow-lg shadow-emerald-700/30 font-bold text-sm transition-all hover:scale-105 active:scale-95"
          title="Add New Transaction"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span className="hidden sm:inline">Add Entry</span>
        </button>
      </div>

      {/* Modals */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        onClose={() => {
          setIsAddTxOpen(false);
          setTxInitialData(null);
        }}
        initialData={txInitialData}
      />

      <BankAccountsModal
        isOpen={isBankModalOpen}
        onClose={() => {
          setIsBankModalOpen(false);
          setBankAccountToEdit(null);
        }}
        initialAccountToEdit={bankAccountToEdit}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
}
