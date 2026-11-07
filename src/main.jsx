import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { FinHubProvider } from './context/FinHubContext';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FinHubProvider>
        <App />
      </FinHubProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
