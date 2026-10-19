// Procedure-code catalog flow + mapping to the front-end's DentalCode shape.

import { apiFetch } from './client';
import type { ProcedureCode } from './types';
import type { DentalCode } from '../components/CarePanel/dentalCodes';
import type { ToothRequirement } from '../components/CarePanel/data';

export function listProcedureCodes(signal?: AbortSignal): Promise<ProcedureCode[]> {
  return apiFetch<ProcedureCode[]>('/procedure-codes', { signal });
}

// The backend has no explicit "requires tooth/surface" flag — it's inferred
// server-side from code type / smart-code logic. This mirrors that inference
// on the client. If the mock/back end already carries `requires`, trust it.
export function inferRequirement(code: ProcedureCode): ToothRequirement {
  if (code.requires) return code.requires;
  const cat = (code.cdtCategory ?? '').toLowerCase();
  if (/(restor|filling|inlay|onlay|veneer)/.test(cat)) return 'surface';
  if (/(implant|crown|bridge|endo|extraction|surg|graft)/.test(cat)) return 'tooth';
  return 'none';
}

export function toDentalCode(code: ProcedureCode): DentalCode {
  return {
    code: code.code,
    description: code.description,
    requires: inferRequirement(code),
    icdRequired: code.isICDCodeMandatory,
  };
}

export async function listDentalCodes(signal?: AbortSignal): Promise<DentalCode[]> {
  const codes = await listProcedureCodes(signal);
  return codes.map(toDentalCode);
}
