# Decisión: librería de firmas

Se eligió `@noble/post-quantum@0.7.1`. La documentación y los tipos instalados exponen `ml_dsa44`, `ml_dsa65` y `ml_dsa87` desde `@noble/post-quantum/ml-dsa.js`, con `keygen`, `sign`, `verify` y longitudes de clave. Es compatible con Node objetivo y no requiere binarios nativos.

La alternativa liboqs habría añadido una dependencia nativa y una cadena de instalación más pesada para un prototipo académico TypeScript. No se eligió un wrapper no mantenido ni se inventó una API. El nivel por defecto es ML-DSA-65 y puede cambiarse por actor o con `ML_DSA_LEVEL`.
