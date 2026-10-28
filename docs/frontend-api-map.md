# Mapa de API para el frontend

Este documento describe el contrato observado en `src/app.ts`, `src/domain.ts`, `src/swagger.ts`, `src/config.ts`, `prisma/schema.prisma`, `README.md` y la documentación del proyecto. El frontend debe tratar este contrato como la fuente de verdad.

## Base y comportamiento común

- En desarrollo, el backend escucha en `http://localhost:3000`.
- El cliente puede usar rutas relativas (`/actors`, `/lots/...`) mediante el proxy de Vite.
- Las peticiones JSON deben incluir `Content-Type: application/json`.
- Las operaciones de escritura usan las claves EVM configuradas en el backend; el frontend nunca recibe ni envía claves privadas.
- La selección de actor del frontend se traduce al encabezado `x-actor-address` cuando la ruta lo requiere. El backend lo normaliza a minúsculas.
- Errores de validación Zod: HTTP 400 con `{ "error": "Invalid input", "details": [...] }`.
- Errores de negocio: HTTP 400, 403, 404 o 409 con `{ "error": "..." }`.
- Otros errores se devuelven como HTTP 500 con `{ "error": "..." }`.

## Esquemas de entrada reales

### Actor (`POST /actors`)

```ts
{
  address: string;       // /^0x[0-9a-fA-F]{40}$/
  displayName?: string;  // 1..80, sin CR/LF; único sin distinguir mayúsculas
  role: 'manufacturer' | 'distributor' | 'pharmacy' | 'verifier';
  level?: 44 | 65 | 87;
  publicKey?: string;    // base64; normalmente se omite en desarrollo
}
```

Si no se envía `publicKey`, el backend genera y guarda un par ML-DSA de desarrollo. Si no se envía `level`, usa `ML_DSA_LEVEL` del backend, cuyo valor por defecto es 65.

Respuesta HTTP 201:

```ts
{
  actor: {
    address: string;
    displayName: string | null;
    role: string;
    level: number;
    publicKeyHash: string;
    publicKey: string;
    createdAt: string;
  };
  transaction: {
    txHash: string;
    blockNumber: number;
  };
}
```

`displayName` es opcional para conservar la compatibilidad con actores existentes. El backend recorta el valor, rechaza saltos de línea y responde HTTP 409 con un mensaje claro si ya existe otro actor con el mismo nombre sin distinguir mayúsculas. El campo solo pertenece al registro descriptivo de PostgreSQL: no forma parte del evento firmado, del JSON canónico ni de ningún hash.
Si la dirección ya está registrada, `POST /actors` también responde HTTP 409 antes de intentar otra transacción en Solidity; el recorrido guiado interpreta ese conflicto como “actor ya registrado” y puede continuar.

### Lote (`POST /lots`)

Encabezado obligatorio:

```http
x-actor-address: 0x...
```

El actor debe existir y tener rol `manufacturer`.

```ts
{
  lotId: string; // longitud 1..128
  metadata: Record<string, unknown>;
}
```

Respuesta HTTP 201: objeto `Lot` con el evento de creación incluido.

```ts
{
  id: string;
  metadataHash: string;
  currentCustodian: string;
  createdAt: string;
  events: Event[];
}
```

### Transferencia (`POST /lots/:id/transfer`)

Encabezado obligatorio:

```http
x-actor-address: 0x...
```

El actor debe ser el custodio actual. El destinatario debe estar registrado y no puede tener rol `verifier`.

```ts
{
  to: string; // /^0x[0-9a-fA-F]{40}$/
  metadata?: Record<string, unknown>; // por defecto {}
}
```

Respuesta HTTP 201: un `Event` serializado.

## Respuestas de consulta

### Evento

La serialización convierte `timestamp` y `blockNumber` de BigInt a número antes de responder:

