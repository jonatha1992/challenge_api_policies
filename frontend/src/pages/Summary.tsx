// Página de resumen del portfolio de pólizas
// Muestra estadísticas agregadas y métricas clave del negocio

import { useState, useEffect } from 'react';
import { getSummary, PolicySummary } from '../services/api';

/**
 * Componente Summary - Página de dashboard con métricas del portfolio
 * Muestra estadísticas agregadas de pólizas, primas y distribución por tipos
 */
export const Summary = () => {
  // Estado para almacenar el resumen del portfolio
  const [summary, setSummary] = useState<PolicySummary | null>(null);

  // Estado de carga para mostrar indicadores de progreso
  const [loading, setLoading] = useState(true);

  // Estado de error para mostrar mensajes de fallo
  const [error, setError] = useState<string | null>(null);

  // Efecto para cargar el resumen al montar el componente
  useEffect(() => {
    /**
     * Función asíncrona que obtiene el resumen del portfolio
     */
    const fetchSummary = async () => {
      try {
        // Llamar a la API para obtener estadísticas
        const data = await getSummary();

        // Establecer datos del resumen
        setSummary(data);
      } catch (err) {
        // Log de error y mensaje para usuario
        console.error('Error fetching summary:', err);
        setError('Failed to load summary');
      } finally {
        // Desactivar estado de carga (siempre se ejecuta)
        setLoading(false);
      }
    };

    // Ejecutar la función de carga
    fetchSummary();
  }, []); // Array de dependencias vacío - solo se ejecuta una vez

  /**
   * Formatea un número como moneda en USD
   * @param value Valor numérico a formatear
   * @returns String formateado como moneda
   */
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,  // Sin decimales mínimos
      maximumFractionDigits: 0   // Sin decimales máximos
    }).format(value);
  };

  // Renderizado condicional: estado de carga
  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading summary...</p>
      </div>
    );
  }

  // Renderizado condicional: estado de error
  if (error) {
    return (
      <div className="error-message">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </div>
    );
  }

  // Renderizado condicional: estado vacío (sin datos)
  if (!summary) {
    return (
      <div className="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3>No data available</h3>
        <p>Upload some policies to see the summary</p>
      </div>
    );
  }

  // Renderizado principal: dashboard con métricas
  return (
    <div className="summary-page">
      {/* Encabezado de la página */}
      <div className="page-header">
        <h1>Portfolio Summary</h1>
        <p>Overview of your insurance portfolio</p>
      </div>

      {/* Grid de tarjetas de métricas principales */}
      <div className="summary-grid">
        {/* Tarjeta: Total de pólizas */}
        <div className="summary-card">
          <div className="summary-card-icon primary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="summary-card-content">
            <h3>Total Policies</h3>
            <p className="value">{summary.total_policies.toLocaleString()}</p>
          </div>
        </div>

        {/* Tarjeta: Prima total */}
        <div className="summary-card">
          <div className="summary-card-icon secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="summary-card-content">
            <h3>Total Premium</h3>
            <p className="value">{formatCurrency(summary.total_premium_usd)}</p>
          </div>
        </div>

        {/* Tarjeta: Pólizas activas */}
        <div className="summary-card">
          <div className="summary-card-icon success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="summary-card-content">
            <h3>Active Policies</h3>
            <p className="value">{(summary.count_by_status['active'] || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Tarjeta: Pólizas expiradas/canceladas */}
        <div className="summary-card">
          <div className="summary-card-icon warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="summary-card-content">
            <h3>Expired/Cancelled</h3>
            <p className="value">
              {((summary.count_by_status['expired'] || 0) + (summary.count_by_status['cancelled'] || 0)).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Sección: Distribución por estado */}
      <div className="section">
        <div className="section-header">
          <h2>Policies by Status</h2>
        </div>
        <div className="section-content">
          <div className="status-grid">
            {/* Renderizar cada estado con su conteo */}
            {Object.entries(summary.count_by_status).map(([status, count]) => (
              <div key={status} className="status-card">
                <span className="label">
                  <span className={`status-badge status-${status}`} style={{ marginRight: '0.5rem' }}>
                    {status}
                  </span>
                </span>
                <span className="value">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sección: Prima por tipo de póliza */}
      <div className="section">
        <div className="section-header">
          <h2>Premium by Policy Type</h2>
        </div>
        <div className="section-content">
          <div className="type-grid">
            {/* Renderizar cada tipo con su prima total */}
            {Object.entries(summary.premium_by_type).map(([type, premium]) => (
              <div key={type} className="type-card">
                <span className="label">
                  {/* Icono específico para cada tipo de póliza */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: '0.5rem', opacity: 0.6 }}>
                    {type === 'Property' && <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />}
                    {type === 'Auto' && <path d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />}
                    {type === 'Life' && <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />}
                    {type === 'Health' && <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
                  </svg>
                  {type}
                </span>
                <span className="value">{formatCurrency(premium)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

