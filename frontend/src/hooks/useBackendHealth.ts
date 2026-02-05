import { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';

/**
 * Hook personalizado para monitorear la salud del backend.
 *
 * Realiza un health check al montar el componente y luego periódicamente cada 30 segundos.
 * Permite detectar cuando el backend está caído y mostrar mensajes apropiados al usuario.
 *
 * @returns Estado de salud del backend y cualquier error detectado
 */
export const useBackendHealth = () => {
  const [isHealthy, setIsHealthy] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    /**
     * Ejecuta el health check contra el backend.
     * Actualiza el estado basado en la respuesta o errores detectados.
     */
    const performHealthCheck = async () => {
      try {
        const response = await checkHealth();

        // Verificar que tanto el servidor como la base de datos están operativos
        if (response.status === 'ok' && response.database === 'connected') {
          setIsHealthy(true);
          setError(null);
        } else {
          setIsHealthy(false);
          setError(response.error || 'Backend is not fully operational');
        }
      } catch (err) {
        setIsHealthy(false);

        // Discriminar el tipo de error para proporcionar mensajes más específicos
        if (err && typeof err === 'object' && 'code' in err && err.code === 'ERR_NETWORK') {
          setError('Cannot connect to backend. Is the server running?');
        } else {
          setError('Backend health check failed');
        }
      } finally {
        setIsChecking(false);
      }
    };

    // Ejecutar health check inicial al montar el componente
    performHealthCheck();

    // Configurar polling cada 30 segundos para monitoreo continuo
    const interval = setInterval(performHealthCheck, 30000);

    // Limpiar interval cuando el componente se desmonte
    return () => clearInterval(interval);
  }, []);

  return { isHealthy, error, isChecking };
};
