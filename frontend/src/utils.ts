import type { Event, VerifyResponse } from './types';

export function shortHash(value: string, length = 10): string {
  if (value.length <= length * 2) return value;
  return `${value.slice(0, length)}…${value.slice(-length)}`;
}

export function shortAddress(value: string): string {
  return shortHash(value, 6);
}

export function formatDate(timestamp: number | string): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp * 1000) : new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? 'Fecha no disponible'
    : new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function metadataFromEntries(entries: Array<{ key: string; value: string }>): Record<string, unknown> {
  return entries.reduce<Record<string, unknown>>((metadata, entry) => {
    const key = entry.key.trim();
    if (!key) return metadata;
    try {
      metadata[key] = JSON.parse(entry.value);
    } catch {
      metadata[key] = entry.value;
    }
    return metadata;
  }, {});
}

export function downloadFile(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function eventsToCsv(events: Event[]): string {
  const headers = ['id', 'lotId', 'type', 'fromAddress', 'toAddress', 'timestamp', 'eventHash', 'txHash', 'blockNumber'];
  const rows = events.map((event) =>
    headers.map((header) => JSON.stringify(String(event[header as keyof Event] ?? ''))).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}

export function verificationToCsv(verification: VerifyResponse): string {
  const headers = [
    'eventHash',
    'hashMatches',
    'signatureValid',
    'publicKeyHashMatches',
    'chainHashMatches',
    'continuityValid',
  ];
  const rows = verification.checks.map((check) =>
    headers.map((header) => JSON.stringify(String(check[header as keyof typeof check]))).join(','),
  );
  return [headers.join(','), ...rows].join('\n');
}
