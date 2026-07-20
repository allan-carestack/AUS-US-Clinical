export type PlanProcedure = {
  id: string;
  date: string;
  code: string;
  /** Catalog code string when known (used to finalize pending tooth/surface). */
  codeId?: string;
  /** Tooth/surface requirement for pending-row UX (mirrors ChipDef.requires). */
  requires?: 'none' | 'tooth' | 'surface';
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
      procedures: [],
    },
    {
      id: 'phase-3',
      name: 'Phase 3',
      procedures: [],
    },
  ],
  totals: {
    planEstimate: '$1,300.00',
    discount: '$20.00',
    patientPayable: '$1,280.00',
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
  'all-on-4-alt': {
    ...ALL_ON_4,
    status: 'Planned',
    linkedConditions: 1,
    totals: {
      planEstimate: '$1,450.00',
      discount: '$50.00',
      patientPayable: '$1,400.00',
    },
  },
  ungrouped: EMPTY_PLAN(1),
};

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
