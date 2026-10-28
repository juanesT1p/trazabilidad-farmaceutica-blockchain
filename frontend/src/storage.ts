import type { Actor, Lot } from './types';

const activeActorKey = 'pharma-chain-active-actor';
const actorsKey = 'pharma-chain-actors';
const lotsKey = 'pharma-chain-lots';

function read<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function getActiveActor(): string {
  return window.localStorage.getItem(activeActorKey) ?? '';
}

export function setActiveActor(address: string): void {
  window.localStorage.setItem(activeActorKey, address);
}

export function getStoredActors(): Actor[] {
  return read<Actor[]>(actorsKey, []);
}

export function saveActor(actor: Actor): Actor[] {
  const actors = getStoredActors().filter((item) => item.address !== actor.address);
  const updated = [...actors, actor];
  write(actorsKey, updated);
  return updated;
}

export function getStoredLots(): Lot[] {
  return read<Lot[]>(lotsKey, []);
}

export function saveLot(lot: Lot): Lot[] {
  const lots = getStoredLots().filter((item) => item.id !== lot.id);
  const updated = [...lots, lot];
  write(lotsKey, updated);
  return updated;
}
