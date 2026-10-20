import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  canonicalEvent,
  createKeyPair,
  hashCanonicalJson,
  PqcKeyStore,
  signEvent,
  verifyEventSignature,
} from '../../src/crypto.js';
import type { EventPayload } from '../../src/domain.js';

describe('ML-DSA event signatures', () => {
  const address = '0x0000000000000000000000000000000000000001';
  let keysDir: string;

  beforeAll(async () => {
    keysDir = await mkdtemp(join(tmpdir(), 'pharma-chain-'));
  });

  afterAll(async () => {
    await rm(keysDir, { recursive: true, force: true });
  });

  it.each([44, 65, 87] as const)('generates and verifies ML-DSA-%i', async (level) => {
    const key = createKeyPair(level);
    const payload = {
      lotId: 'LOT-ACADEMIC-001',
      type: 'LOT_CREATED' as const,
      from: null,
      to: address,
      timestamp: 1_700_000_000,
      metadata: { fictional: true, level },
      prevEventHash: null,
    };
    const eventHash = hashCanonicalJson(payload);
    const stored = new PqcKeyStore(keysDir);
    await stored.save(`${address}-${level}`, key);
    const result = await signEvent(stored, `${address}-${level}`, eventHash);
    expect(verifyEventSignature(level, key.publicKey, eventHash, result.signature)).toBe(true);
    expect(
      verifyEventSignature(
        level,
        key.publicKey,
        hashCanonicalJson({ ...payload, timestamp: 1 }),
        result.signature,
      ),
    ).toBe(false);
    expect(
      verifyEventSignature(level, key.publicKey, eventHash, `${result.signature.slice(0, -2)}00`),
    ).toBe(false);
  });

  it('uses stable RFC 8785-style canonical JSON for the event hash', () => {
    const eventA: EventPayload = {
      lotId: 'LOT-1',
      type: 'LOT_CREATED',
      from: null,
      to: address,
      timestamp: 1,
      metadata: { b: 2, a: 1 },
      prevEventHash: null,
    };
    const eventB: EventPayload = {
      prevEventHash: null,
      metadata: { a: 1, b: 2 },
      timestamp: 1,
      to: address,
      from: null,
      type: 'LOT_CREATED',
      lotId: 'LOT-1',
    };
    expect(canonicalEvent(eventA)).toBe(canonicalEvent(eventB));
    expect(hashCanonicalJson(eventA)).toBe(hashCanonicalJson(eventB));
  });
});
