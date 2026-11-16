export type ChipKind = 'procedure' | 'condition' | 'treatment-plan' | 'explosion';

// How much tooth context a code needs before it can be charted — drives the
// code-addition workflow (see odontogram_charting_checklist.md at the repo
// root): whole-mouth/session codes never touch the odontogram, tooth-level
// codes need a tooth, surface-level codes need a specific surface, and
// area-level codes need a region (arch/quadrant/sextant/whole mouth) rather
// than a single tooth.
export type ToothRequirement = 'none' | 'tooth' | 'surface' | 'area';

export interface ChipDef {
  id: string;
  label: string;
  kind: ChipKind;
  requires: ToothRequirement;
}

export interface AreaPreset {
  id: string;
  label: string;
  /** Extra words the tooth selector's area field matches typing against (e.g. "ur", "upper"). */
  keys?: string;
}

/** Which areas an `area` code accepts: the two arches, or the four quadrants. */
export type AreaType = 'arch' | 'quadrant';

// Fixed, non-searchable preset list for `requires: 'area'` codes.
export const AREA_PRESETS: AreaPreset[] = [
  { id: 'whole-mouth', label: 'Whole mouth',   keys: 'full all' },
  { id: 'upper-arch',  label: 'Maxillary area',   keys: 'upper' },
  { id: 'lower-arch',  label: 'Mandibular area',  keys: 'lower' },
  { id: 'urq',         label: 'Upper right area', keys: 'ur' },
  { id: 'ulq',         label: 'Upper left area',  keys: 'ul' },
  { id: 'lrq',         label: 'Lower right area', keys: 'lr' },
  { id: 'llq',         label: 'Lower left area',  keys: 'll' },
  { id: 'sextant-1',   label: 'Sextant 1 — upper right posterior' },
  { id: 'sextant-2',   label: 'Sextant 2 — upper anterior' },
  { id: 'sextant-3',   label: 'Sextant 3 — upper left posterior' },
  { id: 'sextant-4',   label: 'Sextant 4 — lower left posterior' },
  { id: 'sextant-5',   label: 'Sextant 5 — lower anterior' },
  { id: 'sextant-6',   label: 'Sextant 6 — lower right posterior' },
];

// The options the tooth selector offers per area type (arch codes also take the whole mouth). Quadrants are in chart order
// (patient's right on the viewer's left), so the 2×2 grid mirrors the mouth.
export const AREA_OPTIONS: Record<AreaType, AreaPreset[]> = {
  arch: ['upper-arch', 'lower-arch', 'whole-mouth'].map(id => AREA_PRESETS.find(a => a.id === id)!),
  quadrant: ['urq', 'ulq', 'lrq', 'llq'].map(id => AREA_PRESETS.find(a => a.id === id)!),
};

// FDI tooth ids (permanent dentition) each area preset expands to — used to
// batch-highlight the odontogram when an area preset is picked.
const URQ = ['11', '12', '13', '14', '15', '16', '17', '18'];
const ULQ = ['21', '22', '23', '24', '25', '26', '27', '28'];
const LLQ = ['31', '32', '33', '34', '35', '36', '37', '38'];
const LRQ = ['41', '42', '43', '44', '45', '46', '47', '48'];

export const AREA_PRESET_TEETH: Record<string, string[]> = {
  'whole-mouth': [...URQ, ...ULQ, ...LLQ, ...LRQ],
  'upper-arch':  [...URQ, ...ULQ],
  'lower-arch':  [...LLQ, ...LRQ],
  urq: URQ,
  ulq: ULQ,
  lrq: LRQ,
  llq: LLQ,
  'sextant-1': ['14', '15', '16', '17', '18'],
  'sextant-2': ['13', '12', '11', '21', '22', '23'],
  'sextant-3': ['24', '25', '26', '27', '28'],
  'sextant-4': ['34', '35', '36', '37', '38'],
  'sextant-5': ['33', '32', '31', '41', '42', '43'],
  'sextant-6': ['44', '45', '46', '47', '48'],
};

const QUADRANT_BY_DIGIT: Record<string, string> = { 1: 'urq', 5: 'urq', 2: 'ulq', 6: 'ulq', 3: 'llq', 7: 'llq', 4: 'lrq', 8: 'lrq' };

/** The distinct areas of `type` the given teeth sit in (FDI ids, supernumerary "S" prefix ignored); never the whole mouth. */
export function areaIdsForTeeth(toothIds: string[], type: AreaType): string[] {
  const quads = toothIds.map(t => QUADRANT_BY_DIGIT[t.replace(/^S/, '').charAt(0)]).filter(Boolean);
  return [...new Set(quads.map(q => (type === 'quadrant' ? q : q === 'urq' || q === 'ulq' ? 'upper-arch' : 'lower-arch')))];
}

