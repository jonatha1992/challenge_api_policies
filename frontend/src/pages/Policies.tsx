// Página de listado y gestión de pólizas
// Permite filtrar, paginar y generar insights sobre el portfolio

import { useState, useEffect, useCallback } from 'react';
import { getPolicies, getInsights, Policy, InsightsResponse } from '../services/api';

/**
 * Componente Policies - Página principal para visualizar y gestionar pólizas
 * Incluye filtros, paginación, tabla de datos y generación de insights con IA
 */
export const Policies = () => {
  // Estado para almacenar la lista de pólizas
  const [policies, setPolicies] = useState<Policy[]>([]);

  // Estado para información de paginación
  const [pagination, setPagination] = useState({ limit: 25, offset: 0, total: 0 });

  // Estado para filtros aplicados
  const [filters, setFilters] = useState({ status: '', policy_type: '', q: '' });

  // Estado de carga para mostrar indicadores de progreso
  const [loading, setLoading] = useState(false);

  // Estado para insights generados por IA
  const [insights, setInsights] = useState<InsightsResponse | null>(null);

  // Estado de carga específico para insights
  const [insightsLoading, setInsightsLoading] = useState(false);

  /**
   * Función para obtener pólizas del servidor con filtros y paginación
   * Se ejecuta cuando cambian los filtros o la paginación
   */
  const fetchPolicies = useCallback(async () => {
    // Activar estado de carga
    setLoading(true);

    try {
      // Construir parámetros para la API incluyendo solo filtros no vacíos
      const params = {
        limit: pagination.limit,
        offset: pagination.offset,
        ...(filters.status && { status: filters.status }),           // Incluir status si está definido
        ...(filters.policy_type && { policy_type: filters.policy_type }), // Incluir tipo si está definido
        ...(filters.q && { q: filters.q })                          // Incluir búsqueda si está definida
      };

      // Llamar a la API para obtener pólizas
      const response = await getPolicies(params);

      // Actualizar estado con los resultados
      setPolicies(response.items);
      setPagination(response.pagination);
    } catch (error) {
      // Log de error (en producción podría mostrar mensaje al usuario)
      console.error('Error fetching policies:', error);
    } finally {
      // Desactivar estado de carga
      setLoading(false);
    }
  }, [pagination.limit, pagination.offset, filters]);

  // Efecto para cargar pólizas cuando cambian los filtros o paginación
  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  /**
   * Maneja cambios en los filtros
   * Reinicia el offset de paginación para mostrar resultados desde el inicio
   */
  const handleFilterChange = (key: string, value: string) => {
    // Actualizar filtro específico
    setFilters(prev => ({ ...prev, [key]: value }));

    // Reiniciar paginación al cambiar filtros
    setPagination(prev => ({ ...prev, offset: 0 }));
  };

  /**
   * Maneja la generación de insights usando IA
   * Aplica los mismos filtros que están activos en la vista
   */
  const handleGenerateInsights = async () => {
    // Activar estado de carga de insights
    setInsightsLoading(true);

    try {
      // Construir filtros para insights (iguales a los de la vista actual)
      const insightFilters = {
        ...(filters.status && { status: filters.status }),
        ...(filters.policy_type && { policy_type: filters.policy_type }),
        ...(filters.q && { q: filters.q })
      };

      // Llamar a la API para generar insights
      const result = await getInsights(insightFilters);

      // Establecer resultado de insights
      setInsights(result);
    } catch (error) {
      // Log de error
      console.error('Error generating insights:', error);
    } finally {
      // Desactivar estado de carga
      setInsightsLoading(false);
    }
  };

  /**
   * Maneja navegación a página anterior
   * Decrementa el offset por el límite de página
   */
  const handlePrev = () => {
    setPagination(prev => ({
      ...prev,
      offset: Math.max(0, prev.offset - prev.limit)  // No permitir offset negativo
    }));
  };

  /**
   * Maneja navegación a página siguiente
   * Incrementa el offset por el límite de página
   */
  const handleNext = () => {
    setPagination(prev => ({
      ...prev,
      offset: prev.offset + prev.limit
    }));
  };

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

  return (
    <div className="policies-page">
      {/* Encabezado de la página */}
      <div className="page-header">
        <h1>Policies</h1>
        <p>Manage and view your insurance policies</p>
      </div>

      {/* Sección de filtros */}
      <div className="filters-section">
        <div className="filters">
          {/* Filtro por estado */}
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Filtro por tipo de póliza */}
          <div className="filter-group">
            <label>Type</label>
            <select
              value={filters.policy_type}
              onChange={(e) => handleFilterChange('policy_type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="Property">Property</option>
              <option value="Auto">Auto</option>
              <option value="Life">Life</option>
              <option value="Health">Health</option>
            </select>
          </div>

          {/* Filtro de búsqueda por texto */}
          <div className="filter-group">
            <label>Search</label>
            <input
              type="text"
              placeholder="Search by policy number or customer..."
              value={filters.q}
              onChange={(e) => handleFilterChange('q', e.target.value)}
            />
          </div>

          {/* Acciones de filtro */}
          <div className="filter-actions">
            <button
              onClick={handleGenerateInsights}
              disabled={insightsLoading}
              className="btn btn-insights"
            >
              {insightsLoading ? (
                // Estado de carga con spinner
                <>
                  <span className="loading-spinner" style={{ width: 18, height: 18, marginBottom: 0 }}></span>
                  Generating...
                </>
              ) : (
                // Estado normal con icono
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Generate Insights
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Panel de insights si existen */}
      {insights && (
        <div className="insights-panel">
          {/* Encabezado del panel de insights */}
          <div className="insights-header">
            <h3>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI-Powered Insights
            </h3>
            {/* Botón para cerrar el panel */}
            <button className="insights-close" onClick={() => setInsights(null)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Métricas destacadas de los insights */}
          <div className="insights-highlights">
            <div className="highlight">
              <span className="highlight-label">Total Policies</span>
              <span className="highlight-value">{insights.highlights.total_policies}</span>
            </div>
            <div className="highlight">
              <span className="highlight-label">Risk Flags</span>
              <span className="highlight-value">{insights.highlights.risk_flags}</span>
            </div>
            <div className="highlight">
              <span className="highlight-label">Recommendations</span>
              <span className="highlight-value">{insights.highlights.recommendations_count}</span>
            </div>
          </div>

          {/* Lista de insights detallados */}
          <ul className="insights-list">
            {insights.insights.map((insight, idx) => (
              <li key={idx}>{insight}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Contenido condicional: loading o tabla */}
      {loading ? (
        // Estado de carga
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading policies...</p>
        </div>
      ) : (
        // Tabla de pólizas
        <div className="table-container">
          <table className="policies-table">
            <thead>
              <tr>
                <th>Policy Number</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Premium (USD)</th>
                <th>Insured Value (USD)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.length === 0 ? (
                // Estado vacío cuando no hay pólizas
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3>No policies found</h3>
                      <p>Try adjusting your filters or upload some policies</p>
                    </div>
                  </td>
                </tr>
              ) : (
                // Renderizar filas de pólizas
                policies.map((policy) => (
                  <tr key={policy.id}>
                    <td><strong>{policy.policy_number}</strong></td>
                    <td>{policy.customer}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        padding: '0.25rem 0.5rem',
                        background: 'var(--gray-100)',
                        borderRadius: '4px',
                        fontSize: '0.85rem'
                      }}>
                        {policy.policy_type}
                      </span>
                    </td>
                    <td>{formatCurrency(policy.premium_usd)}</td>
                    <td>{formatCurrency(policy.insured_value_usd)}</td>
                    <td>
                      <span className={`status-badge status-${policy.status}`}>
                        {policy.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Controles de paginación si hay pólizas */}
          {policies.length > 0 && (
            <div className="pagination">
              <div className="pagination-buttons">
                <button onClick={handlePrev} disabled={pagination.offset === 0}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
              </div>

              {/* Información de paginación */}
              <span className="pagination-info">
                Showing {pagination.offset + 1} - {Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
              </span>

              <div className="pagination-buttons">
                <button
                  onClick={handleNext}
                  disabled={pagination.offset + pagination.limit >= pagination.total}
                >
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16 }}>
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
