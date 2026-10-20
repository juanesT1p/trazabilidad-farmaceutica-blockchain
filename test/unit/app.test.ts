import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { PrismaClient } from '../../src/generated/prisma/client.js';
import { createApp } from '../../src/app.js';
import { PqcKeyStore } from '../../src/crypto.js';

function makeApp() {
  const prisma = {
    actor: { findUnique: vi.fn(), create: vi.fn() },
    lot: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    event: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
  } as unknown as PrismaClient;
  const blockchain = {
    registerActor: vi.fn(),
    createLot: vi.fn(),
    transferCustody: vi.fn(),
    getLot: vi.fn(),
  } as never;
  return {
    app: createApp({ prisma, blockchain, keys: new PqcKeyStore('/tmp/pharma-chain-test-keys') }),
    prisma,
  };
}

describe('HTTP API validation and authorization', () => {
  it('reports health without database or chain access', async () => {
    const { app } = makeApp();
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('rejects malformed actor input with Zod details', async () => {
    const { app } = makeApp();
    const response = await request(app)
      .post('/actors')
      .send({ address: 'not-an-address', role: 'manufacturer' });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Invalid input');
  });

  it('rejects lot creation without an actor header', async () => {
    const { app } = makeApp();
    const response = await request(app).post('/lots').send({ lotId: 'LOT-001', metadata: {} });
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('x-actor-address');
  });

  it('rejects transfer by an actor who is not the current custodian', async () => {
    const { app, prisma } = makeApp();
    vi.mocked(prisma.lot.findUnique).mockResolvedValue({
      id: 'LOT-001',
      currentCustodian: '0x0000000000000000000000000000000000000001',
      events: [],
    } as never);
    const response = await request(app)
      .post('/lots/LOT-001/transfer')
      .set('x-actor-address', '0x0000000000000000000000000000000000000002')
      .send({ to: '0x0000000000000000000000000000000000000003' });
    expect(response.status).toBe(403);
    expect(response.body.error).toContain('current custodian');
  });
});
