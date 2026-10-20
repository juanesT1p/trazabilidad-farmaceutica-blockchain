# Plan de trabajo

## Contexto inicial

- Fecha de inspección: 2026-10-19.
- Directorio inicial vacío y sin repositorio Git.
- Node detectado: `v26.8.2` (Current, no LTS); el proyecto fijará Node 24 LTS.
- npm detectado: `12.1.0`.
- Docker detectado: `29.8.1`.
- Docker Compose detectado: `5.5.1`.
- Librería candidata verificada: `@noble/post-quantum@0.7.1`, con `ml_dsa44`, `ml_dsa65` y `ml_dsa87` en `@noble/post-quantum/ml-dsa.js`.
- Hardhat 3 es la línea estable vigente; la versión exacta se fijará en `package.json` y `package-lock.json` después de consultar el registro.

## Etapas y criterios de terminado

1. **Preparación**
   - Inicializar npm, TypeScript estricto, ESLint, Prettier, Vitest y Hardhat.
   - Fijar versiones, crear `.env.example`, `.gitignore`, `docker-compose.yml` y documentación base.
   - Criterio: instalación reproducible y compilaciones/lint iniciales exitosos.

2. **Contrato y pruebas**
   - Implementar registro de actores, lotes, custodias y hashes de eventos.
   - Añadir pruebas positivas y negativas de los RF-01 a RF-04 y RF-07.
   - Criterio: compilación Hardhat y suite de contrato ejecutadas realmente.

3. **Backend, firma y base de datos**
   - Implementar Express + Zod + Swagger/OpenAPI + Prisma/PostgreSQL.
   - Integrar ML-DSA configurable, por defecto ML-DSA-65, y almacén local de claves de desarrollo ignorado por Git.
   - Criterio: endpoints operativos contra cadena local y PostgreSQL, validación de entradas y pruebas backend.

4. **Verificación**
   - Implementar hash canónico, firma, continuidad de custodia e historial.
   - Cubrir eventos alterados, firmas alteradas, actores no registrados, custodio incorrecto, lotes duplicados e historial inconsistente.
   - Criterio: RF-05/RF-06 y casos negativos probados; cobertura reportada.

5. **Mediciones**
   - Medir gas con al menos 30 repeticiones.
   - Medir ML-DSA-44/65/87 y ECDSA con calentamiento y al menos 500 repeticiones.
   - Crear medición opcional de confirmación en testnet sin ejecutarla sin credenciales.
   - Criterio: scripts reproducibles y resultados honestos en CSV/JSON/Markdown; lo no ejecutado queda como `NO EJECUTADO`.

6. **Documentación y cierre**
   - Completar README, arquitectura, trazabilidad, decisiones y limitaciones.
   - Inicializar Git y realizar commits pequeños por etapa si la operación de escritura está disponible.
   - Criterio: instalación desde cero documentada, pruebas y verificaciones ejecutadas o marcadas explícitamente como no ejecutadas.

## Reglas de ejecución

- No se usarán datos, claves ni credenciales reales.
- No se afirmará que una prueba o medición pasa si no se ejecutó.
- Cada ambigüedad se resolverá con la opción mínima y se anotará en `docs/decisions/`.
- Antes de pasar de etapa se intentará ejecutar lint, compilación y pruebas relevantes.

## Estado al cierre

- Preparación, contrato, backend, verificación, mediciones y documentación completadas.
- Contrato: 5 pruebas reales pasando.
- Backend: 10 pruebas reales pasando; cobertura Vitest reportada.
- Mediciones de gas y firmas ejecutadas y guardadas en `reports/`.
- Confirmación en testnet pública: `NO EJECUTADO` por ausencia de credenciales.
