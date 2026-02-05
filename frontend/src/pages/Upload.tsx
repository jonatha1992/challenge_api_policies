// Página de carga de archivos CSV con pólizas
// Permite subir archivos, mostrar progreso y resultados de validación

import { useState, useRef } from 'react';
import { uploadCSV, UploadResult } from '../services/api';

/**
 * Componente Upload - Página principal para carga de pólizas
 * Maneja la selección de archivos, drag & drop, subida y visualización de resultados
 */
export const Upload = () => {
  // Estado para el archivo seleccionado
  const [file, setFile] = useState<File | null>(null);

  // Estado de carga para mostrar indicadores de progreso
  const [loading, setLoading] = useState(false);

  // Resultado de la subida (éxito, estadísticas, errores)
  const [result, setResult] = useState<UploadResult | null>(null);

  // Mensaje de error si la subida falla
  const [error, setError] = useState<string | null>(null);

  // Estado visual para drag & drop
  const [dragover, setDragover] = useState(false);

  // Referencia al input de archivo para control programático
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Maneja el cambio de archivo cuando el usuario selecciona uno
   * Reinicia estados de resultado y error
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Verificar que hay archivos seleccionados
    if (e.target.files && e.target.files[0]) {
      // Establecer el archivo seleccionado
      setFile(e.target.files[0]);

      // Limpiar resultados anteriores y errores
      setResult(null);
      setError(null);
    }
  };

  /**
   * Maneja el evento drag over para mostrar feedback visual
   * Previene el comportamiento por defecto del navegador
   */
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();  // Prevenir comportamiento por defecto
    setDragover(true);   // Activar estado visual de drag
  };

  /**
   * Maneja cuando el cursor sale del área de drop
   * Desactiva el estado visual de drag
   */
  const handleDragLeave = () => {
    setDragover(false);  // Desactivar estado visual de drag
  };

  /**
   * Maneja el evento drop cuando se suelta un archivo
   * Valida que sea un archivo CSV y lo establece como seleccionado
   */
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();        // Prevenir comportamiento por defecto
    setDragover(false);        // Desactivar estado visual de drag

    // Verificar que hay archivos en el drop
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];

      // Validar que el archivo tenga extensión CSV
      if (droppedFile.name.endsWith('.csv')) {
        // Establecer archivo y limpiar estados anteriores
        setFile(droppedFile);
        setResult(null);
        setError(null);
      } else {
        // Mostrar error si no es CSV
        setError('Please upload a CSV file');
      }
    }
  };

  /**
   * Maneja la subida del archivo al servidor
   * Realiza la llamada a la API y maneja errores
   */
  const handleUpload = async () => {
    // Verificar que hay un archivo seleccionado
    if (!file) return;

    // Activar estado de carga
    setLoading(true);
    setError(null);  // Limpiar errores anteriores

    try {
      // Llamar a la API para subir el archivo
      const uploadResult = await uploadCSV(file);

      // Establecer resultado exitoso
      setResult(uploadResult);
    } catch (err: unknown) {
      // Manejo de errores con type narrowing
      if (err && typeof err === 'object' && 'response' in err) {
        // Error de Axios con respuesta del servidor
        const axiosError = err as { response?: { data?: { error?: string } } };
        setError(axiosError.response?.data?.error || 'Upload failed');
      } else if (err instanceof Error) {
        // Error genérico de JavaScript
        setError(err.message);
      } else {
        // Error desconocido
        setError('An unknown error occurred');
      }
    } finally {
      // Desactivar estado de carga (siempre se ejecuta)
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
      {/* Encabezado de la página */}
      <div className="page-header">
        <h1>Upload Policies</h1>
        <p>Import your policy data from a CSV file</p>
      </div>

      {/* Área de drop para archivos */}
      <div
        className={`upload-section ${dragover ? 'dragover' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Icono de subida */}
        <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>

        {/* Texto descriptivo */}
        <h3>Drop your CSV file here</h3>
        <p>or click to browse from your computer</p>

        {/* Input oculto para selección de archivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disabled={loading}
          id="file-upload"
        />

        {/* Controles de acción */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
          {/* Botón para seleccionar archivo */}
          <label htmlFor="file-upload" className="file-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
              <path d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
            Choose File
          </label>

          {/* Botón de subida */}
          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || loading}  // Deshabilitado si no hay archivo o está cargando
          >
            {loading ? (
              // Estado de carga con spinner
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18, marginBottom: 0 }}></span>
                Uploading...
              </>
            ) : (
              // Estado normal
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 18, height: 18 }}>
                  <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload
              </>
            )}
          </button>
        </div>

        {/* Información del archivo seleccionado */}
        {file && (
          <p className="file-name">
            <strong>Selected:</strong> {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>
        )}
      </div>

      {/* Mensaje de error si existe */}
      {error && (
        <div className="error-message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Resultados de la subida si existe */}
      {result && (
        <div className="result-section">
          {/* Encabezado del resultado - varía según el código HTTP */}
          <div className={`result-header ${
            result.http_status === 422 ? 'all-rejected' :
            result.http_status === 207 ? 'has-errors' :
            ''
          }`}>
            {/* Icono y mensaje según el código HTTP */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {result.http_status === 200 && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32, color: '#22c55e' }}>
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {result.http_status === 207 && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32, color: '#f59e0b' }}>
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              )}
              {result.http_status === 422 && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 32, height: 32, color: '#ef4444' }}>
                  <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div>
                <h2>
                  {result.http_status === 200 && 'Upload Successful!'}
                  {result.http_status === 207 && 'Upload Completed with Warnings'}
                  {result.http_status === 422 && 'All Rows Rejected'}
                </h2>
                <p>
                  {result.http_status === 200 && `All ${result.inserted_count + result.updated_count} policies processed successfully`}
                  {result.http_status === 207 && `${result.inserted_count + result.updated_count} processed, ${result.rejected_count} rejected`}
                  {result.http_status === 422 && `All ${result.rejected_count} rows failed validation - nothing was saved`}
                </p>
                {result.http_status !== 422 && (
                  <p style={{ fontSize: '0.9rem', marginTop: '4px', opacity: 0.9 }}>
                    {result.inserted_count} new policies imported, {result.updated_count} updated
                    {result.rejected_count > 0 && `, ${result.rejected_count} rejected`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Alerta de duplicados actualizados */}
          {result.updated_count > 0 && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '1px solid #ffc107',
              borderRadius: '8px',
              padding: '16px',
              marginTop: '16px',
              display: 'flex',
              alignItems: 'start',
              gap: '12px'
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 24, height: 24, flexShrink: 0, color: '#ff9800' }}>
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <strong>Warning: Duplicate Policies Updated</strong>
                <p style={{ marginTop: '8px', marginBottom: '8px' }}>
                  {result.updated_count} policies with existing policy numbers were updated with new data.
                </p>
                <details style={{ marginTop: '8px' }}>
                  <summary style={{ cursor: 'pointer', color: '#ff9800', fontWeight: 500 }}>
                    View updated policy numbers ({result.updated_policies.length})
                  </summary>
                  <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
                    {result.updated_policies.map((policyNum, idx) => (
                      <li key={idx}><code>{policyNum}</code></li>
                    ))}
                  </ul>
                </details>
              </div>
            </div>
          )}

          {/* Métricas del resultado */}
          <div className="metrics">
            <div className="metric">
              <span className="label">Operation ID</span>
              <span className="value neutral" title={result.operation_id}>
                {result.operation_id.slice(0, 8)}...
              </span>
            </div>
            <div className="metric">
              <span className="label">Correlation ID</span>
              <span className="value neutral" title={result.correlation_id}>
                {result.correlation_id.slice(0, 8)}...
              </span>
            </div>
            <div className="metric">
              <span className="label">Inserted</span>
              <span className="value success">{result.inserted_count}</span>
            </div>
            <div className="metric">
              <span className="label">Updated</span>
              <span className={`value ${result.updated_count > 0 ? 'warning' : 'success'}`}>
                {result.updated_count}
              </span>
            </div>
            <div className="metric">
              <span className="label">Rejected</span>
              <span className={`value ${result.rejected_count > 0 ? 'error' : 'success'}`}>
                {result.rejected_count}
              </span>
            </div>
          </div>

          {/* Tabla de errores si hay errores */}
          {result.errors.length > 0 && (
            <div className="errors-table">
              <h3>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 20, height: 20 }}>
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Validation Errors ({result.errors.length})
              </h3>
              <table>
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Field</th>
                    <th>Error Code</th>
                    <th>Message</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Renderizar cada error en una fila */}
                  {result.errors.map((err, idx) => (
                    <tr key={idx}>
                      <td><strong>{err.row_number}</strong></td>
                      <td><code>{err.field}</code></td>
                      <td><code>{err.code}</code></td>
                      <td>{err.message || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
