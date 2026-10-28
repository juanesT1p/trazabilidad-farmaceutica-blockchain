# Trazabilidad de requisitos

| Requisito | Implementación                                         | Prueba o evidencia                                                       |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------ |
| RF-01     | `registerActor`, `POST /actors`, modelo `Actor`; `frontend/src/pages.tsx:ActorsPage` | `PharmaCustodyRegistry.ts`: registro, duplicado y auto-registro; prueba de formulario |
| RF-02     | `createLot`, `POST /lots`; `frontend/src/pages.tsx:CreateLotPage` | prueba de fabricante, lote duplicado y metadatos; formulario y preview JSON |
| RF-03     | `transferCustody`, `POST /lots/:id/transfer`; `frontend/src/pages.tsx:TransferPage` | custodio actual, actor no registrado y verifier; aviso de custodio |
| RF-04     | `src/crypto.ts`, `Event.signature`, hashes en contrato; cliente tipado y recorrido guiado | `crypto.test.ts`, flujo E2E local y paneles de evidencia |
| RF-05     | `GET /lots/:id`, `GET /lots/:id/history`; `frontend/src/pages.tsx:LotDetailPage` | rutas implementadas; timeline, detalle y proxy Vite |
| RF-06     | `GET /lots/:id/verify`; `frontend/src/pages.tsx:VerifyPage` | E2E: dos eventos válidos; checks explícitos y exportación JSON/CSV |
| RF-07     | errores Solidity, Zod y autorización HTTP; estados de error del frontend | casos negativos de contrato, firma/evento alterado y custodio incorrecto |
| RF-08     | Etiqueta legible no autoritativa: `Actor.displayName` nullable en PostgreSQL/API y `ActorIdentity` en frontend | validación Zod, índice único sin distinguir mayúsculas, prueba de duplicado y `display-name-verification.test.ts` |
| RNF-01    | `scripts/measure-gas.ts`; `frontend/src/pages.tsx:MeasurementsPage` | `reports/gas-measurements.*`, 30 repeticiones y tabla visual |
| RNF-02    | `scripts/measure-confirmation-testnet.ts` | Script preparado; `NO EJECUTADO` sin credenciales |
| RNF-03    | `scripts/measure-crypto.ts`; `frontend/src/pages.tsx:MeasurementsPage` | `reports/crypto-measurements.*`, 500 + 25 calentamiento y tabla |
| RNF-04    | `.nvmrc`, lockfiles, Docker Compose, README y `frontend/README.md` | instalación documentada para backend y frontend |
| RNF-05    | Hardhat + Vitest + cobertura v8; Vitest + Testing Library en frontend | `5 passing`, `13 passed`, `5 frontend passed`, cobertura reportada |
| RNF-06    | Zod, `.gitignore`, claves locales ficticias y proxy Vite | lint, pruebas y revisión de artefactos; no se envían secretos |
| Frontend-01 | `frontend/src/pages.tsx`: recorrido guiado de cinco pasos | `frontend/src/test/forms.test.tsx`, ejecución real contra API local |
| Frontend-02 | `frontend/src/components.tsx`: actor activo y aviso de demostración | inspección visual y proxy Vite |
| Frontend-03 | `frontend/src/api.ts`, formularios Zod y Query | `frontend/src/test/api.test.ts`, `npm run build`, `npm run lint` |
| Frontend-04 | detalle, verificación y exportación JSON/CSV | `frontend/src/test/verification.test.tsx`, flujo local `valid: true` |
| Frontend-05 | `frontend/src/pages.tsx`: mediciones y limitaciones | lectura de `reports/*.json` y copia de `docs/limitations.md` |
