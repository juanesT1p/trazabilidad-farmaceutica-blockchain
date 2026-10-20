import { Contract, JsonRpcProvider, Wallet, keccak256, toUtf8Bytes } from 'ethers';
import { config } from './config.js';
import type { Role } from './domain.js';

const abi = [
  'function actors(address) view returns (bool registered, uint8 role, bytes32 publicKeyHash)',
  'function lots(bytes32) view returns (bool exists, bytes32 metadataHash, address custodian)',
  'function getLotEventHashes(bytes32) view returns (bytes32[])',
  'function registerActor(address actor, uint8 role, bytes32 publicKeyHash)',
  'function createLot(bytes32 lotId, bytes32 metadataHash, bytes32 eventHash)',
  'function transferCustody(bytes32 lotId, address to, bytes32 eventHash)',
];

const roleToValue: Record<Role, number> = {
  manufacturer: 1,
  distributor: 2,
  pharmacy: 3,
  verifier: 4,
};

export interface TransactionReceiptData {
  txHash: string;
  blockNumber: number;
}

export interface ChainLot {
  exists: boolean;
  metadataHash: string;
  custodian: string;
  eventHashes: string[];
}

export interface ChainActor {
  registered: boolean;
  role: number;
  publicKeyHash: string;
}

export function chainLotId(lotId: string): string {
  return keccak256(toUtf8Bytes(lotId));
}

export class BlockchainService {
  private readonly provider = new JsonRpcProvider(config.CHAIN_RPC_URL);
  private readonly contract: Contract;

  public constructor(address = config.REGISTRY_CONTRACT_ADDRESS) {
    if (!address) throw new Error('REGISTRY_CONTRACT_ADDRESS is required');
    this.contract = new Contract(address, abi, this.provider);
  }

  private signer(actorAddress: string): Wallet {
    let configuredKeys: Record<string, string> = {};
    if (config.CHAIN_PRIVATE_KEYS_JSON) {
      const parsed: unknown = JSON.parse(config.CHAIN_PRIVATE_KEYS_JSON);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        throw new Error('CHAIN_PRIVATE_KEYS_JSON must be an address-to-private-key object');
      }
      configuredKeys = parsed as Record<string, string>;
    }
    const privateKey = configuredKeys[actorAddress.toLowerCase()] ?? config.CHAIN_PRIVATE_KEY;
    if (!privateKey)
      throw new Error(
        'CHAIN_PRIVATE_KEY or CHAIN_PRIVATE_KEYS_JSON is required for write operations',
      );
    const signer = new Wallet(privateKey, this.provider);
    if (signer.address.toLowerCase() !== actorAddress.toLowerCase()) {
      throw new Error(`CHAIN_PRIVATE_KEY does not belong to ${actorAddress}`);
    }
    return signer;
  }

  private async wait(tx: {
    hash: string;
    wait: () => Promise<{ blockNumber: number } | null>;
  }): Promise<TransactionReceiptData> {
    const receipt = await tx.wait();
    if (!receipt) throw new Error('Transaction was not mined');
    return { txHash: tx.hash, blockNumber: receipt.blockNumber };
  }

  public async registerActor(
    actorAddress: string,
    role: Role,
    publicKeyHash: string,
  ): Promise<TransactionReceiptData> {
    const contract = this.contract.connect(this.signer(actorAddress));
    const tx = await contract.getFunction('registerActor')(
      actorAddress,
      roleToValue[role],
      publicKeyHash,
    );
    return this.wait(tx);
  }

  public async createLot(
    actorAddress: string,
    lotId: string,
    metadataHash: string,
    eventHash: string,
  ): Promise<TransactionReceiptData> {
    const contract = this.contract.connect(this.signer(actorAddress));
    const tx = await contract.getFunction('createLot')(chainLotId(lotId), metadataHash, eventHash);
    return this.wait(tx);
  }

  public async transferCustody(
    actorAddress: string,
    lotId: string,
    to: string,
    eventHash: string,
  ): Promise<TransactionReceiptData> {
    const contract = this.contract.connect(this.signer(actorAddress));
    const tx = await contract.getFunction('transferCustody')(chainLotId(lotId), to, eventHash);
    return this.wait(tx);
  }

  public async getLot(lotId: string): Promise<ChainLot> {
    const key = chainLotId(lotId);
    const result = await this.contract.getFunction('lots')(key);
    const eventHashes = await this.contract.getFunction('getLotEventHashes')(key);
    return { exists: result[0], metadataHash: result[1], custodian: result[2], eventHashes };
  }

  public async getActor(address: string): Promise<ChainActor> {
    const result = await this.contract.getFunction('actors')(address);
    return { registered: result[0], role: Number(result[1]), publicKeyHash: result[2] };
  }
}
