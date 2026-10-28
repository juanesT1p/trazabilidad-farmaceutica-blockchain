import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoDir = resolve(frontendDir, '..');
const assets = [
  ['docs/limitations.md', 'public/docs/limitations.md'],
  ['reports/gas-measurements.csv', 'public/reports/gas-measurements.csv'],
  ['reports/gas-measurements.json', 'public/reports/gas-measurements.json'],
  ['reports/crypto-measurements.csv', 'public/reports/crypto-measurements.csv'],
  ['reports/crypto-measurements.json', 'public/reports/crypto-measurements.json'],
  ['reports/measurements.md', 'public/reports/measurements.md'],
];

for (const [source, destination] of assets) {
  const destinationPath = resolve(frontendDir, destination);
  await mkdir(dirname(destinationPath), { recursive: true });
  try {
    await copyFile(resolve(repoDir, source), destinationPath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
}
