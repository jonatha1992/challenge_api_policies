// Archivo índice para el módulo de reglas de negocio
// Exporta todas las clases relacionadas con el motor de reglas y validaciones

// Clase base abstracta que define el contrato para todas las reglas
export { BusinessRule } from './BusinessRule';

// Reglas concretas de negocio implementadas
export { PropertyMinInsuredValueRule } from './PropertyMinInsuredValueRule';
export { AutoMinInsuredValueRule } from './AutoMinInsuredValueRule';

// Motor de reglas que coordina la aplicación de todas las reglas
export { RuleEngine } from './RuleEngine';
