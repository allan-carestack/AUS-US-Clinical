/** Which tooth set an arch layout draws. */
export type Dentition = 'permanent' | 'primary';
/** What the chart shows: the current teeth, or the current teeth plus a set of primary teeth. */
export type DentitionView = 'current' | 'mixed';
export type Arch = 'upper' | 'lower';
export type Side = 'right' | 'left'; // patient's own right/left, not viewer's

// The four clickable edges of a tooth polygon, plus the center (occlusal/incisal).
export type SurfaceEdge = 'top' | 'bottom' | 'left' | 'right' | 'center';

// Clinical surface names — what an edge means depends on the tooth's
// position (arch + side) and whether it's an anterior tooth.
export type SurfaceName = 'mesial' | 'distal' | 'buccal' | 'labial' | 'lingual' | 'palatal' | 'occlusal' | 'incisal';

export interface ToothMeta {
  /** FDI two-digit designation, e.g. "18", "51". */
  id: string;
  arch: Arch;
  side: Side;
  /** 1 = closest to the midline, increasing outward (toward the back of the mouth). */
  position: number;
  /** Incisors/canines — charted by incisal edge rather than occlusal surface. */
  anterior: boolean;
}

const PERMANENT_TEETH_PER_QUADRANT = 8;
const PRIMARY_TEETH_PER_QUADRANT = 5;
const ANTERIOR_POSITIONS = 3; // central incisor, lateral incisor, canine

function buildQuadrant(quadrantDigit: number, arch: Arch, side: Side, count: number): ToothMeta[] {
  return Array.from({ length: count }, (_, i) => {
    const position = i + 1;
    return {
      id: `${quadrantDigit}${position}`,
      arch,
      side,
      position,
      anterior: position <= ANTERIOR_POSITIONS,
    };
  });
}

// Standard clinical chart layout, viewer facing the patient:
//   upper row:  18 17 ... 11 | 21 22 ... 28
//   lower row:  48 47 ... 41 | 31 32 ... 38
// Each row runs from the back of the mouth (highest position) inward to the
// midline, then back out again on the other side.
export function getArchRows(dentition: Dentition): { upper: ToothMeta[]; lower: ToothMeta[] } {
  const count = dentition === 'permanent' ? PERMANENT_TEETH_PER_QUADRANT : PRIMARY_TEETH_PER_QUADRANT;
  const [q1, q2, q3, q4] = dentition === 'permanent' ? [1, 2, 3, 4] : [5, 6, 7, 8];

  const upper = [
    ...buildQuadrant(q1, 'upper', 'right', count).reverse(),
    ...buildQuadrant(q2, 'upper', 'left', count),
  ];
  const lower = [
    ...buildQuadrant(q4, 'lower', 'right', count).reverse(),
    ...buildQuadrant(q3, 'lower', 'left', count),
  ];
  return { upper, lower };
}

// ── Per-tooth type ──
// Every tooth position (arch + side + position, so 11 and 51 share a slot) has its own kind
// (which tooth sits there) and an unerupted flag. Unerupted teeth stay on the chart as dimmed
// outlines of whatever kind they were, and come back as they were once marked erupted.
export type ToothKind = 'permanent' | 'primary';
/** What the teeth menu can set. */
export type ToothType = ToothKind | 'unerupted';
export interface ToothSlot {
  kind: ToothKind;
  /** The tooth the position currently holds (its kind) is unerupted. */
  unerupted: boolean;
  /** The mixed view also shows the primary tooth over a permanent position; this is that tooth's own flag. */
  primaryUnerupted: boolean;
}
export type ToothTypes = Record<string, ToothSlot>;

export const TOOTH_TYPE_LABEL: Record<ToothType, string> = {
  permanent: 'Permanent',
  primary: 'Primary',
  unerupted: 'Unerupted',
};

export const slotKey = (m: Pick<ToothMeta, 'arch' | 'side' | 'position'>) => `${m.arch}-${m.side}-${m.position}`;
const slotPosition = (key: string) => Number(key.split('-')[2]);

/** Slot of an FDI number (permanent 11–48 or primary 51–85), or null when it isn't one. */
export function slotKeyFromId(id: string): string | null {
  const q = Math.floor(Number(id) / 10);
  const position = Number(id) % 10;
  if (!Number.isInteger(Number(id)) || position < 1 || position > PERMANENT_TEETH_PER_QUADRANT) return null;
  if (q < 1 || q > 8) return null;
  const quadrant = ((q - 1) % 4) + 1; // 5–8 fold onto 1–4
  const arch: Arch = quadrant <= 2 ? 'upper' : 'lower';
  const side: Side = quadrant === 1 || quadrant === 4 ? 'right' : 'left';
  return slotKey({ arch, side, position });
}

