// TypeScript mirrors of the carestack.clinical backend DTOs.
//
// Sources (repowise, indexed commit 47bdc67fdf52):
//  - ProcedureCode:        CareStack.FeeSchedule/.../Entities/ProcedureCodeEntity.cs
//  - TreatmentProcedure:   CareStack.Clinical.TreatmentProcedures/.../Models/TreatmentProcedureBaseModel.cs
//                          + .../Domain/Entities/TreatmentProcedure.cs
//  - Status enum:          .../Application/Enums/TreatmentProcedureStatus.cs
//
// JSON casing note: .NET commonly serializes as camelCase (System.Text.Json
// default) — these interfaces assume camelCase. If the backend emits PascalCase,
// flip `client.ts`'s response normalization rather than renaming every field.

import type { ToothRequirement } from '../components/CarePanel/data';

// ── Procedure code catalog (FeeSchedule.ProcedureCodeEntity) ──
export interface ProcedureCode {
  procedureCodeId: number;
  code: string;
  description: string;
  cdtCategory?: string | null;
  codeType?: string | null;
  defaultBillingOrder?: string | null;
  isICDCodeMandatory: boolean;
  isCodeOrtho: boolean;
  isForPatientsUnder18: boolean;
  effectiveDate?: string | null;
  terminationDate?: string | null;
  accountId: number;
  // Client-derived — the backend does NOT expose a "requires tooth/surface"
  // flag directly; it's inferred from code type / smart-code logic. See
  // `inferRequirement` in procedureCodes.ts.
  requires?: ToothRequirement;
}

// ── Lifecycle status (TreatmentProcedureStatus enum) ──
export type TreatmentProcedureStatus =
  | 'None'
  | 'Proposed'
  | 'Recommended'
  | 'Accepted'
  | 'Rejected'
  | 'Alternative'
  | 'Hold'
  | 'ReferredOut'
  | 'Completed'
  | 'Presented'
  | 'ServiceCompleted';

// Tooth surfaces the backend tracks (TreatmentProcedure entity: B/L/M/O/F/D/I).
// NOTE: the front-end prototype uses M/O/D/B/L/I/P — P (palatal) has no direct
// backend column and F (facial) has no front-end equivalent. See SURFACE_MAP
// in treatmentProcedures.ts for the best-effort mapping and the open question.
export type BackendSurfaceCode = 'B' | 'L' | 'M' | 'O' | 'F' | 'D' | 'I';

// ── A charted procedure (read model, subset of TreatmentProcedureBaseModel) ──
export interface TreatmentProcedure {
  treatmentProcedureId: number;
  patientId: number;
  providerId: number;
  locationId: number;
  procedureCodeId: number;
  /** Denormalized code + description, if the backend includes the ProcedureCode nav. */
  code?: string;
  description?: string;
  tooth?: string | null;
  /** Surface flags that are set on this procedure. */
  surfaces?: BackendSurfaceCode[];
  status: TreatmentProcedureStatus;
  statusName?: string;
  treatmentPlanId?: number | null;
  treatmentPlanPhaseId?: number | null;
  appointmentId?: number | null;
  proposedDate?: string | null;
  dateOfService?: string | null;
  fee?: number | null;
  patientEstimate?: number | null;
  insuranceEstimate?: number | null;
  isCompleted: boolean;
}

// ── Create request (what the prototype sends when a pending row completes) ──
export interface CreateTreatmentProcedureRequest {
  patientId: number;
  providerId: number;
  locationId: number;
  procedureCodeId: number;
  tooth?: string | null;
  surfaces?: BackendSurfaceCode[];
  status: TreatmentProcedureStatus;
  treatmentPlanId?: number | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly path: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