// Placeholder "General Dentistry" care panel contents. In the real product
// this grid is clinician-customizable (see the gear button) and can differ
// per care panel selected in the dropdown above it.
export const PROCEDURE_CHIPS: ChipDef[] = [
  { id: 'amalgam',     label: 'Amalgam',           kind: 'procedure', requires: 'surface' },
  { id: 'denture',     label: 'Denture',           kind: 'procedure', requires: 'none' },
  { id: 'crowns',      label: 'Crowns',            kind: 'procedure', requires: 'tooth' },
  { id: 'composite',   label: 'Composite',         kind: 'procedure', requires: 'surface' },
  { id: 'xrays',       label: 'X-Rays',            kind: 'procedure', requires: 'none' },
  { id: 'sealant',     label: 'Sealant',           kind: 'procedure', requires: 'tooth' },

  { id: 'extraction',  label: 'Extraction',        kind: 'procedure', requires: 'tooth' },
  { id: 'bridge-abut', label: 'Bridge Abutment',   kind: 'procedure', requires: 'tooth' },
  { id: 'bridge-pont', label: 'Bridge Pontic',     kind: 'procedure', requires: 'tooth' },
  { id: 'inlay-onlay', label: 'Inlay/Onlay',       kind: 'procedure', requires: 'surface' },
  { id: 'perio-srp',   label: 'Perio/S R P',       kind: 'procedure', requires: 'none' },
  { id: 'veneers',     label: 'Veneers',           kind: 'procedure', requires: 'surface' },

  { id: 'exams',       label: 'Exams',             kind: 'procedure', requires: 'none' },
  { id: 'dentures',    label: 'Dentures',          kind: 'procedure', requires: 'none' },
  { id: 'bleach',      label: 'Bleach/Whitening',  kind: 'procedure', requires: 'none' },
  { id: 'partial-den', label: 'Partial Denture',   kind: 'procedure', requires: 'none' },
  { id: 'relines',     label: 'Relines/Rebase',    kind: 'procedure', requires: 'none' },
  { id: 'dent-part-o', label: 'Dent/Part O...',    kind: 'procedure', requires: 'none' },
];

// Shown only under New Treatment — not applicable to already-completed/
// existing work, so excluded from the Existing tab's grid. Disabled in the
// UI for now (see CarePanel), so their tooth requirement isn't wired up yet.
export const PLAN_AND_EXPLOSION_CHIPS: ChipDef[] = [
  { id: 'implant-tx',    label: 'Implant Tx',       kind: 'treatment-plan', requires: 'none' },
  { id: 'hygiene-tx',    label: 'Hygiene Tx',       kind: 'treatment-plan', requires: 'none' },
  { id: 'perio-tx',      label: 'Perio Tx',         kind: 'treatment-plan', requires: 'none' },
  { id: '6mo-hygiene',   label: '6 Month Hygiene',  kind: 'explosion', requires: 'none' },
  { id: 'all-on-4',      label: 'All on 4',         kind: 'explosion', requires: 'none' },
  { id: 'crown-fix',     label: 'Crown Fix',        kind: 'explosion', requires: 'none' },

  { id: 'nightguards', label: 'Nightguards',       kind: 'procedure', requires: 'none' },
  { id: 'products',    label: 'Products',          kind: 'procedure', requires: 'none' },
  { id: 'implant',     label: 'Implant',           kind: 'procedure', requires: 'tooth' },
  { id: 'sedation',    label: 'Sedation',          kind: 'procedure', requires: 'none' },
  { id: 'rct',         label: 'RCT',               kind: 'procedure', requires: 'tooth' },
  { id: 'veneer',      label: 'Veneer',            kind: 'procedure', requires: 'surface' },
];

export const CONDITION_CHIPS: ChipDef[] = [
  { id: 'broken-tooth',  label: 'Broken Tooth',     kind: 'condition', requires: 'tooth' },
  { id: 'missing',       label: 'Missing',          kind: 'condition', requires: 'tooth' },
  { id: 'extracted',     label: 'Extracted',        kind: 'condition', requires: 'tooth' },
  { id: 'watch',         label: 'Watch',            kind: 'condition', requires: 'tooth' },
  { id: 'common',        label: 'Common',           kind: 'condition', requires: 'none' },
  { id: 'impacted',      label: 'Impacted',         kind: 'condition', requires: 'tooth' },

  { id: 'dm',            label: 'DM',               kind: 'condition', requires: 'none' },
  { id: 'crack',         label: 'Crack',            kind: 'condition', requires: 'surface' },
  { id: 'caries',        label: 'Caries',           kind: 'condition', requires: 'surface' },
  { id: 'rct-2-canals',  label: 'RCT 2 Canals',     kind: 'condition', requires: 'tooth' },
  { id: 'wear',          label: 'Wear',             kind: 'condition', requires: 'surface' },
  { id: 'defect-resto',  label: 'Defect Resto',     kind: 'condition', requires: 'surface' },
];

export const CARE_PANELS = [
  { id: 'general', label: 'General Dentistry' },
];

export const CHIP_LEGEND: { kind: ChipKind; label: string; description: string }[] = [
  { kind: 'procedure',       label: 'Procedure code',   description: 'A billable code chartable against a tooth or the whole mouth.' },
  { kind: 'condition',       label: 'Condition',        description: 'An existing finding, not a procedure — only available under Existing.' },
  { kind: 'treatment-plan',  label: 'Treatment plan',   description: 'A bundle of procedures grouped into a plan. Not wired up yet.' },
  { kind: 'explosion',       label: 'Explosion code',   description: 'A single code that expands into several procedures. Not wired up yet.' },
];
