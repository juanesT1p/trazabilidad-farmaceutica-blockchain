import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { Wallet, getBytes, recoverAddress } from 'ethers';
import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import { summarize, type Summary } from './stats.js';

const repetitions = 500;
const warmup = 25;
const message = getBytes('0x' + 'ab'.repeat(32));
const algorithms = { 44: ml_dsa44, 65: ml_dsa65, 87: ml_dsa87 } as const;

type Measurement = {
  algorithm: string;
  repetitions: number;
  publicKeyBytes: number;
  secretKeyBytes: number;
  signatureBytes: number;
  keygen: Summary;
  sign: Summary;
  verify: Summary;
};

async function measureMlDsa(level: keyof typeof algorithms): Promise<Measurement> {
  const dsa = algorithms[level];
  for (let index = 0; index < warmup; index += 1) {
    const key = dsa.keygen();
    const signature = dsa.sign(message, key.secretKey);
    dsa.verify(signature, message, key.publicKey);
  }
  const keygenTimes: number[] = [];
  const signTimes: number[] = [];
  const verifyTimes: number[] = [];
  let publicKeyBytes = 0;
  let secretKeyBytes = 0;
  let signatureBytes = 0;
  for (let index = 0; index < repetitions; index += 1) {
    const keygenStart = performance.now();
    const key = dsa.keygen();
    keygenTimes.push(performance.now() - keygenStart);
    publicKeyBytes = key.publicKey.length;
    secretKeyBytes = key.secretKey.length;
    const signStart = performance.now();
    const signature = dsa.sign(message, key.secretKey);
    signTimes.push(performance.now() - signStart);
    signatureBytes = signature.length;
    const verifyStart = performance.now();
    if (!dsa.verify(signature, message, key.publicKey))
      throw new Error(`ML-DSA-${level} verification failed`);
    verifyTimes.push(performance.now() - verifyStart);
  }
  return {
    algorithm: `ML-DSA-${level}`,
    repetitions,
    publicKeyBytes,
    secretKeyBytes,
    signatureBytes,
    keygen: summarize(keygenTimes),
    sign: summarize(signTimes),
    verify: summarize(verifyTimes),
  };
}

async function measureEcdsa(): Promise<Measurement> {
  for (let index = 0; index < warmup; index += 1) {
    const wallet = Wallet.createRandom();
    const signature = wallet.signingKey.sign(message).serialized;
    recoverAddress(message, signature);
  }
  const keygenTimes: number[] = [];
  const signTimes: number[] = [];
  const verifyTimes: number[] = [];
  let publicKeyBytes = 0;
  let signatureBytes = 0;
  for (let index = 0; index < repetitions; index += 1) {
    const keygenStart = performance.now();
    const wallet = Wallet.createRandom();
    keygenTimes.push(performance.now() - keygenStart);
    publicKeyBytes = getBytes(wallet.signingKey.publicKey).length;
    const signStart = performance.now();
    const signature = wallet.signingKey.sign(message).serialized;
    signTimes.push(performance.now() - signStart);
    signatureBytes = getBytes(signature).length;
    const verifyStart = performance.now();
    if (recoverAddress(message, signature) !== wallet.address)
      throw new Error('ECDSA verification failed');
    verifyTimes.push(performance.now() - verifyStart);
  }
  return {
    algorithm: 'ECDSA-secp256k1',
    repetitions,
    publicKeyBytes,
    secretKeyBytes: 32,
    signatureBytes,
    keygen: summarize(keygenTimes),
    sign: summarize(signTimes),
    verify: summarize(verifyTimes),
  };
}

const results = [
  await measureEcdsa(),
  await measureMlDsa(44),
  await measureMlDsa(65),
  await measureMlDsa(87),
];
await mkdir('reports', { recursive: true });
await writeFile(
  'reports/crypto-measurements.json',
  `${JSON.stringify({ repetitions, warmup, results }, null, 2)}\n`,
);
const csvRows = [
  'algorithm,repetitions,publicKeyBytes,secretKeyBytes,signatureBytes,operation,meanMs,medianMs,p95Ms,stdDevMs',
];
for (const result of results) {
  for (const [operation, summary] of Object.entries({
    keygen: result.keygen,
    sign: result.sign,
    verify: result.verify,
  })) {
    csvRows.push(
      `${result.algorithm},${result.repetitions},${result.publicKeyBytes},${result.secretKeyBytes},${result.signatureBytes},${operation},${summary.meanMs},${summary.medianMs},${summary.p95Ms},${summary.stdDevMs}`,
    );
  }
}
await writeFile('reports/crypto-measurements.csv', `${csvRows.join('\n')}\n`);
console.log(JSON.stringify({ repetitions, warmup, results }, null, 2));
