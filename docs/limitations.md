# Limitaciones

1. Lo post-cuántico se aplica únicamente en la capa de aplicación. Las transacciones de la cadena local siguen firmándose con ECDSA/secp256k1; por tanto, la cadena **no es post-cuántica**.
2. No se mide consumo energético de ninguna red.
3. `@noble/post-quantum` es una implementación auditable y mantenida, pero este prototipo no la trata como librería auditada para producción.
4. La cadena es local, las cuentas son de desarrollo y todos los datos del caso farmacéutico son ficticios.
5. El almacén de claves local ignorado por Git no es gestión de claves de producción.
6. No hay interfaz gráfica, IoT, pagos, tokens, red principal, revocación, HSM, control de acceso multiusuario ni recuperación de claves.
7. Las transacciones y la escritura PostgreSQL no forman una transacción distribuida: si una confirmación de cadena ocurre antes de un fallo de base de datos, se requiere reconciliación manual.
8. El contrato no verifica ML-DSA dentro de Solidity; solo fija hashes y reglas de custodia.
9. El benchmark depende del CPU, sistema operativo, versión de Node y carga del proceso; sus cifras son una ejecución local, no una caracterización universal.
