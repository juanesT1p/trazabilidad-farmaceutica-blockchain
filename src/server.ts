import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { createApp } from './app.js';
import { BlockchainService } from './blockchain.js';
import { config } from './config.js';
import { PqcKeyStore } from './crypto.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});
const app = createApp({
  prisma,
  blockchain: new BlockchainService(),
  keys: new PqcKeyStore(config.DEV_KEYS_DIR),
});

const server = app.listen(config.PORT, () => {
  console.log(`Pharma Chain API listening on http://localhost:${config.PORT}`);
});

async function shutdown(): Promise<void> {
  server.close();
  await prisma.$disconnect();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
