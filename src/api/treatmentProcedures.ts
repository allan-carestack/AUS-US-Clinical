// Treatment-procedure read/write flows + mapping between the backend DTO and
// the front-end's flat ChartEntry-style shape.

import { apiFetch } from './client';
import { demoContext } from './config';
import type {
  TreatmentProcedure,
  CreateTreatmentProcedureRequest,
  TreatmentProcedureStatus,
  BackendSurfaceCode,
} from './types';

// ── Read ──
export function listTreatmentProcedures(
  patientId: number = demoContext.patientId,
  signal?: AbortSignal,
): Promise<TreatmentProcedure[]> {
  return apiFetch<TreatmentProcedure[]>(
    `/patients/${patientId}/treatment-procedures`,
    { signal },
  );
}

// ── Write ──
export function createTreatmentProcedure(
  req: CreateTreatmentProcedureRequest,
  signal?: AbortSignal,
): Promise<TreatmentProcedure> {
  return apiFetch<TreatmentProcedure>('/treatment-procedures', {
    method: 'POST',
    body: req,
    signal,
  });
}

// ── Surface mapping ──
// Front-end surface letters → backend surface columns. M/O/D/B/L/I map 1:1.
// P (palatal) has no backend column — mapped to L (lingual), its anatomical
// counterpart on upper teeth. OPEN QUESTION: confirm P→L is acceptable, or
// whether the backend expects a quadrant-aware distinction. F (facial) is
// backend-only and never produced by the front-end.
const SURFACE_MAP: Record<string, BackendSurfaceCode | undefined> = {
  M: 'M', O: 'O', D: 'D', B: 'B', L: 'L', I: 'I', P: 'L',
};

export function toBackendSurfaces(surface: string): BackendSurfaceCode[] {
  return surface
    .toUpperCase()
    .split('')
    .map(ch => SURFACE_MAP[ch])
    .filter((s): s is BackendSurfaceCode => Boolean(s));
}

export function fromBackendSurfaces(surfaces?: BackendSurfaceCode[]): string {
  return (surfaces ?? []).join('');
}

// ── ChartEntry ↔ DTO ──
// The front-end status tags are 'Proposed' | 'Completed' | 'Active condition' …
// Only the ones with a clean backend counterpart are mapped; default Proposed.
export function toProcedureStatus(frontEndStatus: string): TreatmentProcedureStatus {
  const s = frontEndStatus.toLowerCase();
  if (s.includes('complete')) return 'Completed';
  if (s.includes('accept')) return 'Accepted';
  if (s.includes('reject')) return 'Rejected';
  if (s.includes('hold')) return 'Hold';
  return 'Proposed';
}

export interface ChartProcedureInput {
  procedureCodeId: number;
  tooth?: string;
  surface?: string;
  status?: string;
}

export function buildCreateRequest(input: ChartProcedureInput): CreateTreatmentProcedureRequest {
  return {
    patientId: demoContext.patientId,
    providerId: demoContext.providerId,
    locationId: demoContext.locationId,
    procedureCodeId: input.procedureCodeId,
    tooth: input.tooth || null,
    surfaces: input.surface ? toBackendSurfaces(input.surface) : [],
    status: input.status ? toProcedureStatus(input.status) : 'Proposed',
  };
}
