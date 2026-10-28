export type Role = 'manufacturer' | 'distributor' | 'pharmacy' | 'verifier';
export type MlDsaLevel = 44 | 65 | 87;
export type EventType = 'LOT_CREATED' | 'CUSTODY_TRANSFERRED';

export interface Transaction {
  txHash: string;
  blockNumber: number;
}

export interface Actor {
  address: string;
  displayName: string | null;
  role: Role;
  level: number;
  publicKeyHash: string;
  publicKey: string;
  createdAt: string;
}

export interface ActorRegistrationResponse {
  actor: Actor;
  transaction: Transaction;
}

export interface Event {
  id: string;
  lotId: string;
  type: EventType;
  fromAddress: string | null;
  toAddress: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  prevEventHash: string | null;
  eventHash: string;
  canonicalJson: string;
  signature: string;
  level: number;
  txHash: string;
  blockNumber: number;
  createdAt: string;
}

export interface ChainLot {
  exists: boolean;
  metadataHash: string;
  custodian: string;
  eventHashes: string[];
}

export interface Lot {
  id: string;
  metadataHash: string;
  currentCustodian: string;
  createdAt: string;
  events: Event[];
}

export interface LotDetail extends Lot {
  chain: ChainLot;
}

export interface VerifyCheck {
  eventHash: string;
  hashMatches: boolean;
  signatureValid: boolean;
  publicKeyHashMatches: boolean;
  chainHashMatches: boolean;
  continuityValid: boolean;
}

export interface VerifyResponse {
  valid: boolean;
  checks: VerifyCheck[];
}

export interface DevAccount {
  address: string;
  label: string;
}

export interface KeyValueItem {
  key: string;
  value: string;
}

export const devAccounts: DevAccount[] = [
  { address: '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266', label: 'Pfizer · demo' },
  { address: '0x70997970c51812dc3a010c7d01b50e0d17dc79c8', label: 'Roche · demo' },
  { address: '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', label: 'Novartis · demo' },
  { address: '0x90f79bf6eb2c4f870365e785982e1f101e93b906', label: 'Johnson & Johnson · demo' },
  { address: '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65', label: 'AstraZeneca · demo' },
  { address: '0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc', label: 'Bayer · demo' },
  { address: '0x976ea74026e726554db657fa54763abd0c3a0aa9', label: 'Sanofi · demo' },
];

export const roleLabels: Record<Role, string> = {
  manufacturer: 'Fabricante',
  distributor: 'Distribuidor',
  pharmacy: 'Farmacia',
  verifier: 'Verificador',
};

export const eventLabels: Record<EventType, string> = {
  LOT_CREATED: 'Lote creado',
  CUSTODY_TRANSFERRED: 'Custodia transferida',
};
