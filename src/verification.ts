export function isEventContinuous(
  index: number,
  prevEventHash: string | null,
  previousEventHash?: string,
): boolean {
  return index === 0 ? prevEventHash === null : prevEventHash === previousEventHash;
}
