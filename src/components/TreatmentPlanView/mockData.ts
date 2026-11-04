import type { ToothRequirement } from '../CarePanel/data';

/** dataTransfer type carrying `{ ids: string[] }` while codes are dragged from the plan table (read by the planner sidebar). */
export const PROCEDURE_DRAG_TYPE = 'application/x-tx-procedures';

export type PlanProcedure = {
  id: string;
  date: string;
  code: string;
  /** Catalog code string when known (used to finalize pending tooth/surface). */
  codeId?: string;
  /** Tooth/surface/area requirement for pending-row UX (mirrors ChipDef.requires). */
  requires?: ToothRequirement;
  thArea: string;
  surface: string;
  provider: string;
  location: string;
  fee: string;
  discount: string;
  patPayable: string;
  status: 'Proposed' | 'Completed' | 'Accepted';
};

export type PlanPhase = {
  id: string;
  name: string;
  showNewCodesHint?: boolean;
  procedures: PlanProcedure[];
  estimate?: {
    fee: string;
    discount: string;
    patPayable: string;
  };
};

export type TreatmentPlanMock = {
  status: string;
  linkedConditions: number;
  phasesCompleted: number;
  phasesTotal: number;
  phases: PlanPhase[];
  totals: {
    planEstimate: string;
    discount: string;
    patientPayable: string;
  };
};

const ALL_ON_4: TreatmentPlanMock = {
  status: 'Planned',
  linkedConditions: 3,
  phasesCompleted: 0,
  phasesTotal: 2,
  phases: [
    {
      id: 'phase-1',
      name: 'Phase 1',
      showNewCodesHint: true,
      procedures: [
        {
          id: 'p1',
          date: '16/03/2026',
          code: '011 - Comprehensive oral examination',
          thArea: '--',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$65.00',
          discount: '$0.00',
          patPayable: '$20.00',
          status: 'Proposed',
        },
        {
          id: 'p2',
          date: '16/03/2026',
          code: '073 - Photographic records – extraoral – per appointment',
          thArea: 'URQ',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$65.00',
          discount: '$0.00',
          patPayable: '$20.00',
          status: 'Proposed',
        },
        {
          id: 'p3',
          date: '16/03/2026',
          code: '073 - Photographic records – extraoral – per appointment',
          thArea: 'LRQ',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$1,140.00',
          discount: '$0.00',
          patPayable: '$560.00',
          status: 'Proposed',
        },
      ],
      estimate: {
        fee: '$1,270.00',
        discount: '$0.00',
        patPayable: '$600.00',
      },
    },
    {
      id: 'phase-2',
      name: 'Phase 2',
      procedures: [
        {
          id: 'p4',
          date: '16/03/2026',
          code: '661 - Implant body — first stage surgery',
          thArea: '14',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$2,200.00',
          discount: '$0.00',
          patPayable: '$1,100.00',
          status: 'Proposed',
        },
        {
          id: 'p5',
          date: '16/03/2026',
          code: '661 - Implant body — first stage surgery',
          thArea: '24',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$2,200.00',
          discount: '$0.00',
          patPayable: '$1,100.00',
          status: 'Proposed',
        },
        {
          id: 'p6',
          date: '16/03/2026',
          code: '012 - Periodic oral evaluation',
          thArea: '--',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$65.00',
          discount: '$0.00',
          patPayable: '$20.00',
          status: 'Proposed',
        },
      ],
      estimate: {
        fee: '$4,465.00',
        discount: '$0.00',
        patPayable: '$2,220.00',
      },
    },
    {
      id: 'phase-3',
      name: 'Phase 3',
      procedures: [
        {
          id: 'p7',
          date: '16/03/2026',
          code: '663 - Implant body — second stage surgery',
          thArea: '14',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$950.00',
          discount: '$0.00',
          patPayable: '$480.00',
          status: 'Proposed',
        },
        {
          id: 'p8',
          date: '16/03/2026',
          code: '663 - Implant body — second stage surgery',
          thArea: '24',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$950.00',
          discount: '$0.00',
          patPayable: '$480.00',
          status: 'Proposed',
        },
        {
          id: 'p9',
          date: '16/03/2026',
          code: '572 - Crown — re-cementation',
          thArea: '14',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$320.00',
          discount: '$0.00',
          patPayable: '$160.00',
          status: 'Proposed',
        },
      ],
      estimate: {
        fee: '$2,220.00',
        discount: '$0.00',
        patPayable: '$1,120.00',
      },
    },
  ],
  totals: {
    planEstimate: '$7,985.00',
    discount: '$20.00',
    patientPayable: '$4,620.00',
  },
};

