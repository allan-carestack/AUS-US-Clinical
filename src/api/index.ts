// Public surface of the clinical API client.
export * from './types';
export { apiConfig, demoContext } from './config';
export type { ClinicalContext } from './config';
export { listProcedureCodes, listDentalCodes, toDentalCode, inferRequirement } from './procedureCodes';
export {
  listTreatmentProcedures,
  createTreatmentProcedure,
  buildCreateRequest,
  toBackendSurfaces,
  fromBackendSurfaces,
  toProcedureStatus,
} from './treatmentProcedures';
export type { ChartProcedureInput } from './treatmentProcedures';
