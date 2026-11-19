import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import { PIECE_DEFS } from './lib/pieces.js';
import { initReveal } from './lib/reveal.js';
import './styles.css';

// Градиенты фигур — один раз на страницу
document.body.insertAdjacentHTML('afterbegin', PIECE_DEFS);

// HashRouter: адреса вида /#/tournaments работают на любом статическом сервере без настройки
createRoot(document.getElementById('root')).render(
  <HashRouter>
    <AuthProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </AuthProvider>
  </HashRouter>,
);

initReveal(document.body);
