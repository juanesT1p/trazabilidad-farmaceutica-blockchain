import { z } from 'zod';

export const roleSchema = z.enum(['manufacturer', 'distributor', 'pharmacy', 'verifier']);
export type Role = z.infer<typeof roleSchema>;

export const levelSchema = z.union([z.literal(44), z.literal(65), z.literal(87)]);
export type MlDsaLevel = z.infer<typeof levelSchema>;

export const eventTypeSchema = z.enum(['LOT_CREATED', 'CUSTODY_TRANSFERRED']);
export type EventType = z.infer<typeof eventTypeSchema>;

export const actorInputSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  role: roleSchema,
  level: levelSchema.optional(),
  publicKey: z.string().base64().optional(),
});

export const lotInputSchema = z.object({
  lotId: z.string().min(1).max(128),
  metadata: z.record(z.string(), z.unknown()),
});

export const transferInputSchema = z.object({
  to: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  metadata: z.record(z.string(), z.unknown()).default({}),
});

export interface EventPayload {
  lotId: string;
  type: EventType;
  from: string | null;
  to: string;
  timestamp: number;
  metadata: Record<string, unknown>;
  prevEventHash: string | null;
}

export const roleToContractValue: Record<Role, number> = {
  manufacturer: 1,
  distributor: 2,
  pharmacy: 3,
  verifier: 4,
};
