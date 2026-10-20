import { mkdir, writeFile } from 'node:fs/promises';
import { network } from 'hardhat';

const { ethers } = await network.create();
const registry = await ethers.deployContract('PharmaCustodyRegistry');
await registry.waitForDeployment();
const address = await registry.getAddress();
await mkdir('data', { recursive: true });
await writeFile(
  'data/local-deployment.json',
  `${JSON.stringify({ address, deployedAt: new Date().toISOString() }, null, 2)}\n`,
);
console.log(`PharmaCustodyRegistry deployed at ${address}`);
