import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { BlockchainService } from '../src/blockchain.js';
import { config } from '../src/config.js';
import { hashPublicKey } from '../src/crypto.js';
import { roleSchema, type Role } from '../src/domain.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: config.DATABASE_URL }),
});
const blockchain = new BlockchainService();

try {
  const actors = await prisma.actor.findMany({ orderBy: { address: 'asc' } });

  for (const actor of actors) {
    const onChain = await blockchain.getActor(actor.address);
    if (onChain.registered) {
      console.log(`OK ${actor.address}: ya está registrado en la cadena`);
      continue;
    }

    const role = roleSchema.parse(actor.role) as Role;
    const publicKeyHash = hashPublicKey(Buffer.from(actor.publicKey, 'base64'));
    const transaction = await blockchain.registerActor(actor.address, role, publicKeyHash);
    console.log(`SYNC ${actor.address}: ${transaction.txHash}`);
  }
} finally {
  await prisma.$disconnect();
}
