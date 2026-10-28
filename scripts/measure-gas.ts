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

const samples: Record<string, number[]> = {
  registerActor: [],
  createLot: [],
  transferCustody: [],
};

const actorSigners = signers.slice(0, Math.min(signers.length, 10));
for (const [index, actor] of actorSigners.entries()) {
  const receipt = await (
    await registry
      .connect(actor)
      .registerActor(actor.address, index === 0 ? 1 : 2, hash(`gas-actor-${index}`))
  ).wait();
  samples.registerActor!.push(Number(receipt!.gasUsed));
}

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
console.table(
  Object.entries(summary).map(([operation, data]) => ({
    función: operation,
    muestras: data.count,
    mediaGas: Math.round(data.mean),
    medianaGas: data.median,
  })),
);
