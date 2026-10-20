# Trazabilidad de requisitos

| Requisito | Implementación                                         | Prueba o evidencia                                                       |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| RF-01     | `registerActor`, `POST /actors`, modelo `Actor`        | `PharmaCustodyRegistry.ts`: registro, duplicado y auto-registro          |
| RF-02     | `createLot`, `POST /lots`                              | prueba de fabricante, lote duplicado y metadatos                         |
| RF-03     | `transferCustody`, `POST /lots/:id/transfer`           | custodio actual, actor no registrado y verifier                          |
| RF-04     | `src/crypto.ts`, `Event.signature`, hashes en contrato | `crypto.test.ts` y flujo E2E local                                       |
| RF-05     | `GET /lots/:id`, `GET /lots/:id/history`               | rutas implementadas; health/API unit tests                               |
| RF-06     | `GET /lots/:id/verify`                                 | E2E: dos eventos válidos; hash, firma, clave y continuidad en `true`     |
| RF-07     | errores Solidity, Zod y autorización HTTP              | casos negativos de contrato, firma/evento alterado y custodio incorrecto |
| RNF-01    | `scripts/measure-gas.ts`                               | `reports/gas-measurements.*`, 30 repeticiones                            |
| RNF-02    | `scripts/measure-confirmation-testnet.ts`              | Script preparado; `NO EJECUTADO` sin credenciales                        |
| RNF-03    | `scripts/measure-crypto.ts`                            | `reports/crypto-measurements.*`, 500 + 25 calentamiento                  |
| RNF-04    | `.nvmrc`, lockfile, Docker Compose, README             | instalación documentada                                                  |
| RNF-05    | Hardhat + Vitest + cobertura v8                        | `5 passing`, `10 passed`, cobertura reportada                            |
| RNF-06    | Zod, `.gitignore`, claves locales ficticias            | lint, pruebas y revisión de artefactos                                   |
