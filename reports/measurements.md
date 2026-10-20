# Informe de mediciones

Fecha local de ejecución: 2026-10-19. Las cifras siguientes provienen de ejecuciones reales de los scripts; los datos completos están en los CSV/JSON vecinos.

## Entorno

- Sistema: Linux `shadow 7.2.6-1-cachyos`, x86_64.
- CPU: AMD Ryzen 7 5825U with Radeon Graphics, 16 CPUs.
- Node observado: `v26.8.2`; npm `12.1.0`.
- Docker `29.8.1`; Docker Compose `5.5.1`.
- Cadena: Hardhat local, Solidity `0.8.28`, 30 repeticiones de gas.

## Gas

| Operación         |   n | Media gas | Mediana gas | Desviación estándar |
| ----------------- | --: | --------: | ----------: | ------------------: |
| `createLot`       |  30 |  140686.2 |      140691 |   5.878775382679627 |
| `transferCustody` |  30 |   64332.6 |       64335 |    5.71314274283428 |

## Firmas

Calentamiento: 25 iteraciones. Medición: 500 iteraciones por algoritmo. Tiempos en milisegundos.

| Algoritmo       | Clave pública | Clave secreta | Firma | Operación |       Media |  Mediana |       p95 | Desv. estándar |
| --------------- | ------------: | ------------: | ----: | --------- | ----------: | -------: | --------: | -------------: |
| ECDSA-secp256k1 |            65 |            32 |    65 | keygen    | 3.713418562 | 3.662229 |  4.020543 |    0.191545956 |
| ECDSA-secp256k1 |            65 |            32 |    65 | sign      | 0.275284120 | 0.265068 |  0.340111 |    0.037505221 |
| ECDSA-secp256k1 |            65 |            32 |    65 | verify    | 1.465947634 | 1.446676 |  1.623708 |    0.096316747 |
| ML-DSA-44       |          1312 |          2560 |  2420 | keygen    | 0.722900660 | 0.713350 |  0.777985 |    0.048307910 |
| ML-DSA-44       |          1312 |          2560 |  2420 | sign      | 3.148019948 | 2.430543 |  7.250699 |    2.138872316 |
| ML-DSA-44       |          1312 |          2560 |  2420 | verify    | 0.832789564 | 0.825218 |  0.879534 |    0.048901165 |
| ML-DSA-65       |          1952 |          4032 |  3309 | keygen    | 1.242149712 | 1.236124 |  1.307750 |    0.055085764 |
| ML-DSA-65       |          1952 |          4032 |  3309 | sign      | 5.473995342 | 4.467281 | 12.006870 |    3.725886610 |
| ML-DSA-65       |          1952 |          4032 |  3309 | verify    | 1.331877476 | 1.322907 |  1.424196 |    0.072858911 |
| ML-DSA-87       |          2592 |          4896 |  4627 | keygen    | 1.968487842 | 1.954763 |  2.081717 |    0.103404429 |
| ML-DSA-87       |          2592 |          4896 |  4627 | sign      | 6.521400268 | 5.438678 | 13.882292 |    3.574559578 |
| ML-DSA-87       |          2592 |          4896 |  4627 | verify    | 2.129863932 | 2.116228 |  2.261294 |    0.104447239 |

## Confirmación

**NO EJECUTADO** contra testnet pública: no se proporcionaron credenciales ni se envió ninguna transacción fuera de la cadena local. El script opcional queda preparado en `scripts/measure-confirmation-testnet.ts`.
