// Punto de entrada principal de la aplicación React
// Configura y monta la aplicación en el DOM

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { validateEnvOrThrow } from './config/validateEnv'

// Validar variables de entorno antes de inicializar la aplicación
try {
  validateEnvOrThrow();
} catch (error) {
  console.error(error);
  // Mostrar error visual en el DOM
  document.getElementById('root')!.innerHTML = `
    <div style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <div style="
        max-width: 600px;
        padding: 32px;
        background: #fee;
        border: 2px solid #c33;
        border-radius: 8px;
      ">
        <h1 style="color: #c33; margin: 0 0 16px 0;">Configuration Error</h1>
        <p>Missing required environment variables.</p>
        <p>Please check the browser console for details.</p>
      </div>
    </div>
  `;
  throw error;
}

// Obtener el elemento raíz del DOM donde se montará la aplicación
const rootElement = document.getElementById('root');

// Verificar que el elemento raíz existe (TypeScript non-null assertion)
if (!rootElement) {
  throw new Error('Root element not found');
}

// Crear el root de React para el modo concurrente
const root = ReactDOM.createRoot(rootElement);

// Renderizar la aplicación dentro de StrictMode para desarrollo
// StrictMode ayuda a detectar problemas potenciales en el código
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
