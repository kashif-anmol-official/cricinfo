import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { MatchProvider } from './context/MatchContext';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MatchProvider>
      <App />
    </MatchProvider>
  </React.StrictMode>
);
