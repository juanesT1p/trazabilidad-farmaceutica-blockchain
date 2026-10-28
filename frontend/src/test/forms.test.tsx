import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AppShell } from '../components';
import { ActorsPage } from '../pages';

describe('actor form', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ actor: { address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', role: 'manufacturer', level: 65, publicKeyHash: '0xhash', publicKey: 'cHVi', createdAt: new Date().toISOString() }, transaction: { txHash: '0xtx', blockNumber: 1 } }),
    }));
  });

  it('validates and submits the actor form', async () => {
    render(<MemoryRouter initialEntries={['/actors']}><Routes><Route element={<AppShell />}><Route path="/actors" element={<ActorsPage />} /></Route></Routes></MemoryRouter>);

    fireEvent.change(screen.getByLabelText('Dirección EVM'), { target: { value: 'not-an-address' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByText(/dirección EVM válida/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Dirección EVM'), { target: { value: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(screen.getByLabelText('Nivel de protección post-cuántica')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Registrar actor' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Registrar actor' }));
    await waitFor(() => expect(screen.getByText('Actores registrados en esta sesión')).toBeInTheDocument());
    expect(screen.getAllByText(/Pfizer · demo · Fabricante · 0xf39f…b92266/).length).toBeGreaterThanOrEqual(1);
  });

  it('permite alternar entre modo día y modo noche', () => {
    render(<MemoryRouter initialEntries={['/actors']}><Routes><Route element={<AppShell />}><Route path="/actors" element={<ActorsPage />} /></Route></Routes></MemoryRouter>);

    const toggle = screen.getByRole('button', { name: 'Cambiar a modo noche' });
    fireEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Cambiar a modo día' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.documentElement.dataset.theme).toBe('dark');
  });
});
