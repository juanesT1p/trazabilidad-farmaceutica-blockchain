# Frontend

## Objetivo

La carpeta `frontend/` proporciona una interfaz en español para operar el API y hacer visible la separación entre:

- datos de integridad fijados en la blockchain local: custodio, existencia, hash de metadatos y hashes de eventos;
- evento completo conservado fuera de la cadena: metadatos, JSON canónico, firma ML-DSA, nivel, transacción y bloque.

El cliente no inventa actores, lotes, verificaciones ni mediciones del servidor. Usa cuentas Hardhat ficticias únicamente como accesos rápidos de demostración y marca que la selección no es autenticación.

## Decisiones de diseño

- Vite sirve el frontend en `5173` y hace proxy de las rutas del backend en `3000`; no se modificó CORS.
- TanStack Query centraliza consultas y estados de carga; el cliente HTTP está en `frontend/src/api.ts` y conserva el mensaje real de error de la API.
- React Hook Form + Zod valida los formularios antes de enviar.
- El recorrido guiado ejecuta el flujo real en cinco acciones, con un identificador de lote nuevo al reiniciar. Reiniciar no borra datos del backend porque el API no tiene endpoint de borrado.
- `localStorage` guarda solo el contexto de demostración creado en esa sesión: actores y lotes conocidos. El frontend lo presenta como lista local, no como lista completa del backend.
- Las mediciones se copian desde `reports/` mediante `scripts/copy-repo-assets.mjs`. Si falta un JSON, se presenta `NO EJECUTADO`.
- El modo día/noche se inicializa con la preferencia del sistema, puede cambiarse desde el botón superior y queda guardado localmente; los estados de verificación combinan icono, texto y color.
- El detalle de verificación expone exactamente `valid` y los cinco booleanos de `GET /lots/:id/verify`.
- Las identidades se presentan como `Nombre · Rol · 0x1234…abcd`. `displayName` es opcional, descriptivo y no participa en firmas, JSON canónico ni hashes.

## Mapa de pantallas

| Pantalla | Ruta | API o fuente |
| --- | --- | --- |
| Recorrido guiado | `/` | `POST /actors`, `POST /lots`, `POST /lots/:id/transfer`, `GET /lots/:id`, `GET /lots/:id/history`, `GET /lots/:id/verify` |
| Actores | `/actors` | `POST /actors` con etiqueta `displayName` opcional; lista local porque no existe `GET /actors` |
| Crear lote | `/lots/new` | `POST /lots` |
| Transferir custodia | `/transfer` | `GET /lots/:id` y `POST /lots/:id/transfer` |
| Detalle del lote | `/lots/:id` | `GET /lots/:id` |
| Verificación | `/verify` | `GET /lots/:id/verify`; exportación local JSON/CSV |
| Mediciones | `/measurements` | JSON generado por scripts en `reports/` |
| Limitaciones | `/limitations` | copia pública de `docs/limitations.md` |

## Accesibilidad y UX

- Controles con etiquetas asociadas, estados `role="alert"`/`role="status"` y navegación por teclado.
- Los estados de verificación no dependen solo del color.
- Los errores muestran el texto que responde el backend.
- Hay estados vacíos, cargando y error; hashes, direcciones y JSON tienen controles de copia.
- El diseño se adapta a móvil y ofrece un menú lateral colapsable.

## Límites conscientes

El API no devuelve listados, estado de herramientas de desarrollo ni un endpoint de manipulación segura. Esas funciones no se simularon. Para que el frontend pudiera consultar la lista autoritativa de actores y lotes, el cambio mínimo sería añadir `GET /actors` y `GET /lots`. Para manipulación demostrativa se necesitaría el endpoint protegido indicado en `docs/frontend-api-map.md`.

## Versiones verificadas

Las versiones directas del frontend están fijadas en `frontend/package.json` y se resolvieron en `frontend/package-lock.json`. Se consultó el registro de npm para confirmar existencia de las versiones elegidas antes de instalar. La versión observada de Vite durante la compilación fue `8.3.5`.
