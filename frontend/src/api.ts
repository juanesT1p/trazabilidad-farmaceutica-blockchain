import type {
  Actor,
  ActorRegistrationResponse,
  Event,
  LotDetail,
  Role,
  VerifyResponse,
} from './types';

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

export interface ActorInput {
  address: string;
  displayName?: string;
  role: Role;
  level?: 44 | 65 | 87;
}

export interface LotInput {
  lotId: string;
  metadata: Record<string, unknown>;
}

export interface TransferInput {
  to: string;
  metadata: Record<string, unknown>;
}

export interface RuntimeSettings {
  environment: string;
  rpcUrl: string;
  contractAddress: string;
  runtimeOverride: boolean;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly details: unknown;

  public constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...init.headers,
      },
    });
    const contentType = response.headers.get('content-type') ?? '';
    const body: unknown = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      const errorBody = body as { error?: string; details?: unknown };
      throw new ApiError(
        errorBody.error ?? `La API respondió con HTTP ${response.status}`,
        response.status,
        errorBody.details,
      );
    }
    return body as T;
  } catch (error) {
    const method = (init.method ?? 'GET').toUpperCase();
    const canRetry = retry && (method === 'GET' || method === 'HEAD');
    if (canRetry && error instanceof TypeError) {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      return request<T>(path, init, false);
    }
    throw error;
  }
}

const jsonHeaders = { 'Content-Type': 'application/json' };

export const api = {
  getSettings() {
    return request<RuntimeSettings>('/settings');
  },

  updateContractAddress(contractAddress: string) {
    return request<RuntimeSettings>('/settings/contract', {
      method: 'PUT',
      headers: jsonHeaders,
      body: JSON.stringify({ contractAddress }),
    });
  },

  getActor(address: string) {
    return request<{ actor: Actor; chain: { registered: boolean; role: number; publicKeyHash: string } }>(`/actors/${encodeURIComponent(address)}`);
  },

  registerActor(input: ActorInput) {
    return request<ActorRegistrationResponse>('/actors', {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(input),
    });
  },

  createLot(input: LotInput, actorAddress: string) {
    return request<LotDetail>('/lots', {
      method: 'POST',
      headers: { ...jsonHeaders, 'x-actor-address': actorAddress },
      body: JSON.stringify(input),
    });
  },

  transferCustody(lotId: string, input: TransferInput, actorAddress: string) {
    return request<Event>(`/lots/${encodeURIComponent(lotId)}/transfer`, {
      method: 'POST',
      headers: { ...jsonHeaders, 'x-actor-address': actorAddress },
      body: JSON.stringify(input),
    });
  },

  getLot(lotId: string) {
    return request<LotDetail>(`/lots/${encodeURIComponent(lotId)}`);
  },

  getHistory(lotId: string) {
    return request<Event[]>(`/lots/${encodeURIComponent(lotId)}/history`);
  },

  verifyLot(lotId: string) {
    return request<VerifyResponse>(`/lots/${encodeURIComponent(lotId)}/verify`);
  },

  health() {
    return request<{ status: string }>('/health');
  },
};

export function apiErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}
