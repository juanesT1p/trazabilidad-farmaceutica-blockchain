import express, { type NextFunction, type Request, type Response } from 'express';
import swaggerUi from 'swagger-ui-express';
import type { Prisma, PrismaClient } from './generated/prisma/client.js';
import { z, ZodError } from 'zod';
import type { BlockchainService } from './blockchain.js';
import { config } from './config.js';
import {
  actorInputSchema,
  lotInputSchema,
  transferInputSchema,
  type EventPayload,
  type MlDsaLevel,
} from './domain.js';
import {
  canonicalEvent,
  hashCanonicalJson,
  hashPublicKey,
  signEvent,
  verifyEventSignature,
} from './crypto.js';
import type { PqcKeyStore } from './crypto.js';
import { openApiDocument } from './swagger.js';
import { isEventContinuous } from './verification.js';

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

class HttpError extends Error {
  public constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface AppDependencies {
  prisma: PrismaClient;
  blockchain: BlockchainService;
  keys: PqcKeyStore;
}

export function createApp(dependencies: AppDependencies): express.Express {
  const app = express();
  app.use(express.json({ limit: '128kb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/settings', (_req, res) => {
    res.json({
      environment: config.NODE_ENV,
      rpcUrl: config.CHAIN_RPC_URL,
      contractAddress: dependencies.blockchain.getContractAddress(),
      runtimeOverride: dependencies.blockchain.hasRuntimeOverride(),
    });
  });
  app.put('/settings/contract', (req, res, next) => {
    try {
      if (config.NODE_ENV === 'production') throw new HttpError(403, 'Runtime settings are disabled in production');
      const input = z.object({ contractAddress: z.string().regex(/^0x[0-9a-fA-F]{40}$/) }).parse(req.body);
      dependencies.blockchain.setContractAddress(input.contractAddress);
      res.json({
        environment: config.NODE_ENV,
        rpcUrl: config.CHAIN_RPC_URL,
        contractAddress: dependencies.blockchain.getContractAddress(),
        runtimeOverride: dependencies.blockchain.hasRuntimeOverride(),
      });
    } catch (error) {
      next(error);
    }
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

  app.get('/actors/:address', async (req, res, next) => {
    try {
      const address = z.string().regex(/^0x[0-9a-fA-F]{40}$/).parse(req.params.address).toLowerCase();
      const actor = await dependencies.prisma.actor.findUnique({ where: { address } });
      if (!actor) throw new HttpError(404, `Actor "${address}" not found`);
      const chain = await dependencies.blockchain.getActor(address);
      res.json({ actor, chain });
    } catch (error) {
      next(error);
    }
  });

  app.post('/actors', async (req, res, next) => {
    try {
      const input = actorInputSchema.parse(req.body);
      const level = (input.level ?? config.ML_DSA_LEVEL) as MlDsaLevel;
      const address = input.address.toLowerCase();
      const existingActor = await dependencies.prisma.actor.findUnique({ where: { address } });
      if (existingActor) throw new HttpError(409, `Actor "${address}" is already registered`);
      if (input.displayName) {
        const duplicate = await dependencies.prisma.actor.findFirst({
          where: { displayName: { equals: input.displayName, mode: 'insensitive' } },
        });
        if (duplicate) throw new HttpError(409, `displayName "${input.displayName}" is already registered`);
      }
      const publicKey = input.publicKey ? Buffer.from(input.publicKey, 'base64') : undefined;
      const key = await dependencies.keys.ensure(address, level, publicKey);
      const publicKeyBytes = Buffer.from(key.publicKey, 'base64');
      const publicKeyHash = hashPublicKey(publicKeyBytes);
      const tx = await dependencies.blockchain.registerActor(address, input.role, publicKeyHash);
      let actor;
      try {
        actor = await dependencies.prisma.actor.create({
          data: {
            address,
            displayName: input.displayName ?? null,
            role: input.role,
            level,
            publicKeyHash,
            publicKey: key.publicKey,
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error))
          throw new HttpError(409, `displayName "${input.displayName}" is already registered`);
        throw error;
      }
      res.status(201).json({ actor, transaction: tx });
    } catch (error) {
      next(error);
    }
  });

  app.post('/lots', async (req, res, next) => {
    try {
      const input = lotInputSchema.parse(req.body);
      const actorAddress = String(req.header('x-actor-address') ?? '').toLowerCase();
      if (!actorAddress) throw new HttpError(400, 'x-actor-address is required');
      const actor = await dependencies.prisma.actor.findUnique({
        where: { address: actorAddress },
      });
      if (!actor || actor.role !== 'manufacturer')
        throw new HttpError(403, 'Actor is not a manufacturer');
      const previous = await dependencies.prisma.event.findFirst({ where: { lotId: input.lotId } });
      if (previous) throw new HttpError(409, 'Lot already exists');
      const payload: EventPayload = {
        lotId: input.lotId,
        type: 'LOT_CREATED',
        from: null,
        to: actorAddress,
        timestamp: Math.floor(Date.now() / 1000),
        metadata: input.metadata,
        prevEventHash: null,
      };
      const canonicalJson = canonicalEvent(payload);
      const eventHash = hashCanonicalJson(payload);
      const signature = await signEvent(dependencies.keys, actorAddress, eventHash);
      const metadataHash = hashCanonicalJson(input.metadata);
      const tx = await dependencies.blockchain.createLot(
        actorAddress,
        input.lotId,
        metadataHash,
        eventHash,
      );
      const lot = await dependencies.prisma.lot.create({
        data: {
          id: input.lotId,
          metadataHash,
          currentCustodian: actorAddress,
          events: {
            create: {
              type: payload.type,
              fromAddress: null,
              toAddress: actorAddress,
              timestamp: BigInt(payload.timestamp),
              metadata: input.metadata as Prisma.InputJsonValue,
              prevEventHash: null,
              eventHash,
              canonicalJson,
              signature: signature.signature,
              level: signature.level,
              txHash: tx.txHash,
              blockNumber: BigInt(tx.blockNumber),
            },
          },
        },
        include: { events: true },
      });
      res.status(201).json({ ...lot, events: lot.events.map(serializeEvent) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/lots/:id/transfer', async (req, res, next) => {
    try {
      const input = transferInputSchema.parse(req.body);
      const actorAddress = String(req.header('x-actor-address') ?? '').toLowerCase();
      if (!actorAddress) throw new HttpError(400, 'x-actor-address is required');
      const lot = await dependencies.prisma.lot.findUnique({
        where: { id: req.params.id },
        include: { events: { orderBy: { timestamp: 'desc' }, take: 1 } },
      });
      if (!lot) throw new HttpError(404, 'Lot not found');
      if (lot.currentCustodian !== actorAddress)
        throw new HttpError(403, 'Actor is not current custodian');
      const recipient = await dependencies.prisma.actor.findUnique({
        where: { address: input.to.toLowerCase() },
      });
      if (!recipient || recipient.role === 'verifier')
        throw new HttpError(400, 'Recipient cannot hold custody');
      const previousEvent = lot.events[0];
      const payload: EventPayload = {
        lotId: lot.id,
        type: 'CUSTODY_TRANSFERRED',
        from: actorAddress,
        to: recipient.address,
        timestamp: Math.floor(Date.now() / 1000),
        metadata: input.metadata,
        prevEventHash: previousEvent?.eventHash ?? null,
      };
      const canonicalJson = canonicalEvent(payload);
      const eventHash = hashCanonicalJson(payload);
      const signature = await signEvent(dependencies.keys, actorAddress, eventHash);
      const tx = await dependencies.blockchain.transferCustody(
        actorAddress,
        lot.id,
        recipient.address,
        eventHash,
      );
      const updated = await dependencies.prisma.$transaction(async (database) => {
        await database.lot.update({
          where: { id: lot.id },
          data: { currentCustodian: recipient.address },
        });
        return database.event.create({
          data: {
            lotId: lot.id,
            type: payload.type,
            fromAddress: actorAddress,
            toAddress: recipient.address,
            timestamp: BigInt(payload.timestamp),
            metadata: input.metadata as Prisma.InputJsonValue,
            prevEventHash: payload.prevEventHash,
            eventHash,
            canonicalJson,
            signature: signature.signature,
            level: signature.level,
            txHash: tx.txHash,
            blockNumber: BigInt(tx.blockNumber),
          },
        });
      });
      res.status(201).json(serializeEvent(updated));
    } catch (error) {
      next(error);
    }
  });

  app.get('/lots/:id', async (req, res, next) => {
    try {
      const lot = await dependencies.prisma.lot.findUnique({
        where: { id: req.params.id },
        include: { events: { orderBy: { timestamp: 'asc' } } },
      });
      if (!lot) throw new HttpError(404, 'Lot not found');
      const chainLot = await dependencies.blockchain.getLot(lot.id);
      res.json({ ...lot, events: lot.events.map(serializeEvent), chain: chainLot });
    } catch (error) {
      next(error);
    }
  });

  app.get('/lots/:id/history', async (req, res, next) => {
    try {
      const events = await dependencies.prisma.event.findMany({
        where: { lotId: req.params.id },
        orderBy: { timestamp: 'asc' },
      });
      if (events.length === 0) throw new HttpError(404, 'Lot history not found');
      res.json(events.map(serializeEvent));
    } catch (error) {
      next(error);
    }
  });

  app.get('/lots/:id/verify', async (req, res, next) => {
    try {
      const lot = await dependencies.prisma.lot.findUnique({
        where: { id: req.params.id },
        include: { events: { orderBy: { timestamp: 'asc' } } },
      });
      if (!lot) throw new HttpError(404, 'Lot not found');
      const chain = await dependencies.blockchain.getLot(lot.id);
      const checks = await Promise.all(
        lot.events.map(async (event, index) => {
          const payload: EventPayload = {
            lotId: event.lotId,
            type: event.type as EventPayload['type'],
            from: event.fromAddress,
            to: event.toAddress,
            timestamp: Number(event.timestamp),
            metadata: event.metadata as Record<string, unknown>,
            prevEventHash: event.prevEventHash,
          };
          const recalculatedHash = hashCanonicalJson(payload);
          const actor = await dependencies.prisma.actor.findUnique({
            where: { address: event.fromAddress ?? event.toAddress },
          });
          const chainActor = await dependencies.blockchain.getActor(
            event.fromAddress ?? event.toAddress,
          );
          const signatureValid = actor
            ? verifyEventSignature(
                event.level as MlDsaLevel,
                actor.publicKey,
                recalculatedHash,
                event.signature,
              )
            : false;
          const publicKeyHashMatches = actor
            ? hashPublicKey(Buffer.from(actor.publicKey, 'base64')) === chainActor.publicKeyHash
            : false;
          const continuityValid = isEventContinuous(
            index,
            event.prevEventHash,
            lot.events[index - 1]?.eventHash,
          );
          return {
            eventHash: event.eventHash,
            hashMatches: recalculatedHash === event.eventHash,
            signatureValid,
            publicKeyHashMatches,
            chainHashMatches: chain.eventHashes[index] === event.eventHash,
            continuityValid,
          };
        }),
      );
      res.json({ valid: checks.every((check) => Object.values(check).every(Boolean)), checks });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    void _next;
    if (error instanceof ZodError)
      return res.status(400).json({ error: 'Invalid input', details: error.issues });
    if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
    const message = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: message });
  });
  return app;
}

function serializeEvent<T extends { timestamp: bigint; blockNumber: bigint }>(
  event: T,
): Omit<T, 'timestamp' | 'blockNumber'> & { timestamp: number; blockNumber: number } {
  return { ...event, timestamp: Number(event.timestamp), blockNumber: Number(event.blockNumber) };
}
