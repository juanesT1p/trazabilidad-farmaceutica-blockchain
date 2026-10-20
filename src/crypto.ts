import { createHash, randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { getBytes, hexlify, keccak256 } from 'ethers';
import { ml_dsa44, ml_dsa65, ml_dsa87 } from '@noble/post-quantum/ml-dsa.js';
import * as canonicalizeModule from 'canonicalize';
import type { EventPayload, MlDsaLevel } from './domain.js';

type Dsa = typeof ml_dsa44;
export type StoredKey = { level: MlDsaLevel; publicKey: string; secretKey: string };

const canonicalize = canonicalizeModule.default as unknown as (
  input: unknown,
) => string | undefined;

const algorithms: Record<MlDsaLevel, Dsa> = { 44: ml_dsa44, 65: ml_dsa65, 87: ml_dsa87 };

function algorithm(level: MlDsaLevel): Dsa {
  return algorithms[level];
}

function keyPath(keysDir: string, address: string): string {
  return join(keysDir, 'pqc', `${address.toLowerCase()}.json`);
}

export function canonicalEvent(event: EventPayload): string {
  const output = canonicalize(event);
  if (output === undefined) throw new Error('Event cannot be canonicalized');
  return output;
}

export function hashCanonicalJson(value: unknown): string {
  const output = canonicalize(value);
  if (output === undefined) throw new Error('Value cannot be canonicalized');
  return `0x${createHash('sha256').update(output, 'utf8').digest('hex')}`;
}

export function hashPublicKey(publicKey: Uint8Array): string {
  return keccak256(publicKey);
}

export function createKeyPair(level: MlDsaLevel): StoredKey {
  const dsa = algorithm(level);
  const pair = dsa.keygen(new Uint8Array(randomBytes(dsa.lengths.seed!)));
  return {
    level,
    publicKey: Buffer.from(pair.publicKey).toString('base64'),
    secretKey: Buffer.from(pair.secretKey).toString('base64'),
  };
}

export class PqcKeyStore {
  public constructor(private readonly keysDir: string) {}

  public async save(address: string, key: StoredKey): Promise<void> {
    const path = keyPath(this.keysDir, address);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(key, null, 2)}\n`, { mode: 0o600 });
  }

  public async load(address: string): Promise<StoredKey> {
    const value = await readFile(keyPath(this.keysDir, address), 'utf8');
    return JSON.parse(value) as StoredKey;
  }

  public async ensure(
    address: string,
    level: MlDsaLevel,
    publicKey?: Uint8Array,
  ): Promise<StoredKey> {
    try {
      const stored = await this.load(address);
      if (publicKey && Buffer.from(stored.publicKey, 'base64').compare(publicKey) !== 0) {
        throw new Error('Stored public key does not match the requested public key');
      }
      return stored;
    } catch {
      if (publicKey) {
        throw new Error(
          'A matching development private key must be provisioned locally before registration',
        );
      }
      const generated = createKeyPair(level);
      await this.save(address, generated);
      return generated;
    }
  }
}

export async function signEvent(
  store: PqcKeyStore,
  address: string,
  eventHash: string,
): Promise<{ signature: string; level: MlDsaLevel }> {
  const key = await store.load(address);
  const signature = algorithm(key.level).sign(
    getBytes(eventHash),
    Buffer.from(key.secretKey, 'base64'),
  );
  return { signature: hexlify(signature), level: key.level };
}

export function verifyEventSignature(
  level: MlDsaLevel,
  publicKey: string,
  eventHash: string,
  signature: string,
): boolean {
  try {
    return algorithm(level).verify(
      getBytes(signature),
      getBytes(eventHash),
      Buffer.from(publicKey, 'base64'),
    );
  } catch {
    return false;
  }
}
