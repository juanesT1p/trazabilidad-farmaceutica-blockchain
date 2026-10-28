import { performance } from 'node:perf_hooks';
import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import * as canonicalizeModule from 'canonicalize';

const canonicalize = canonicalizeModule.default as unknown as (
  input: unknown,
) => string | undefined;

const algorithms = { 44: ml_dsa44, 65: ml_dsa65, 87: ml_dsa87 } as const;
type Level = keyof typeof algorithms;

function selectedLevel(): Level {
  const value = Number(process.env.ML_DSA_LEVEL ?? 65);
  if (value !== 44 && value !== 65 && value !== 87) {
    throw new Error('ML_DSA_LEVEL debe ser 44, 65 o 87');
  }
  return value;
}

const level = selectedLevel();
const dsa = algorithms[level];
const metadata = {
  lotId: 'LOTE-001',
  producto: 'Amoxicilina 500 mg',
  cantidad: 1000,
  loteFabricacion: 'FAB-2026-001',
  fechaVencimiento: '2028-10-22',
  temperaturaC: 4,
};
const json = canonicalize(metadata);
if (json === undefined) throw new Error('No fue posible canonizar el JSON de prueba');
const message = Buffer.from(json, 'utf8');

const keygenStart = performance.now();
const keyPair = dsa.keygen();
const keygenMs = performance.now() - keygenStart;

const signStart = performance.now();
const signature = dsa.sign(message, keyPair.secretKey);
const signMs = performance.now() - signStart;

const verifyStart = performance.now();
const verified = dsa.verify(signature, message, keyPair.publicKey);
const verifyMs = performance.now() - verifyStart;

if (!verified) throw new Error(`La verificación de ML-DSA-${level} falló`);

const signatureBytes = Buffer.byteLength(Buffer.from(signature));
const publicKeyBytes = Buffer.byteLength(Buffer.from(keyPair.publicKey));

console.log(`\nMétricas criptográficas — ML-DSA-${level}`);
console.log(`JSON canonizado: ${json}`);
console.table([
  { operación: 'Generación de llaves', milisegundos: keygenMs.toFixed(3) },
  { operación: 'Firmado', milisegundos: signMs.toFixed(3) },
  { operación: 'Verificación', milisegundos: verifyMs.toFixed(3) },
]);
console.log(`Clave pública: ${publicKeyBytes} bytes`);
console.log(`Firma: ${signatureBytes} bytes`);
console.log(`Verificación válida: ${verified}`);
