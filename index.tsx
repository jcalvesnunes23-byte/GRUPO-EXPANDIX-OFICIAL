
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Could not find root element to mount to");

const root = ReactDOM.createRoot(rootElement);

/**
 * Gerencia a transição de saída da tela de carregamento.
 * Esperamos a renderização inicial e aplicamos a animação de scale e fade.
 */
const hideLoader = () => {
  const loader = document.getElementById('root-loading');
  if (loader) {
    // Aplica animação de saída definida no CSS
    loader.style.animation = 'loader-exit 1s cubic-bezier(0.19, 1, 0.22, 1) forwards';
    
    // Remove o elemento após a conclusão da animação
    setTimeout(() => {
      loader.remove();
    }, 1000);
  }
};

// Renderização inicial
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Aguarda o app estar "pronto" (renderizado) para disparar a animação de saída.
// Aumentamos levemente o tempo para garantir que a marca seja vista e o sistema esteja estável.
window.addEventListener('load', () => {
  setTimeout(hideLoader, 2000); // 2 segundos de loading para impacto de marca
});

// Fallback caso o evento load já tenha passado
if (document.readyState === 'complete') {
  setTimeout(hideLoader, 2000);
}
