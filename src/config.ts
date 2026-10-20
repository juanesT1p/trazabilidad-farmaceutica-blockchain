import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://prototype:prototype@localhost:5432/pharma_chain?schema=public'),
  CHAIN_RPC_URL: z.string().url().default('http://127.0.0.1:8545'),
  REGISTRY_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
  CHAIN_PRIVATE_KEYS_JSON: z.string().optional(),
  CHAIN_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .optional(),
  ML_DSA_LEVEL: z.coerce
    .number()
    .refine((value) => [44, 65, 87].includes(value))
    .default(65),
  DEV_KEYS_DIR: z.string().default('keys'),
  SEPOLIA_RPC_URL: z.string().url().optional(),
  SEPOLIA_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .optional(),
  SEPOLIA_CONTRACT_ADDRESS: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
});

export const config = envSchema.parse(process.env);
