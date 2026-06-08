const fileHelpHtml =
  '<div style="font-family:system-ui,sans-serif;padding:2rem;max-width:36rem;line-height:1.6;background:#0a0a0b;color:#fafafa">' +
  '<h1 style="font-size:1.25rem;margin:0 0 1rem">NutriScan must run through the dev server</h1>' +
  '<p style="margin:0 0 1rem;color:#a1a1aa">Opening the HTML file directly does not run Vite.</p>' +
  '<p style="margin:0"><strong>Terminal</strong> (in <code style="background:#141416;padding:2px 6px;border-radius:4px">frontend</code>):</p>' +
  '<pre style="background:#141416;padding:1rem;border-radius:8px;overflow:auto;margin:1rem 0"><code>npm install\nnpm run dev</code></pre>' +
  '<p style="margin:0;color:#a1a1aa">Or from project root run <code style="background:#141416;padding:2px 6px;border-radius:4px">run-dev.bat</code>.</p>' +
  '<p style="margin:0;color:#a1a1aa">Then open <strong>http://localhost:5173</strong></p>' +
  '</div>';

const staticServerHelpHtml =
  '<div style="font-family:system-ui,sans-serif;padding:2rem;max-width:40rem;line-height:1.6;background:#0a0a0b;color:#fafafa">' +
  '<h1 style="font-size:1.25rem;margin:0 0 1rem">NutriScan source files were opened without Vite</h1>' +
  '<p style="margin:0 0 1rem;color:#a1a1aa">This app uses JSX and Vite transforms, so plain static servers can show a blank page.</p>' +
  '<p style="margin:0"><strong>Run with Vite:</strong></p>' +
  '<pre style="background:#141416;padding:1rem;border-radius:8px;overflow:auto;margin:1rem 0"><code>npm install\nnpm run dev</code></pre>' +
  '<p style="margin:0;color:#a1a1aa">Or from project root: <code style="background:#141416;padding:2px 6px;border-radius:4px">run-dev.bat</code></p>' +
  '<p style="margin:1rem 0 0;color:#a1a1aa">Then open the Local URL shown by Vite.</p>' +
  '</div>';

function renderHelp(html) {
  const root = document.getElementById('root');
  if (root) root.innerHTML = html;
}

if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
  renderHelp(fileHelpHtml);
} else {
  import('./main.jsx').catch((err) => {
    console.error('Failed to bootstrap app. Use Vite dev server.', err);
    renderHelp(staticServerHelpHtml);
  });
}
