/**
 * Valida que todas las variables de entorno requeridas estén presentes en el frontend.
 * En Vite, las variables deben empezar con VITE_ para ser expuestas al cliente.
 *
 * Esta validación se ejecuta en el navegador antes de inicializar la aplicación React.
 *
 * @returns true si todas las variables requeridas están presentes, false en caso contrario
 */
export const validateEnv = (): boolean => {
  const requiredVars = ['VITE_API_URL'];
  const missing: string[] = [];

  for (const varName of requiredVars) {
    const value = import.meta.env[varName];

    // Validar que existe y no es string vacío
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      missing.push(varName);
    }
  }

  if (missing.length > 0) {
    console.error('❌ MISSING REQUIRED ENVIRONMENT VARIABLES:');
    missing.forEach(varName => {
      console.error(`  - ${varName}`);
    });
    console.error('\nPlease check your .env file.');
    console.error('Frontend environment variables must start with VITE_ prefix.');
    console.error('See .env.example for reference.');
    return false;
  }

  console.log('✅ Environment validation passed');
  console.log(`   API URL: ${import.meta.env.VITE_API_URL}`);

  return true;
};

/**
 * Valida el entorno y lanza error si falta alguna variable requerida.
 * Esta función debe ser llamada antes de inicializar la aplicación React.
 *
 * Si todas las variables están presentes, la función retorna silenciosamente.
 * Si falta alguna variable, lanza un error que puede ser capturado para mostrar un mensaje al usuario.
 *
 * @throws Error si falta alguna variable de entorno requerida
 */
export const validateEnvOrThrow = (): void => {
  if (!validateEnv()) {
    throw new Error('Environment validation failed. Check console for details.');
  }
};
