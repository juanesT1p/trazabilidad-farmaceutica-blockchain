import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createApp } from '../../src/app.js';
import type {
  canonicalEvent,
  hashCanonicalJson,
  hashPublicKey,
  signEvent,
  verifyEventSignature,
} from '../../src/crypto.js';

type CryptoModule = {
  canonicalEvent: typeof canonicalEvent;
  hashCanonicalJson: typeof hashCanonicalJson;
  hashPublicKey: typeof hashPublicKey;
  signEvent: typeof signEvent;
  verifyEventSignature: typeof verifyEventSignature;
};

vi.mock('../../src/crypto.js', async () => {
  const actual = await vi.importActual<CryptoModule>('../../src/crypto.js');
  return {
    ...actual,
    hashCanonicalJson: vi.fn(() => '0xevent-hash'),
    hashPublicKey: vi.fn(() => '0xpublic-key-hash'),
    verifyEventSignature: vi.fn(() => true),
  };
});

describe('actor displayName isolation', () => {
  it('does not change GET /lots/:id/verify when only the actor label changes', async () => {
    const actor = {
      address: '0x0000000000000000000000000000000000000001',
      displayName: 'Nombre inicial',
      publicKey: 'cHVi',
    };
    const event = {
      id: 'event-1',
      lotId: 'LOT-001',
      type: 'LOT_CREATED',
      fromAddress: null,
      toAddress: actor.address,
      timestamp: 1_700_000_000n,
      metadata: { product: 'demo' },
      prevEventHash: null,
      eventHash: '0xevent-hash',
      signature: '0xsignature',
      level: 65,
      txHash: '0xtx',
      blockNumber: 1n,
    };
    const prisma = {
      lot: { findUnique: vi.fn().mockResolvedValue({ id: 'LOT-001', events: [event] }) },
      actor: { findUnique: vi.fn().mockResolvedValue(actor) },
    } as unknown as PrismaClient;
    const blockchain = {
      getLot: vi.fn().mockResolvedValue({ exists: true, metadataHash: '0xmetadata', custodian: actor.address, eventHashes: [event.eventHash] }),
      getActor: vi.fn().mockResolvedValue({ registered: true, role: 1, publicKeyHash: '0xpublic-key-hash' }),
    } as never;
    const app = createApp({ prisma, blockchain, keys: {} as never });

    const initial = await request(app).get('/lots/LOT-001/verify');
    actor.displayName = 'Nombre cambiado';
    const renamed = await request(app).get('/lots/LOT-001/verify');

    expect(initial.status).toBe(200);
    expect(renamed.status).toBe(200);
    expect(renamed.body).toEqual(initial.body);
    expect(renamed.body.valid).toBe(true);
  });
});