const EMPTY_PLAN = (phases = 2): TreatmentPlanMock => ({
  status: 'Planned',
  linkedConditions: 0,
  phasesCompleted: 0,
  phasesTotal: phases,
  phases: Array.from({ length: Math.max(phases, 1) }, (_, i) => ({
    id: `phase-${i + 1}`,
    name: `Phase ${i + 1}`,
    showNewCodesHint: i === 0,
    procedures: [],
  })),
  totals: {
    planEstimate: '$0.00',
    discount: '$0.00',
    patientPayable: '$0.00',
  },
});

const PLANS: Record<string, TreatmentPlanMock> = {
  'all-on-4': ALL_ON_4,
  // A genuinely different plan (own phases, codes and ids), not a copy of All on 4.
  'all-on-4-alt': {
    status: 'Planned',
    linkedConditions: 1,
    phasesCompleted: 0,
    phasesTotal: 2,
    phases: [
      {
        id: 'phase-1',
        name: 'Phase 1',
        showNewCodesHint: true,
        procedures: [
        {
          id: 'a1',
          date: '16/03/2026',
          code: '011 - Comprehensive oral examination',
          thArea: '--',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$65.00',
          discount: '$0.00',
          patPayable: '$20.00',
          status: 'Accepted',
        },
        {
          id: 'a2',
          date: '16/03/2026',
          code: '661 - Implant body — first stage surgery',
          thArea: '36',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$2,200.00',
          discount: '$0.00',
          patPayable: '$1,100.00',
          status: 'Accepted',
        },
        ],
        estimate: { fee: '$2,265.00', discount: '$0.00', patPayable: '$1,120.00' },
      },
      {
        id: 'phase-2',
        name: 'Phase 2',
        procedures: [
        {
          id: 'a3',
          date: '16/03/2026',
          code: '663 - Implant body — second stage surgery',
          thArea: '36',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$950.00',
          discount: '$0.00',
          patPayable: '$480.00',
          status: 'Proposed',
        },
        {
          id: 'a4',
          date: '16/03/2026',
          code: '572 - Crown — re-cementation',
          thArea: '36',
          surface: '--',
          provider: 'ACHU',
          location: 'SYD',
          fee: '$320.00',
          discount: '$0.00',
          patPayable: '$160.00',
          status: 'Proposed',
        },
        ],
        estimate: { fee: '$1,270.00', discount: '$0.00', patPayable: '$640.00' },
      },
    ],
    totals: {
      planEstimate: '$3,535.00',
      discount: '$50.00',
      patientPayable: '$1,760.00',
    },
  },
  ungrouped: EMPTY_PLAN(1),
};

// ── Ungrouped treatments: one flat list of codes per date (a single hidden phase). ──
// ponytail: mock rows; swap for real per-date data when it exists.
export const UNGROUPED_DATES = ['12/02/2022', '03/05/2022', '19/08/2022', '27/09/2022', '14/11/2022', '02/01/2023'];
export const ungroupedPlanId = (date: string) => `ungrouped:${date}`;
export const isUngroupedPlanId = (planId: string) => planId.startsWith('ungrouped:');

const UNGROUPED_SAMPLES: Omit<PlanProcedure, 'id' | 'date'>[] = [
  { code: '011 - Comprehensive oral examination', thArea: '--', surface: '--', provider: 'ACHU', location: 'SYD', fee: '$65.00', discount: '$0.00', patPayable: '$20.00', status: 'Proposed' },
  { code: '012 - Periodic oral evaluation', thArea: '--', surface: '--', provider: 'ACHU', location: 'SYD', fee: '$65.00', discount: '$0.00', patPayable: '$20.00', status: 'Proposed' },
  { code: '572 - Crown — re-cementation', thArea: '14', surface: '--', provider: 'ACHU', location: 'SYD', fee: '$320.00', discount: '$0.00', patPayable: '$160.00', status: 'Proposed' },
];

function ungroupedPlan(date: string, dateIndex: number): TreatmentPlanMock {
  const procedures = UNGROUPED_SAMPLES.slice(0, (dateIndex % 3) + 1)
    .map((p, i) => ({ ...p, id: `ug${dateIndex}-${i}`, date }));
  return { ...EMPTY_PLAN(1), phases: [{ id: 'phase-1', name: 'Phase 1', procedures }] };
}
UNGROUPED_DATES.forEach((date, i) => { PLANS[ungroupedPlanId(date)] = ungroupedPlan(date, i); });

export function getTreatmentPlanMock(planId: string): TreatmentPlanMock {
  return PLANS[planId] ?? EMPTY_PLAN(2);
}

/** Deep-clone so mutable plan state never aliases module constants. */
export function cloneTreatmentPlanMock(plan: TreatmentPlanMock): TreatmentPlanMock {
  return structuredClone(plan);
}

export function seedPlansById(planIds: string[]): Record<string, TreatmentPlanMock> {
  return Object.fromEntries(
    planIds.map((id) => [id, cloneTreatmentPlanMock(getTreatmentPlanMock(id))]),
  );
}

export function firstPhaseId(plan: TreatmentPlanMock): string {
  return plan.phases[0]?.id ?? 'phase-1';
}
