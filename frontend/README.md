# Pharma Chain · frontend

Frontend React + Vite en español para operar y explicar el prototipo de trazabilidad farmacéutica.

## Requisitos

- Node.js 24.x y npm 12.x, según el proyecto raíz.
- Backend ejecutándose en `http://localhost:3000`.
- PostgreSQL y Hardhat levantados si se quieren ejecutar operaciones de escritura.

## Instalación y ejecución

Desde esta carpeta:

```bash
npm install
npm run dev
```

La interfaz queda en `http://localhost:5173`. En desarrollo, Vite hace proxy de `/actors`, `/lots` y `/health` hacia el backend, por lo que no se necesita abrir CORS.

Para cambiar el backend en otro entorno, copia `.env.example` a `.env` y define `VITE_API_BASE_URL`. No pongas claves privadas en este archivo.

## Calidad

```bash
npm run build
npm run lint
npm run test
```

`predev` y `prebuild` copian automáticamente `docs/limitations.md` y los resultados disponibles de `reports/` a assets públicos. Si un resultado no existe, la pantalla de mediciones muestra `NO EJECUTADO`.

## Alcance y datos locales

El selector de actor usa cuentas ficticias conocidas de Hardhat. Los actores y lotes creados en la sesión se guardan en `localStorage` porque el backend actual no tiene endpoints `GET /actors` ni `GET /lots`. Esto no es autenticación ni una fuente autoritativa.

La aplicación no recibe claves privadas: las transacciones las firma el backend con su configuración local.
