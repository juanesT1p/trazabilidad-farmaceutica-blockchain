# Pharma Chain PQC Prototype

Prototipo académico, funcional y reproducible para registrar lotes farmacéuticos ficticios y transferir su custodia. Cada evento se canonicaliza, se hashea con SHA-256 y se firma fuera de la cadena con ML-DSA (FIPS 204). La cadena local solo fija hashes, actores y custodias.

No es un producto de producción. No usar datos, claves ni credenciales reales.

## Versiones fijadas

- Node objetivo: `24.x` LTS (`.nvmrc`). El entorno de ejecución de esta entrega tenía Node `v26.8.2` Current y npm `12.1.0`, por lo que npm mostró un aviso de engine; para reproducibilidad se recomienda Node 24.
- Hardhat `3.20.0`, Solidity `0.8.28`, ethers `6.17.0`.
- Express `5.3.0`, TypeScript `5.9.3`, Zod `4.6.7`, Vitest `5.0.5`.
- Prisma y `@prisma/client` `7.10.1`, `@prisma/adapter-pg` `7.10.1`, PostgreSQL `17.6-alpine`.
- `@noble/post-quantum` `0.7.1`, con `ml_dsa44`, `ml_dsa65` y `ml_dsa87` confirmados en los tipos instalados.

Las versiones transitivas y sus integridades están en `package-lock.json`.

## Instalación y ejecución

1. Usar Node 24 y npm.

2. Instalar dependencias:

   ```bash
   npm ci
   cp .env.example .env
   ```

3. Levantar PostgreSQL:

   ```bash
   docker compose up -d
   npm run prisma:generate
   npm run prisma:migrate -- --name init
   ```

   Si `5432` está ocupado, usar `POSTGRES_PORT=55432 docker compose up -d` y cambiar el puerto de `DATABASE_URL` en `.env`.

4. En otra terminal, iniciar la cadena y desplegar:

   ```bash
   npx hardhat node
   npx hardhat run --network localhost scripts/deploy-local.ts
   ```

   Copiar la dirección impresa a `REGISTRY_CONTRACT_ADDRESS`. Configurar en `.env` una o varias claves de las cuentas de desarrollo que imprime Hardhat (`CHAIN_PRIVATE_KEY` o `CHAIN_PRIVATE_KEYS_JSON`). No guardar esas claves en Git.

5. Iniciar la API:

   ```bash
   npm run dev
   ```

   Swagger está en `http://localhost:3000/docs` y health en `/health`.

## API

- `POST /actors`: registra `address`, `role`, y opcionalmente `level` (`44`, `65`, `87`) y `publicKey` base64. Si no se proporciona clave pública, genera un par ML-DSA de desarrollo en `keys/` (ignorado por Git). El actor debe tener una clave EVM local correspondiente para enviar su transacción.
- `POST /lots`: recibe `lotId` y `metadata`; requiere `x-actor-address` de un fabricante.
- `POST /lots/:id/transfer`: recibe `to` y `metadata`; requiere `x-actor-address` del custodio actual.
- `GET /lots/:id`: lote, eventos e información de cadena.
- `GET /lots/:id/history`: historial almacenado fuera de cadena.
- `GET /lots/:id/verify`: recalcula hashes, verifica firma ML-DSA, compara hashes de cadena y clave pública, y comprueba continuidad.
- `GET /health`: estado del servicio.

## Pruebas y calidad

```bash
npm run build
npm run lint
npm run compile
npm run test:contract
npm run test:unit
npm test
```

Resultados ejecutados en esta entrega: contrato `5 passing`; backend `10 passed`; cobertura Vitest `50.94%` statements, `25%` branches, `64.28%` functions y `53.06%` lines. La cobertura es informativa y no representa una garantía de producción.

## Mediciones

```bash
npx hardhat run scripts/measure-gas.ts
npm run measure:crypto
npm run measure:confirmation
```

Los dos primeros scripts escriben CSV/JSON en `reports/`; el informe consolidado es `reports/measurements.md`. La medición de confirmación de testnet es opcional y muestra `NO EJECUTADO` si faltan sus variables; no se ejecutó con credenciales públicas en esta entrega.

## Estructura

- `contracts/`: contrato Solidity.
- `src/`: API, Prisma adapter, canonicalización, ML-DSA y verificación.
- `prisma/`: esquema y migración PostgreSQL.
- `scripts/`: despliegue y mediciones reproducibles.
- `docs/`: arquitectura, trazabilidad, decisiones y limitaciones.
- `reports/`: resultados generados por ejecuciones reales.

## Seguridad de desarrollo

`keys/`, `.env`, cuentas Hardhat y el volumen local de PostgreSQL son únicamente artefactos de desarrollo. El almacén local no es gestión de claves de producción, no hay rotación, HSM, revocación ni control de acceso de usuarios.
