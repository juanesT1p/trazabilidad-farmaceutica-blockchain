# Limitaciones

1. Lo post-cuántico se aplica únicamente en la capa de aplicación. Las transacciones de la cadena local siguen firmándose con ECDSA/secp256k1; por tanto, la cadena **no es post-cuántica**.
2. No se mide consumo energético de ninguna red.
3. `@noble/post-quantum` es una implementación auditable y mantenida, pero este prototipo no la trata como librería auditada para producción.
4. La cadena es local, las cuentas son de desarrollo y todos los datos del caso farmacéutico son ficticios.
5. El almacén de claves local ignorado por Git no es gestión de claves de producción.
6. La interfaz gráfica es únicamente una UI de demostración; no hay IoT, pagos, tokens, red principal, revocación, HSM, control de acceso multiusuario ni recuperación de claves.
7. Las transacciones y la escritura PostgreSQL no forman una transacción distribuida: si una confirmación de cadena ocurre antes de un fallo de base de datos, se requiere reconciliación manual.
8. El contrato no verifica ML-DSA dentro de Solidity; solo fija hashes y reglas de custodia.
9. El benchmark depende del CPU, sistema operativo, versión de Node y carga del proceso; sus cifras son una ejecución local, no una caracterización universal.
10. El nombre es una etiqueta descriptiva; la dirección no demuestra la identidad real de una persona o empresa; vincular cuentas con entidades legales queda como trabajo futuro.

## Herramienta de manipulación de demostración

No se incluye un endpoint de manipulación porque el backend actual no tiene una señal de modo desarrollo ni una ruta segura para limitarlo a un entorno local. El frontend no muestra un botón ficticio.

Para una demostración manual, únicamente sobre una copia local de PostgreSQL y con el backend detenido, puede alterarse un metadato de un evento conocido. El `eventHash` y la firma no se recalculan, por lo que `GET /lots/:id/verify` debería detectar la inconsistencia:

```sql
BEGIN;
UPDATE "Event"
SET "metadata" = jsonb_set("metadata", '{demoAltered}', '"alterado"', true)
WHERE "lotId" = 'LOTE-DE-PRUEBA';
COMMIT;
```

Esto es destructivo para el registro local; hacer una copia de la base antes y no ejecutarlo con datos reales. Una futura herramienta segura necesitaría `ENABLE_DEV_TOOLS=true`, autorización explícita y una respuesta de estado para que el frontend supiera si está habilitada.