```ts
{
  id: string;
  lotId: string;
  type: 'LOT_CREATED' | 'CUSTODY_TRANSFERRED';
  fromAddress: string | null;
  toAddress: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  prevEventHash: string | null;
  eventHash: string;
  canonicalJson: string;
  signature: string;
  level: number;
  txHash: string;
  blockNumber: number;
  createdAt: string;
}
```

### `GET /lots/:id`

Respuesta HTTP 200:

```ts
{
  id: string;
  metadataHash: string;
  currentCustodian: string;
  createdAt: string;
  events: Event[];
  chain: {
    exists: boolean;
    metadataHash: string;
    custodian: string;
    eventHashes: string[];
  };
}
```

La vista “En la cadena” solo puede mostrar los datos de `chain` y los hashes/transacciones almacenados en cada evento. La vista “Fuera de la cadena” puede mostrar el evento completo, `metadata`, `canonicalJson`, `signature` y `level` porque sí llegan en la respuesta.

### `GET /lots/:id/history`

Respuesta HTTP 200: `Event[]`, ordenado por `timestamp` ascendente.

### `GET /lots/:id/verify`

Respuesta HTTP 200 exacta:

```ts
{
  valid: boolean;
  checks: Array<{
    eventHash: string;
    hashMatches: boolean;
    signatureValid: boolean;
    publicKeyHashMatches: boolean;
    chainHashMatches: boolean;
    continuityValid: boolean;
  }>;
}
```

El backend calcula `valid` como la conjunción de todas las propiedades booleanas de todos los elementos de `checks`. El frontend debe mostrar los cinco nombres reales de comprobación y no afirmar comprobaciones adicionales.

## Rutas auxiliares

### `GET /health`

Respuesta HTTP 200:

```ts
{ status: 'ok' }
```

## Lo que no existe en el API actual

- No existe `GET /actors` ni otra ruta para listar actores. El frontend puede conservar en memoria o almacenamiento local los actores creados durante la sesión, pero debe indicar que no es una consulta al servidor.
- No existe `GET /lots` para listar lotes. La selección de lote debe usar lotes creados en la sesión o permitir introducir el identificador.
- No existe endpoint para consultar si las herramientas de desarrollo están habilitadas.
- No existe endpoint de autenticación; `x-actor-address` es una selección de demostración y no autentica al usuario.
- No existe endpoint HTTP para mediciones. El frontend solo puede leer los archivos versionados `reports/gas-measurements.csv`, `reports/gas-measurements.json`, `reports/crypto-measurements.csv`, `reports/crypto-measurements.json` y `reports/measurements.md` si se exponen como assets.

## Implicaciones para pantallas solicitadas

- Actores: se muestra la respuesta del registro y una lista local de actores creados por la sesión; no se presentará como lista completa de actores del backend.
- Crear lote y transferir custodia: se usan directamente los esquemas anteriores.
- Detalle e historial: se usan `GET /lots/:id` y `GET /lots/:id/history`.
- Verificación: se muestran `valid` y las cinco comprobaciones reales de cada evento.
- Mediciones: se muestra “NO EJECUTADO” cuando un archivo no existe; no se crearán cifras de ejemplo.
- Manipulación: no se implementa hasta que el backend exponga de forma segura una señal o endpoint de desarrollo. El contrato actual no permite saber desde el frontend si está habilitado.

## Cambio mínimo de backend que sería útil en el futuro

Para una experiencia más completa harían falta, como mínimo, `GET /actors` y `GET /lots`. Para una herramienta de demostración de manipulación haría falta un endpoint explícito protegido por `ENABLE_DEV_TOOLS=true`, además de una respuesta de estado que permita al frontend saber si está habilitado. El frontend de esta etapa no requiere esos cambios y no modifica el contrato existente.

## Observación sobre Swagger

`src/swagger.ts` publica las rutas y resúmenes, pero actualmente no declara parámetros, encabezados, `requestBody` ni esquemas de respuesta. Por eso Swagger UI no ofrece formularios completos para este contrato; el frontend tipado será la interfaz principal de consumo.
