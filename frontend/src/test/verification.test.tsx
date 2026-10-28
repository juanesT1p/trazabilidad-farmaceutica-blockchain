import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VerificationChecks } from '../components';

describe('verification status', () => {
  it('shows explicit text and icons for every API check', () => {
    render(<VerificationChecks check={{ eventHash: '0xhash', hashMatches: true, signatureValid: false, publicKeyHashMatches: true, chainHashMatches: true, continuityValid: false }} />);

    expect(screen.getByText('Hash del evento: Sí')).toBeInTheDocument();
    expect(screen.getByText('Firma ML-DSA: No')).toBeInTheDocument();
    expect(screen.getByText('Continuidad: No')).toBeInTheDocument();
  });
});
