export type Dentition = 'permanent' | 'primary';
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
