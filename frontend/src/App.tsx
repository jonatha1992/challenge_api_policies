// Componente principal de la aplicación React
// Configura el enrutamiento y la estructura general de la interfaz

import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Upload } from './pages/Upload';
import { Policies } from './pages/Policies';
import { Summary } from './pages/Summary';
import { useBackendHealth } from './hooks/useBackendHealth';

/**
 * Componente App - Punto de entrada de la aplicación
 * Define la estructura general con navegación y enrutamiento
 */
function App() {
  const { isHealthy, error, isChecking } = useBackendHealth();

  // Mostrar estado de carga mientras verificamos el backend
  if (isChecking) {
    return (
      <div className="app" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div className="loading-spinner" style={{ width: 48, height: 48 }}></div>
        <p>Checking backend connection...</p>
      </div>
    );
  }

  // Mostrar error si el backend no está disponible
  if (!isHealthy) {
    return (
      <div className="app" style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        padding: '20px'
      }}>
        <div className="error-message" style={{
          maxWidth: '600px',
          display: 'flex',
          alignItems: 'start',
          gap: '16px',
          padding: '24px',
          background: '#fee',
          border: '2px solid #c33',
          borderRadius: '8px'
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 48, height: 48, flexShrink: 0, color: '#c33' }}>
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h2 style={{ margin: '0 0 8px 0', color: '#c33' }}>Backend Connection Error</h2>
            <p style={{ margin: '0 0 16px 0' }}>{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
              style={{ marginTop: '16px' }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    // BrowserRouter habilita el enrutamiento del lado cliente
    <BrowserRouter>
      <div className="app">
        {/* Barra de navegación superior */}
        <nav className="navbar">
          {/* Logo y nombre de la aplicación */}
          <NavLink to="/" className="navbar-brand">
            {/* Icono SVG de escudo de seguridad */}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Policy Manager
          </NavLink>

          {/* Enlaces de navegación principales */}
          <div className="navbar-links">
            {/* Enlace a página de carga de archivos */}
            <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
              {/* Icono SVG de subida de archivo */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload
            </NavLink>

            {/* Enlace a página de listado de pólizas */}
            <NavLink to="/policies" className={({ isActive }) => isActive ? 'active' : ''}>
              {/* Icono SVG de documento */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Policies
            </NavLink>

            {/* Enlace a página de resumen estadístico */}
            <NavLink to="/summary" className={({ isActive }) => isActive ? 'active' : ''}>
              {/* Icono SVG de gráfico de barras */}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Summary
            </NavLink>
          </div>
        </nav>

        {/* Contenido principal de la aplicación */}
        <main className="main-content">
          {/* Definición de rutas de la aplicación */}
          <Routes>
            {/* Ruta raíz - Página de carga de archivos */}
            <Route path="/" element={<Upload />} />

            {/* Ruta de pólizas - Listado y filtros */}
            <Route path="/policies" element={<Policies />} />

            {/* Ruta de resumen - Estadísticas del portfolio */}
            <Route path="/summary" element={<Summary />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
