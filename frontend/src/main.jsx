import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

const fileHelpHtml =
  '<div class="p-8 max-w-lg mx-auto bg-surface text-on-surface">' +
  '<h1 class="text-xl font-bold bg-gradient-to-r from-primary to-secondary text-transparent bg-clip-text mb-4">NutriScan must run through the dev server</h1>' +
  '<p class="text-on-surface-variant mb-4">Opening the HTML file directly does not run Vite.</p>' +
  '<p class="mb-4"><strong>Terminal</strong> (in <code class="bg-surface-container px-2 py-1 rounded">frontend</code>):</p>' +
  '<pre class="bg-surface-container p-4 rounded-xl overflow-auto mb-4"><code>npm install\nnpm run dev</code></pre>' +
  '<p class="text-on-surface-variant mt-4">Then open <strong class="text-primary">http://localhost:5173</strong></p>' +
  '</div>';

if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
  const el = document.getElementById('root');
  if (el) el.innerHTML = fileHelpHtml;
} else {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}
