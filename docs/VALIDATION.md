# Flujo de Validación - Sistema de Pólizas

Este documento detalla el flujo completo de validación en el sistema, desde que el usuario sube un archivo CSV hasta que se persiste en la base de datos.

---

## 📋 Tabla de Contenidos

- [Principio Fundamental: Backend Siempre Valida](#principio-fundamental-backend-siempre-valida)
- [Arquitectura de Validación](#arquitectura-de-validación)
- [Flujo Completo de Validación](#flujo-completo-de-validación)
- [Validaciones Técnicas](#validaciones-técnicas)
- [Validaciones de Negocio](#validaciones-de-negocio)
- [Códigos de Error](#códigos-de-error)
- [Manejo de Duplicados](#manejo-de-duplicados)
- [Respuestas HTTP](#respuestas-http)
- [Ejemplos con Archivos de Prueba](#ejemplos-con-archivos-de-prueba)

---

## 🔒 Principio Fundamental: Backend Siempre Valida

### ⚠️ **REGLA DE ORO: "Never Trust the Client"**

El backend **SIEMPRE** valida todos los datos, independientemente de lo que haga el frontend. Esta es una práctica fundamental de seguridad.

### ¿Por qué el Backend Siempre Valida?

#### 1. **Seguridad**

```
Un usuario malicioso puede:
✗ Saltarse el frontend usando Postman, curl o scripts
✗ Modificar el código JavaScript del navegador
✗ Enviar datos directamente a la API sin pasar por el frontend
✗ Manipular las validaciones del cliente
```

**Solución:** El backend valida como si no existiera frontend.

#### 2. **Integridad de Datos**

La base de datos debe mantener datos consistentes:
- ✅ No valores inválidos (fechas incorrectas, estados no permitidos)
- ✅ No violaciones de reglas de negocio (Property < $5,000)
- ✅ No policy_number duplicados (resuelto con `ON CONFLICT`)

**Solución:** El backend es la **única fuente de verdad**.

#### 3. **Separación de Responsabilidades**

| Capa | Responsabilidad | Ejemplo |
|------|-----------------|---------|
| **Frontend** | UX, feedback visual, validación preventiva | "El archivo debe ser .csv" |
| **Backend** | Validación real, lógica de negocio, persistencia | "Property debe tener insured_value >= $5,000" |
| **Base de Datos** | Constraints, integridad referencial | `UNIQUE(policy_number)` |

---

## 🏗️ Arquitectura de Validación

### Capas de Validación

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA 1: FRONTEND (Upload.tsx)                              │
│  ────────────────────────────────────────                   │
│  Validaciones de UX (opcionales, solo para feedback)        │
│  ✓ Archivo tiene extensión .csv                             │
│  ✓ Archivo fue seleccionado                                 │
│                                                              │
│  ❌ NO valida datos del CSV (policy_number, status, etc.)   │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP POST /upload
                       │ multipart/form-data
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPA 2: BACKEND (UploadController.ts)                      │
│  ─────────────────────────────────────                      │
│  Orquesta el flujo completo de validación                   │
│                                                              │
│  1. Parse CSV → 2. Validar → 3. Insertar → 4. Responder    │
└──────────────────────┬──────────────────────────────────────┘
                       │
          ┌────────────┴────────────┐
          │                         │
          ▼                         ▼
┌─────────────────────┐   ┌──────────────────────┐
│ CAPA 3A:            │   │ CAPA 3B:             │
│ ValidationService   │   │ RuleEngine           │
│ ─────────────────   │   │ ──────────────       │
│ Validaciones        │   │ Validaciones         │
│ Técnicas            │   │ de Negocio           │
│                     │   │                      │
│ ✓ Formato           │   │ ✓ Property >= $5K    │
│ ✓ Estructura        │   │ ✓ Auto >= $10K       │
│ ✓ Tipos de datos    │   │                      │
└─────────────────────┘   └──────────────────────┘
          │                         │
          └────────────┬────────────┘
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  CAPA 4: PolicyService.ts                                   │
│  ────────────────────────────                               │
│  Persistencia con manejo de duplicados                      │
│  ✓ INSERT ... ON CONFLICT DO UPDATE                         │
│  ✓ Detecta si fue INSERT o UPDATE                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Flujo Completo de Validación

### Diagrama de Flujo Detallado

```
┌─────────────────────────────────────────────────────────────┐
│  1. USUARIO SUBE ARCHIVO CSV                                │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  2. FRONTEND                                                 │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  handleUpload() {                                           │
│    ✓ Verifica que file !== null                            │
│    ✓ Verifica extensión .csv (UX)                          │
│    → POST /upload                                           │
│  }                                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  3. BACKEND - UploadController.upload()                     │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  PASO 1: Crear Operación (trazabilidad)                    │
│    operation = await createOperation()                      │
│    status: RECEIVED → PROCESSING                            │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  PASO 2: Parse CSV                                          │
│    records = parse(csvContent, {                            │
│      columns: true,                                         │
│      skip_empty_lines: true,                                │
│      trim: true                                             │
│    })                                                        │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  PASO 3: Validar Cada Fila                                 │
│    for (record of records) {                                │
│      rowNumber = i + 1                                      │
│                                                              │
│      ┌──────────────────────────────────────────────────┐  │
│      │ 3.1 VALIDACIONES TÉCNICAS                        │  │
│      │ (ValidationService.validateTechnical)            │  │
│      │                                                   │  │
│      │ const technicalErrors = [                        │  │
│      │   validateRequiredField(policy_number),          │  │
│      │   validateRequiredField(customer),               │  │
│      │   validateDateFields(start_date, end_date),      │  │
│      │   validateStatusField(status),                   │  │
│      │   validatePolicyTypeField(policy_type),          │  │
│      │   validateNumericField(premium_usd),             │  │
│      │   validateNumericField(insured_value_usd)        │  │
│      │ ]                                                 │  │
│      │                                                   │  │
│      │ if (technicalErrors.length > 0) {                │  │
│      │   allErrors.push(...technicalErrors)             │  │
│      │   continue  // ❌ NO SE INSERTA                  │  │
│      │ }                                                 │  │
│      └──────────────────────────────────────────────────┘  │
│                                                              │
│      ┌──────────────────────────────────────────────────┐  │
│      │ 3.2 CONVERSIÓN A POLICY TIPADO                   │  │
│      │ (ValidationService.parseToPolicy)                │  │
│      │                                                   │  │
│      │ const policy: Policy = {                         │  │
│      │   policy_number: record.policy_number.trim(),    │  │
│      │   customer: record.customer.trim(),              │  │
│      │   policy_type: record.policy_type as PolicyType, │  │
│      │   start_date: new Date(record.start_date),       │  │
│      │   end_date: new Date(record.end_date),           │  │
│      │   premium_usd: parseFloat(record.premium_usd),   │  │
│      │   status: record.status as PolicyStatus,         │  │
│      │   insured_value_usd: parseFloat(...)             │  │
│      │ }                                                 │  │
│      └──────────────────────────────────────────────────┘  │
│                                                              │
│      ┌──────────────────────────────────────────────────┐  │
│      │ 3.3 VALIDACIONES DE NEGOCIO                      │  │
│      │ (RuleEngine.validate)                            │  │
│      │                                                   │  │
│      │ for (rule of rules) {                            │  │
│      │   if (rule.appliesTo(policy)) {                  │  │
│      │     if (!rule.validate(policy)) {                │  │
│      │       errors.push({                              │  │
│      │         code: rule.errorCode,                    │  │
│      │         field: rule.field,                       │  │
│      │         message: rule.errorMessage               │  │
│      │       })                                          │  │
│      │     }                                             │  │
│      │   }                                               │  │
│      │ }                                                 │  │
│      │                                                   │  │
│      │ Reglas registradas:                              │  │
│      │ • PropertyMinInsuredValueRule                    │  │
│      │   → Si policy_type === 'Property'               │  │
│      │   → Requiere insured_value_usd >= 5000          │  │
│      │                                                   │  │
│      │ • AutoMinInsuredValueRule                        │  │
│      │   → Si policy_type === 'Auto'                   │  │
│      │   → Requiere insured_value_usd >= 10000         │  │
│      │                                                   │  │
│      │ if (businessErrors.length > 0) {                 │  │
│      │   allErrors.push(...businessErrors)              │  │
│      │   continue  // ❌ NO SE INSERTA                  │  │
│      │ }                                                 │  │
│      └──────────────────────────────────────────────────┘  │
│                                                              │
│      ✅ Si pasó TODAS las validaciones:                    │
│      validPolicies.push({ policy, rowNumber })             │
│    }                                                         │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  PASO 4: Insertar Pólizas Válidas                          │
│    for (policy of validPolicies) {                          │
│      result = await policyService.insertPolicy(policy)      │
│                                                              │
│      // ON CONFLICT (policy_number) DO UPDATE              │
│      if (result.was_updated) {                              │
│        updatedCount++                                       │
│        updatedPolicyNumbers.push(policy.policy_number)      │
│      } else {                                                │
│        insertedCount++                                      │
│      }                                                       │
│    }                                                         │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  PASO 5: Actualizar Operación                              │
│    await updateOperation({                                  │
│      status: 'COMPLETED',                                   │
│      rows_inserted: insertedCount,                          │
│      rows_updated: updatedCount,                            │
│      rows_rejected: allErrors.length,                       │
│      duration_ms: Date.now() - startTime                    │
│    })                                                        │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  PASO 6: Determinar Código HTTP                            │
│    rejectedCount = records.length - insertedCount - updatedCount│
│                                                              │
│    if (rejectedCount === 0) {                               │
│      statusCode = 200  // ✅ Todas exitosas                │
│    } else if (rejectedCount === records.length) {           │
│      statusCode = 422  // ❌ Todas rechazadas              │
│    } else {                                                  │
│      statusCode = 207  // ⚠️ Procesamiento parcial         │
│    }                                                         │
│                                                              │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  PASO 7: Retornar Respuesta                                │
│    res.status(statusCode).json({                            │
│      operation_id,                                          │
│      correlation_id,                                        │
│      inserted_count,                                        │
│      updated_count,                                         │
│      rejected_count,                                        │
│      errors: allErrors,                                     │
│      updated_policies: updatedPolicyNumbers                 │
│    })                                                        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│  4. FRONTEND - Muestra Resultados                           │
│  ────────────────────────────────────────────────────────   │
│                                                              │
│  switch (result.http_status) {                              │
│    case 200:                                                 │
│      ✅ Verde: "Upload Successful!"                         │
│      Muestra: inserted_count, updated_count                 │
│      break                                                   │
│                                                              │
│    case 207:                                                 │
│      ⚠️ Amarillo: "Upload Completed with Warnings"          │
│      Muestra: inserted, updated, rejected                   │
│      Tabla de errores con detalles                          │
│      break                                                   │
│                                                              │
│    case 422:                                                 │
│      ❌ Rojo: "All Rows Rejected"                           │
│      Muestra: rejected_count                                │
│      Tabla completa de errores                              │
│      break                                                   │
│  }                                                           │
│                                                              │
│  if (updated_count > 0) {                                   │
│    ⚠️ Banner amarillo: "Duplicate Policies Updated"         │
│    Lista expandible de policy_numbers actualizados          │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ Validaciones Técnicas

### Responsabilidad: `ValidationService.ts`

Las validaciones técnicas verifican formato, estructura y tipos de datos **antes** de aplicar reglas de negocio.

### Validaciones Implementadas

| Validación | Campo | Código de Error | Descripción |
|------------|-------|-----------------|-------------|
| **Campo requerido** | `policy_number` | `REQUIRED_FIELD` | No puede estar vacío o solo espacios |
| **Campo requerido** | `customer` | `REQUIRED_FIELD` | No puede estar vacío o solo espacios |
| **Formato de fecha** | `start_date` | `INVALID_DATE_FORMAT` | Debe ser fecha válida (YYYY-MM-DD) |
| **Formato de fecha** | `end_date` | `INVALID_DATE_FORMAT` | Debe ser fecha válida (YYYY-MM-DD) |
| **Rango de fechas** | `start_date`, `end_date` | `INVALID_DATE_RANGE` | start_date debe ser < end_date |
| **Status válido** | `status` | `INVALID_STATUS` | Debe ser: active, expired, cancelled |
| **Policy type válido** | `policy_type` | `INVALID_POLICY_TYPE` | Debe ser: Property, Auto, Life, Health |
| **Número positivo** | `premium_usd` | `INVALID_NUMBER` | Debe ser número positivo |
| **Número positivo** | `insured_value_usd` | `INVALID_NUMBER` | Debe ser número positivo |

### Ejemplo de Código

```typescript
// backend/src/services/ValidationService.ts

validateTechnical(input: PolicyInput, rowNumber: number): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Policy number obligatorio
  this.validateRequiredField(
    input.policy_number,
    'policy_number',
    'policy_number is required',
    rowNumber,
    errors
  );

  // 2. Customer obligatorio
  this.validateRequiredField(
    input.customer,
    'customer',
    'customer is required',
    rowNumber,
    errors
  );

  // 3. Fechas válidas y en rango correcto
  this.validateDateFields(
    input.start_date,
    input.end_date,
    rowNumber,
    errors
  );

  // 4. Status debe ser uno de los valores permitidos
  this.validateStatusField(input.status, rowNumber, errors);

  // 5. Policy type debe ser uno de los valores permitidos
  this.validatePolicyTypeField(input.policy_type, rowNumber, errors);

  // 6. Premium debe ser número positivo
  this.validateNumericField(
    input.premium_usd,
    'premium_usd',
    'premium_usd must be a positive number',
    rowNumber,
    errors
  );

  // 7. Insured value debe ser número positivo
  this.validateNumericField(
    input.insured_value_usd,
    'insured_value_usd',
    'insured_value_usd must be a positive number',
    rowNumber,
    errors
  );

  return errors;
}
```

---

## 🎯 Validaciones de Negocio

### Responsabilidad: `RuleEngine.ts` + Reglas OOP

Las validaciones de negocio aplican reglas específicas del dominio usando un **patrón Rule Engine** con polimorfismo.

### Reglas Implementadas

#### 1. **PropertyMinInsuredValueRule**

```typescript
// backend/src/rules/PropertyMinInsuredValueRule.ts

export class PropertyMinInsuredValueRule extends BusinessRule {
  readonly errorCode = 'PROPERTY_VALUE_TOO_LOW';
  readonly field = 'insured_value_usd';
  readonly errorMessage = 'Property policies must have insured value >= $5,000';
  private readonly MIN_VALUE = 5000;

  appliesTo(policy: Policy): boolean {
    return policy.policy_type === 'Property';
  }

  validate(policy: Policy): boolean {
    return policy.insured_value_usd >= this.MIN_VALUE;
  }
}
```

**Regla:**
- **Aplica a:** Pólizas de tipo `Property`
- **Requiere:** `insured_value_usd >= 5000`
- **Código de error:** `PROPERTY_VALUE_TOO_LOW`

#### 2. **AutoMinInsuredValueRule**

```typescript
// backend/src/rules/AutoMinInsuredValueRule.ts

export class AutoMinInsuredValueRule extends BusinessRule {
  readonly errorCode = 'AUTO_VALUE_TOO_LOW';
  readonly field = 'insured_value_usd';
  readonly errorMessage = 'Auto policies must have insured value >= $10,000';
  private readonly MIN_VALUE = 10000;

  appliesTo(policy: Policy): boolean {
    return policy.policy_type === 'Auto';
  }

  validate(policy: Policy): boolean {
    return policy.insured_value_usd >= this.MIN_VALUE;
  }
}
```

**Regla:**
- **Aplica a:** Pólizas de tipo `Auto`
- **Requiere:** `insured_value_usd >= 10000`
- **Código de error:** `AUTO_VALUE_TOO_LOW`

### Motor de Reglas (Rule Engine)

```typescript
// backend/src/rules/RuleEngine.ts

export class RuleEngine {
  private rules: BusinessRule[] = [];

  constructor() {
    // Registrar reglas de negocio
    this.registerRule(new PropertyMinInsuredValueRule());
    this.registerRule(new AutoMinInsuredValueRule());
  }

  validate(policy: Policy, rowNumber: number): ValidationError[] {
    const errors: ValidationError[] = [];

    // Aplicar cada regla registrada
    for (const rule of this.rules) {
      const error = rule.execute(policy, rowNumber);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }
}
```

### Ventajas del Patrón Rule Engine

1. ✅ **Open/Closed Principle:** Puedes agregar nuevas reglas sin modificar el motor
2. ✅ **Polimorfismo:** El motor no conoce detalles de reglas concretas
3. ✅ **Extensibilidad:** Agregar una regla es trivial:

```typescript
// Agregar nueva regla
export class LifeMinInsuredValueRule extends BusinessRule {
  readonly errorCode = 'LIFE_VALUE_TOO_LOW';
  private readonly MIN_VALUE = 50000;

  appliesTo(policy: Policy): boolean {
    return policy.policy_type === 'Life';
  }

  validate(policy: Policy): boolean {
    return policy.insured_value_usd >= this.MIN_VALUE;
  }
}

// Registrar en el constructor del RuleEngine
this.registerRule(new LifeMinInsuredValueRule());
```

---

## 🏷️ Códigos de Error

### Tabla Completa de Códigos

| Código | Tipo | Campo | Descripción | Archivo |
|--------|------|-------|-------------|---------|
| `REQUIRED_FIELD` | Técnica | `policy_number`, `customer` | Campo requerido vacío | ValidationService.ts:68 |
| `INVALID_DATE_FORMAT` | Técnica | `start_date`, `end_date` | Formato de fecha inválido | ValidationService.ts:95, 105 |
| `INVALID_DATE_RANGE` | Técnica | `start_date` | start_date >= end_date | ValidationService.ts:115 |
| `INVALID_STATUS` | Técnica | `status` | Status no es active/expired/cancelled | ValidationService.ts:132 |
| `INVALID_POLICY_TYPE` | Técnica | `policy_type` | Policy type no es Property/Auto/Life/Health | ValidationService.ts:149 |
| `INVALID_NUMBER` | Técnica | `premium_usd`, `insured_value_usd` | Campo numérico inválido o negativo | ValidationService.ts:175 |
| `PROPERTY_VALUE_TOO_LOW` | Negocio | `insured_value_usd` | Property con insured_value < $5,000 | PropertyMinInsuredValueRule.ts:14 |
| `AUTO_VALUE_TOO_LOW` | Negocio | `insured_value_usd` | Auto con insured_value < $10,000 | AutoMinInsuredValueRule.ts:14 |

### Estructura de Error

```typescript
interface ValidationError {
  row_number: number;  // Fila del CSV donde ocurrió el error
  field: string;       // Campo que falló la validación
  code: string;        // Código único del error
  message?: string;    // Mensaje descriptivo (opcional)
}
```

### Ejemplo de Errores en Respuesta

```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "correlation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "inserted_count": 2,
  "updated_count": 0,
  "rejected_count": 3,
  "errors": [
    {
      "row_number": 1,
      "field": "policy_number",
      "code": "REQUIRED_FIELD",
      "message": "policy_number is required"
    },
    {
      "row_number": 2,
      "field": "insured_value_usd",
      "code": "PROPERTY_VALUE_TOO_LOW",
      "message": "Property policies must have insured value >= $5,000"
    },
    {
      "row_number": 4,
      "field": "start_date",
      "code": "INVALID_DATE_RANGE",
      "message": "start_date must be before end_date"
    }
  ],
  "updated_policies": []
}
```

---

## 🔄 Manejo de Duplicados

### Comportamiento: ON CONFLICT DO UPDATE

Si se sube un CSV con un `policy_number` que ya existe en la base de datos:

- ✅ **NO se rechaza**
- ✅ **SE ACTUALIZA** la póliza existente con los nuevos valores
- ✅ **Se detecta** usando el campo interno `xmax` de PostgreSQL
- ✅ **Se reporta** en `updated_count` y `updated_policies`

### Implementación en SQL

```sql
-- backend/src/services/PolicyService.ts

INSERT INTO policies
  (policy_number, customer, policy_type, start_date, end_date, premium_usd, status, insured_value_usd)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (policy_number) DO UPDATE SET
  customer = EXCLUDED.customer,
  policy_type = EXCLUDED.policy_type,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  premium_usd = EXCLUDED.premium_usd,
  status = EXCLUDED.status,
  insured_value_usd = EXCLUDED.insured_value_usd
RETURNING *, (xmax = 0) AS was_insert
```

### Detección de INSERT vs UPDATE

```typescript
const result = await policyService.insertPolicy(policy);

if (result.was_updated) {
  updatedCount++;
  updatedPolicyNumbers.push(policy.policy_number);
} else {
  insertedCount++;
}
```

**Técnica:**
- `xmax = 0` → Fue un INSERT nuevo
- `xmax > 0` → Fue un UPDATE de registro existente

### Beneficios de ON CONFLICT

1. ✅ **Idempotencia:** Subir el mismo CSV dos veces produce el mismo resultado
2. ✅ **Reintentos seguros:** Permite reintentar cargas sin duplicar datos
3. ✅ **Actualización masiva:** Permite actualizar pólizas existentes vía CSV
4. ✅ **Trazabilidad:** El frontend muestra qué pólizas fueron actualizadas

---

## 📡 Respuestas HTTP

El backend retorna diferentes códigos HTTP según el resultado del procesamiento:

### HTTP 200 - OK (Todas Exitosas)

**Condición:** `rejectedCount === 0`

```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "correlation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "inserted_count": 5,
  "updated_count": 1,
  "rejected_count": 0,
  "errors": [],
  "updated_policies": ["POL-001"]
}
```

**Frontend muestra:**
- ✅ Icono verde
- ✅ "Upload Successful!"
- ✅ "All 6 policies processed successfully"
- ✅ "5 new policies imported, 1 updated"

---

### HTTP 207 - Multi-Status (Procesamiento Parcial)

**Condición:** `rejectedCount > 0 && rejectedCount < records.length`

```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "correlation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "inserted_count": 3,
  "updated_count": 1,
  "rejected_count": 2,
  "errors": [
    {
      "row_number": 2,
      "field": "insured_value_usd",
      "code": "PROPERTY_VALUE_TOO_LOW",
      "message": "Property policies must have insured value >= $5,000"
    },
    {
      "row_number": 5,
      "field": "status",
      "code": "INVALID_STATUS",
      "message": "status must be one of: active, expired, cancelled"
    }
  ],
  "updated_policies": ["POL-042"]
}
```

**Frontend muestra:**
- ⚠️ Icono amarillo
- ⚠️ "Upload Completed with Warnings"
- ⚠️ "4 processed, 2 rejected"
- ⚠️ Tabla con 2 errores detallados

---

### HTTP 422 - Unprocessable Entity (Todas Rechazadas)

**Condición:** `rejectedCount === records.length`

```json
{
  "operation_id": "550e8400-e29b-41d4-a716-446655440000",
  "correlation_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "inserted_count": 0,
  "updated_count": 0,
  "rejected_count": 5,
  "errors": [
    {
      "row_number": 1,
      "field": "policy_number",
      "code": "REQUIRED_FIELD",
      "message": "policy_number is required"
    },
    {
      "row_number": 2,
      "field": "insured_value_usd",
      "code": "PROPERTY_VALUE_TOO_LOW",
      "message": "Property policies must have insured value >= $5,000"
    },
    {
      "row_number": 3,
      "field": "insured_value_usd",
      "code": "AUTO_VALUE_TOO_LOW",
      "message": "Auto policies must have insured value >= $10,000"
    },
    {
      "row_number": 4,
      "field": "status",
      "code": "INVALID_STATUS",
      "message": "status must be one of: active, expired, cancelled"
    },
    {
      "row_number": 5,
      "field": "start_date",
      "code": "INVALID_DATE_RANGE",
      "message": "start_date must be before end_date"
    }
  ],
  "updated_policies": []
}
```

**Frontend muestra:**
- ❌ Icono rojo
- ❌ "All Rows Rejected"
- ❌ "All 5 rows failed validation - nothing was saved"
- ❌ Tabla completa con los 5 errores

---

## 🧪 Ejemplos con Archivos de Prueba

Se incluyen 3 archivos CSV de prueba en `sample-data/` para validar el sistema:

### 1. test_01_valid.csv - Casos Válidos

```csv
policy_number,customer,policy_type,start_date,end_date,premium_usd,status,insured_value_usd
TEST-001,Test Company A,Property,2025-01-01,2025-12-31,1500,active,5000
TEST-002,Test Company B,Auto,2025-02-01,2026-01-31,1200,active,10000
TEST-003,Test Company C,Property,2025-03-01,2026-02-28,2000,active,8500
TEST-004,Test Company D,Auto,2025-04-01,2026-03-31,1800,active,15000
TEST-005,Test Company E,Life,2025-05-01,2030-04-30,900,active,100000
TEST-006,Test Company F,Health,2025-06-01,2026-05-31,1100,active,50000
```

**Resultado esperado:**
- HTTP 200 ✅
- `inserted_count`: 6
- `updated_count`: 0
- `rejected_count`: 0
- `errors`: []

**Todas las filas pasan validaciones:**
- ✅ Policy numbers únicos y no vacíos
- ✅ Status válidos (active)
- ✅ Fechas correctas (start < end)
- ✅ Property con insured_value >= 5000
- ✅ Auto con insured_value >= 10000

---

### 2. test_02_duplicates.csv - Prueba de Duplicados

```csv
policy_number,customer,policy_type,start_date,end_date,premium_usd,status,insured_value_usd
POL-001,Acme Corp UPDATED,Property,2025-01-01,2025-12-31,9999,active,99999
POL-002,Globex Inc UPDATED,Auto,2026-01-31,2025-02-01,8888,active,88888
TEST-101,New Test Company,Property,2025-01-01,2025-12-31,1500,active,5000
```

**⚠️ NOTA:** La fila 3 (POL-002) tiene fechas invertidas intencionalmente.

**Resultado esperado:**
- HTTP 207 ⚠️ (Multi-Status)
- `inserted_count`: 1 (TEST-101)
- `updated_count`: 1 (POL-001)
- `rejected_count`: 1 (POL-002)
- `errors`: [ { row_number: 3, code: "INVALID_DATE_RANGE" } ]
- `updated_policies`: ["POL-001"]

**Detalles:**
- ✅ Fila 1 (POL-001): Actualiza póliza existente
- ❌ Fila 2 (POL-002): Rechazada por fechas invertidas
- ✅ Fila 3 (TEST-101): Inserta nueva póliza

---

### 3. test_03_validation_errors.csv - Errores de Validación

```csv
policy_number,customer,policy_type,start_date,end_date,premium_usd,status,insured_value_usd
,Empty Policy Number Test,Property,2025-01-01,2025-12-31,1000,active,5000
TEST-201,Property Low Value,Property,2025-01-01,2025-12-31,1000,active,4999
TEST-202,Auto Low Value,Auto,2025-01-01,2025-12-31,1000,active,9999
TEST-203,Invalid Status,Property,2025-01-01,2025-12-31,1000,invalid_status,5000
TEST-204,Invalid Dates,Property,2025-12-31,2025-01-01,1000,active,5000
TEST-205,Valid Row After Errors,Life,2025-01-01,2030-12-31,1000,active,100000
```

**Resultado esperado:**
- HTTP 207 ⚠️ (Multi-Status)
- `inserted_count`: 1 (TEST-205)
- `updated_count`: 0
- `rejected_count`: 5
- `errors`: [ ... 5 errores ... ]

**Detalles de errores:**

| Row | Field | Code | Descripción |
|-----|-------|------|-------------|
| **1** | `policy_number` | `REQUIRED_FIELD` | Policy number vacío |
| **2** | `insured_value_usd` | `PROPERTY_VALUE_TOO_LOW` | Property con 4999 (< 5000) |
| **3** | `insured_value_usd` | `AUTO_VALUE_TOO_LOW` | Auto con 9999 (< 10000) |
| **4** | `status` | `INVALID_STATUS` | Status "invalid_status" no permitido |
| **5** | `start_date` | `INVALID_DATE_RANGE` | Fechas invertidas (end < start) |

- ✅ Fila 6 (TEST-205): Válida, se inserta correctamente

---

## 🎯 Resumen

### ✅ Validaciones Siempre en Backend

| Aspecto | Implementación |
|---------|----------------|
| **Técnicas** | ValidationService: formato, estructura, tipos |
| **Negocio** | RuleEngine: reglas del dominio (Property >= $5K, Auto >= $10K) |
| **Duplicados** | PolicyService: ON CONFLICT DO UPDATE |
| **Respuesta** | HTTP 200/207/422 según resultado |
| **Trazabilidad** | Operation ID, Correlation ID, errores detallados |

### ✅ Seguridad

- 🔒 **Backend SIEMPRE valida** (Never Trust the Client)
- 🔒 **Frontend solo valida para UX** (extensión .csv)
- 🔒 **Base de datos tiene constraints** (UNIQUE, NOT NULL)

### ✅ Extensibilidad

Agregar nueva regla de negocio:

1. Crear clase que extienda `BusinessRule`
2. Implementar `appliesTo()` y `validate()`
3. Registrar en `RuleEngine` constructor
4. ¡Listo! Sin modificar código existente (Open/Closed Principle)

---

## 📚 Referencias

- **Código fuente:**
  - `backend/src/controllers/UploadController.ts` - Orquestación
  - `backend/src/services/ValidationService.ts` - Validaciones técnicas
  - `backend/src/rules/RuleEngine.ts` - Motor de reglas
  - `backend/src/rules/PropertyMinInsuredValueRule.ts` - Regla Property
  - `backend/src/rules/AutoMinInsuredValueRule.ts` - Regla Auto
  - `backend/src/services/PolicyService.ts` - Persistencia
  - `frontend/src/pages/Upload.tsx` - Interfaz de usuario
  - `frontend/src/services/api.ts` - Cliente HTTP

- **Archivos de prueba:**
  - `sample-data/test_01_valid.csv` - Casos válidos
  - `sample-data/test_02_duplicates.csv` - Duplicados
  - `sample-data/test_03_validation_errors.csv` - Errores de validación

- **Documentación relacionada:**
  - `docs/ARCHITECTURE.md` - Arquitectura del sistema
  - `docs/SECURITY.md` - Seguridad y validación de entorno
  - `README.md` - Introducción y setup

---

**Última actualización:** 2026-02-05
