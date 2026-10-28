import { describe, expect, it, vi } from 'vitest';
import { api } from '../api';

describe('api client', () => {
  it('sends the active actor header when creating a lot', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ id: 'LOTE-1' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await api.createLot({ lotId: 'LOTE-1', metadata: { producto: 'Prueba' } }, '0xabc');

    expect(fetchMock).toHaveBeenCalledWith('/lots', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ 'x-actor-address': '0xabc' }),
      body: JSON.stringify({ lotId: 'LOTE-1', metadata: { producto: 'Prueba' } }),
    }));
  });

  it('exposes the real API error message and status', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Actor is not current custodian' }),
    }));

    await expect(api.getHistory('LOTE-1')).rejects.toMatchObject({ status: 403, message: 'Actor is not current custodian' });
  });
});
