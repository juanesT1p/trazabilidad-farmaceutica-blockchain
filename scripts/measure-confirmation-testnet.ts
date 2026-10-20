import { performance } from 'node:perf_hooks';
import { JsonRpcProvider, Wallet } from 'ethers';
import { config } from '../src/config.js';

if (!config.SEPOLIA_RPC_URL || !config.SEPOLIA_PRIVATE_KEY || !config.SEPOLIA_CONTRACT_ADDRESS) {
  console.log(
    'NO EJECUTADO: faltan SEPOLIA_RPC_URL, SEPOLIA_PRIVATE_KEY o SEPOLIA_CONTRACT_ADDRESS.',
  );
  process.exit(0);
}

const provider = new JsonRpcProvider(config.SEPOLIA_RPC_URL);
const wallet = new Wallet(config.SEPOLIA_PRIVATE_KEY, provider);
const start = performance.now();
const transaction = await wallet.sendTransaction({ to: wallet.address, value: 0 });
const receipt = await transaction.wait();
const elapsedMs = performance.now() - start;
console.log(
  JSON.stringify(
    {
      network: 'sepolia',
      txHash: receipt?.hash,
      blockNumber: receipt?.blockNumber,
      confirmationMs: elapsedMs,
    },
    null,
    2,
  ),
);
