# Decisiones de Diseno

## 1. Arquitectura OOP para Reglas de Negocio

**Decision:** Implementar patron Strategy con clase abstracta `BusinessRule`.

**Razon:**

- Permite agregar nuevas reglas sin modificar el motor (Open/Closed Principle)
- El `RuleEngine` trabaja con la abstraccion, no con implementaciones concretas (polimorfismo)
- Facilita testing unitario de cada regla de forma aislada
- Las reglas son autocontenidas: cada una sabe si aplica y como validar

**Estructura:**

```
BusinessRule (abstracta)
├── PropertyMinInsuredValueRule
├── AutoMinInsuredValueRule
└── [Nuevas reglas...]
```

El `RuleEngine` itera sobre todas las reglas registradas y llama a `execute()` de forma polimorfica, sin conocer los detalles de cada validacion.

## 2. Paginacion con Limit/Offset

**Decision:** Usar limit/offset simple en lugar de cursor-based pagination.

**Razon:**

- Suficiente para volumenes moderados de datos (<100K registros)
- Soportado nativamente por PostgreSQL (`LIMIT` / `OFFSET`)
- Familiar para consumidores de API REST tradicionales

**Tradeoff:** Para datasets muy grandes (millones de registros), cursor-based seria mas eficiente ya que evita el costo de OFFSET. Se podria migrar en el futuro usando `created_at` como cursor.

## 3. Idempotencia en Upload

**Decision:** Usar `ON CONFLICT (policy_number) DO UPDATE` en PostgreSQL.

**Razon:**

- Permite re-subir archivos CSV sin crear duplicados
- El ultimo valor siempre prevalece (upsert semantics)
- Simplifica el flujo del usuario: no necesita preocuparse por limpiar antes de re-subir
- Evita errores de constraint violation

**Alternativa considerada:** Validar existencia antes de insertar, pero esto requiere mas queries y no es atomico.

## 4. Trazabilidad con Correlation ID

**Decision:** Propagar `x-correlation-id` en headers y persistir en tabla `operations`.

**Razon:**

- Permite rastrear requests end-to-end en sistemas distribuidos
- Facilita debugging y analisis de incidentes
- Compatible con Azure App Insights y otros sistemas de observabilidad
- El cliente puede proveer su propio ID o el servidor genera uno

**Implementacion:**

1. Middleware intercepta o genera correlation_id
2. Se agrega a todos los logs (winston)
3. Se persiste en tabla operations
4. Se retorna en response header

## 5. Feature de IA con Fallback Local

**Decision:** Implementar analisis local cuando no hay API key de OpenAI.

**Razon:**

- Permite demo funcional sin dependencias externas
- Los insights locales cubren los casos basicos del challenge
- Facil de extender con otros providers (Anthropic, Azure OpenAI, etc.)
- Reduce costos en desarrollo y testing

**Analisis local incluye:**

- Deteccion de concentracion por tipo de poliza
- Identificacion de valores cercanos a minimos permitidos
- Analisis de tasas de expiracion/cancelacion
- Recomendaciones basadas en reglas

## 6. Escalabilidad

**Para escalar el sistema:**

1. **Horizontal scaling del API:**
   - Separar en Azure Functions para auto-scaling
   - Stateless design permite multiples instancias

2. **Database:**
   - Connection pooling ya implementado con `pg`
   - Indices en columnas de filtro frecuente
   - Para >1M registros: particionamiento por fecha

3. **Caching:**
   - Redis para cache de `/policies/summary`
   - TTL de 1-5 minutos segun frecuencia de updates

4. **Upload de archivos grandes:**
   - Procesamiento async con job queue (Bull, Azure Service Bus)
   - Streaming del CSV en chunks
   - Webhook para notificar completion

## 7. Tradeoffs Aceptados

| Decision | Beneficio | Tradeoff |
|----------|-----------|----------|
| TypeScript | Type safety, mejor DX | Build step adicional |
| Multer in-memory | Simple, rapido para archivos pequenos | No escala para archivos >50MB |
| Winston logger | Estructurado, flexible | Mas setup que console.log |
| Vite + React | DX rapido, HMR | Otra dependencia para bundle |
| Sin ORM | Control total de SQL, performance | Mas boilerplate en queries |

## 8. Decisiones de UI/UX

- **Navegacion simple:** Tres paginas claras (Upload, Policies, Summary)
- **Feedback inmediato:** Metricas de upload visibles inmediatamente
- **Filtros persistentes:** Se mantienen al paginar
- **Responsive:** CSS Grid/Flexbox para adaptarse a diferentes pantallas

