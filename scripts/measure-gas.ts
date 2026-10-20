import { mkdir, writeFile } from 'node:fs/promises';
import { network } from 'hardhat';
import { keccak256, toUtf8Bytes } from 'ethers';
import { PharmaCustodyRegistry__factory } from '../types/ethers-contracts/factories/PharmaCustodyRegistry__factory.js';
import { median } from './stats.js';

const repetitions = 30;
const { ethers } = await network.create();
const signers = await ethers.getSigners();
const manufacturer = signers[0]!;
const distributor = signers[1]!;
const registry = await new PharmaCustodyRegistry__factory(manufacturer).deploy();
await registry.waitForDeployment();
const hash = (value: string) => keccak256(toUtf8Bytes(value));
await (await registry.registerActor(manufacturer.address, 1, hash('gas-manufacturer'))).wait();
await (
  await registry.connect(distributor).registerActor(distributor.address, 2, hash('gas-distributor'))
).wait();

const samples: Record<string, number[]> = { createLot: [], transferCustody: [] };
for (let index = 0; index < repetitions; index += 1) {
  const lotId = hash(`GAS-LOT-${index}`);
  const createReceipt = await (
    await registry.createLot(lotId, hash(`metadata-${index}`), hash(`create-${index}`))
  ).wait();
  samples.createLot!.push(Number(createReceipt!.gasUsed));
  const transferReceipt = await (
    await registry.transferCustody(lotId, distributor.address, hash(`transfer-${index}`))
  ).wait();
  samples.transferCustody!.push(Number(transferReceipt!.gasUsed));
}

const summary = Object.fromEntries(
  Object.entries(samples).map(([operation, values]) => {
    const mean = values.reduce((total, value) => total + value, 0) / values.length;
    const stdDev = Math.sqrt(
      values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length,
    );
    return [operation, { count: values.length, mean, median: median(values), stdDev, values }];
  }),
);
await mkdir('reports', { recursive: true });
await writeFile(
  'reports/gas-measurements.json',
  `${JSON.stringify({ repetitions, summary }, null, 2)}\n`,
);
await writeFile(
  'reports/gas-measurements.csv',
  `operation,count,meanGas,medianGas,stdDev\n${Object.entries(summary)
    .map(
      ([operation, data]) =>
        `${operation},${data.count},${data.mean},${data.median},${data.stdDev}`,
    )
    .join('\n')}\n`,
);
console.log(JSON.stringify({ repetitions, summary }, null, 2));
