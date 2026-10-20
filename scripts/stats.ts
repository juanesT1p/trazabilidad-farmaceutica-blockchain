export interface Summary {
  count: number;
  meanMs: number;
  medianMs: number;
  p95Ms: number;
  stdDevMs: number;
}

export function summarize(values: number[]): Summary {
  const sorted = [...values].sort((a, b) => a - b);
  const meanMs = values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - meanMs) ** 2, 0) / values.length;
  const percentile = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)] ?? 0;
  return {
    count: values.length,
    meanMs,
    medianMs: percentile(0.5),
    p95Ms: percentile(0.95),
    stdDevMs: Math.sqrt(variance),
  };
}

export function median(values: number[]): number {
  return summarize(values).medianMs;
}