/**
 * Every tooth of one kind. There is no primary tooth at the molar positions (6–8), so an
 * all-primary mouth keeps its permanent molars there, not yet erupted.
 */
export function uniformToothTypes(kind: ToothKind): ToothTypes {
  const { upper, lower } = getArchRows('permanent');
  return Object.fromEntries([...upper, ...lower].map(m => {
    const molarOfPrimaryMouth = kind === 'primary' && m.position > PRIMARY_TEETH_PER_QUADRANT;
    return [slotKey(m), { kind: molarOfPrimaryMouth ? 'permanent' : kind, unerupted: molarOfPrimaryMouth, primaryUnerupted: false }];
  }));
}

/** Set `type` on the given slots (every slot when omitted). Primary skips the molar positions (6–8). */
export function applyToothType(types: ToothTypes, type: ToothType, slots: string[] = Object.keys(types)): ToothTypes {
  const next = { ...types };
  for (const key of slots) {
    const slot = next[key];
    if (!slot) continue;
    if (type === 'unerupted') next[key] = { ...slot, unerupted: true, primaryUnerupted: true };
    else if (type === 'primary' && slotPosition(key) > PRIMARY_TEETH_PER_QUADRANT) continue;
    else next[key] = { kind: type, unerupted: false, primaryUnerupted: false };
  }
  return next;
}

/** Mark the given teeth (FDI numbers) unerupted. A primary tooth over a permanent position has its own flag. */
export function markTeethUnerupted(types: ToothTypes, ids: string[]): ToothTypes {
  const next = { ...types };
  for (const id of ids) {
    const key = slotKeyFromId(id);
    const slot = key ? next[key] : undefined;
    if (!key || !slot) continue;
    next[key] = Number(id) >= 50 && slot.kind === 'permanent' ? { ...slot, primaryUnerupted: true } : { ...slot, unerupted: true };
  }
  return next;
}

/** Mark one drawn tooth (FDI number) erupted. */
export function markToothErupted(types: ToothTypes, id: string): ToothTypes {
  const key = slotKeyFromId(id);
  const slot = key ? types[key] : undefined;
  if (!key || !slot) return types;
  const primary = Number(id) >= 50;
  if (primary === (slot.kind === 'primary')) return { ...types, [key]: { ...slot, unerupted: false } }; // the tooth the position holds
  if (primary) return { ...types, [key]: { ...slot, primaryUnerupted: false } }; // a primary tooth in the mixed view's primary row
  // The permanent tooth under a primary position: it takes the position, and the primary tooth becomes the extra one.
  return { ...types, [key]: { kind: 'permanent', unerupted: false, primaryUnerupted: slot.unerupted } };
}

/** The one kind every tooth that could be either has (positions 1–5), or null when they differ. */
export function uniformKind(types: ToothTypes): ToothKind | null {
  const kinds = Object.entries(types)
    .filter(([key]) => slotPosition(key) <= PRIMARY_TEETH_PER_QUADRANT)
    .map(([, t]) => t.kind);
  return kinds.length > 0 && kinds.every(k => k === kinds[0]) ? kinds[0] : null;
}

export const allUnerupted = (types: ToothTypes) => Object.values(types).every(t => t.unerupted);

// Mesial always faces the midline; which screen edge that is depends only on
// which side of the mouth the tooth is on (rows above always place the
// midline-adjacent tooth at the row's own inner end).
function mesialEdge(meta: ToothMeta): 'left' | 'right' {
  return meta.side === 'right' ? 'right' : 'left';
}

function buccalEdge(meta: ToothMeta): 'top' | 'bottom' {
  return meta.arch === 'upper' ? 'top' : 'bottom';
}

export function surfaceName(edge: SurfaceEdge, meta: ToothMeta): SurfaceName {
  if (edge === 'center') return meta.anterior ? 'incisal' : 'occlusal';
  if (edge === mesialEdge(meta)) return 'mesial';
  if (edge === (mesialEdge(meta) === 'left' ? 'right' : 'left')) return 'distal';
  if (edge === buccalEdge(meta)) return meta.anterior ? 'labial' : 'buccal';
  return meta.arch === 'upper' ? 'palatal' : 'lingual';
}

export const SURFACE_LABEL: Record<SurfaceName, string> = {
  mesial: 'Mesial',
  distal: 'Distal',
  buccal: 'Buccal',
  labial: 'Labial',
  lingual: 'Lingual',
  palatal: 'Palatal',
  occlusal: 'Occlusal',
  incisal: 'Incisal',
};
