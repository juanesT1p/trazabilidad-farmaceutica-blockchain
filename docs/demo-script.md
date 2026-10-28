# Guion de demostración — 3 a 5 minutos

## Preparación

1. Levantar PostgreSQL, Hardhat, el contrato y el backend como indica el README raíz.
2. Ejecutar `cd frontend && npm run dev`.
3. Abrir `http://localhost:5173` y confirmar que el selector superior indica una cuenta ficticia.

## Recorrido

1. **Contexto — 30 segundos.** Mostrar el banner de prototipo académico y explicar que el selector de actor no es autenticación.
2. **Actores — 35 segundos.** En “Recorrido guiado”, pulsar “Siguiente” en “Registrar actores”. Señalar que el backend registra las direcciones, roles, hashes de clave pública y transacciones; la firma ML-DSA se mantiene fuera de la cadena.
3. **Lote — 35 segundos.** Avanzar en “Crear lote”. Mostrar el identificador, los metadatos y el panel “¿Qué acaba de pasar?”. Explicar que el API devuelve el `metadataHash`, el `eventHash`, el `txHash` y el bloque.
4. **Custodia — 35 segundos.** Avanzar en “Transferir custodia”. Explicar que el backend valida al custodio actual, firma el nuevo evento y actualiza la custodia en el contrato.
5. **Evidencia — 40 segundos.** Avanzar en “Consultar historial” y observar la vista que separa “En la cadena” de “Fuera de la cadena”. Señalar los hashes, el evento completo y la firma.
6. **Verificación — 45 segundos.** Avanzar en “Verificar autenticidad”. Abrir el detalle y mostrar `valid` junto con hash, firma ML-DSA, clave pública, hash en cadena y continuidad.
7. **Cierre — 20 segundos.** Abrir “Mediciones” y “Limitaciones”. Aclarar que las cifras se leen de resultados reales del repositorio y que el prototipo no es una cadena post-cuántica completa: ML-DSA se aplica en la capa de aplicación.

## Alternativa para una exposición controlada

Si los actores de la demostración ya existen, “Registrar actores” puede mostrar el rechazo de duplicado devuelto por el API. Pulsar “Reiniciar” genera otro identificador de lote, pero no borra la información del backend porque no existe una operación de borrado.
