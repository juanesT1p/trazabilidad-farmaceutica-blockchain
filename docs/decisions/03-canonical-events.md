# Decisión: eventos canónicos

Los eventos tienen exactamente `lotId`, `type`, `from`, `to`, `timestamp`, `metadata` y `prevEventHash`. Se serializan con el paquete `canonicalize` (orden estable de propiedades compatible con RFC 8785) y se hashean con SHA-256. La firma se calcula sobre los 32 bytes del hash; el mismo hash se fija en el contrato.
