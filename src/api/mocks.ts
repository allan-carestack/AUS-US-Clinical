// In-memory mock backend. Seeds the procedure-code catalog from the bundled
// DENTAL_CODES and keeps a mutable list of treatment procedures for the demo
// patient so create/read round-trips work offline.

import { DENTAL_CODES } from '../components/CarePanel/dentalCodes';
import { demoContext } from './config';
import { ApiError } from './types';
import type {
  ProcedureCode,
  TreatmentProcedure,
  CreateTreatmentProcedureRequest,
} from './types';

// Catalog: derive ProcedureCode records from the front-end's DENTAL_CODES.
// `requires` is carried through so the mock can round-trip the tooth/surface
// requirement the real backend would infer server-side.
const mockCatalog: ProcedureCode[] = DENTAL_CODES.map((c, i) => ({
  procedureCodeId: 10_000 + i,
  code: c.code,
  description: c.description,
  cdtCategory: null,
  codeType: null,
  defaultBillingOrder: null,
  isICDCodeMandatory: false,
  isCodeOrtho: false,
  isForPatientsUnder18: false,
  effectiveDate: null,
  terminationDate: null,
  accountId: demoContext.accountId,
  requires: c.requires,
}));

const codeByProcedureId = new Map(mockCatalog.map(c => [c.procedureCodeId, c]));

// A couple of pre-existing procedures so the read flow returns real-looking data.
let nextProcedureId = 900;
const mockProcedures: TreatmentProcedure[] = [
  {
    treatmentProcedureId: ++nextProcedureId,
    patientId: demoContext.patientId,
    providerId: demoContext.providerId,
    locationId: demoContext.locationId,
    procedureCodeId: mockCatalog.find(c => c.code === '011')?.procedureCodeId ?? 10_000,
    code: '011',
    description: 'Comprehensive oral examination',
    tooth: null,
    surfaces: [],
    status: 'Proposed',
    statusName: 'Proposed',
    fee: 40,
    patientEstimate: 40,
    insuranceEstimate: 0,
    isCompleted: false,
  },
  {
    treatmentProcedureId: ++nextProcedureId,
    patientId: demoContext.patientId,
    providerId: demoContext.providerId,
    locationId: demoContext.locationId,
    procedureCodeId: mockCatalog.find(c => c.code === '615')?.procedureCodeId ?? 10_001,
    code: '615',
    description: 'Crown — full metal',
    tooth: '16',
    surfaces: [],
    status: 'Completed',
    statusName: 'Completed',
    fee: 40,
    patientEstimate: 40,
    insuranceEstimate: 0,
    isCompleted: true,
  },
];

// Route table. Paths mirror a conventional REST surface over the backend's
// MediatR controllers; adjust to the real routes when wiring live.
export function handleMock<T>(method: string, path: string, body: unknown): T {
  // GET /procedure-codes
  if (method === 'GET' && path.startsWith('/procedure-codes')) {
    return mockCatalog as unknown as T;
  }

  // GET /patients/:id/treatment-procedures
  const listMatch = path.match(/^\/patients\/(\d+)\/treatment-procedures/);
  if (method === 'GET' && listMatch) {
    const patientId = Number(listMatch[1]);
    return mockProcedures.filter(p => p.patientId === patientId) as unknown as T;
  }

  // POST /treatment-procedures
  if (method === 'POST' && path.startsWith('/treatment-procedures')) {
    const req = body as CreateTreatmentProcedureRequest;
    const catalog = codeByProcedureId.get(req.procedureCodeId);
    const created: TreatmentProcedure = {
      treatmentProcedureId: ++nextProcedureId,
      patientId: req.patientId,
      providerId: req.providerId,
      locationId: req.locationId,
      procedureCodeId: req.procedureCodeId,
      code: catalog?.code,
      description: catalog?.description,
      tooth: req.tooth ?? null,
      surfaces: req.surfaces ?? [],
      status: req.status,
      statusName: req.status,
      treatmentPlanId: req.treatmentPlanId ?? null,
      fee: 40,
      patientEstimate: 40,
      insuranceEstimate: 0,
      isCompleted: req.status === 'Completed',
    };
    mockProcedures.push(created);
    return created as unknown as T;
  }

  throw new ApiError(`No mock handler for ${method} ${path}`, 404, path);
}
