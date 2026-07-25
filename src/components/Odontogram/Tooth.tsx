import styles from './index.module.css';
import { surfaceName, type ToothMeta, type SurfaceEdge, type SurfaceName } from './toothData';

/** A single chart mark — color plus an optional short badge label for the
    whole-tooth ring/circle. What produces these (chip kind, condition vs.
    procedure, etc.) is decided by whoever owns chart state, not by Tooth. */
export interface ToothMark {
  color: string;
  badge?: string;
}

export interface ToothState {
  whole?: ToothMark;
  surfaces: Partial<Record<SurfaceName, ToothMark>>;
}

interface ToothProps {
  meta: ToothMeta;
  state?: ToothState;
  /** Whole-tooth is part of the pending multi-select, waiting for a
      CarePanel chip / +Code pick to complete it. */
  armedWhole?: boolean;
  /** Surfaces of this tooth in the pending multi-select. */
  armedSurfaces?: SurfaceName[];
  onSurfaceClick: (meta: ToothMeta, surface: SurfaceName) => void;
  onWholeToothClick: (meta: ToothMeta) => void;
}

// A tooth is drawn in a 44×44 coordinate space, rendered at 48px. The viewBox
// is padded by 1 unit so centered strokes on the outer edges aren't clipped
// by the SVG viewport (or by ChartFit's overflow:hidden).
const TOOTH_SIZE = 48;
const EDGES: { edge: SurfaceEdge; points: string }[] = [
  { edge: 'top',    points: '0,0 44,0 30,14 14,14' },
  { edge: 'bottom', points: '0,44 44,44 30,30 14,30' },
  { edge: 'left',   points: '0,0 14,14 14,30 0,44' },
  { edge: 'right',  points: '44,0 30,14 30,30 44,44' },
  { edge: 'center', points: '14,14 30,14 30,30 14,30' },
];

export default function Tooth({ meta, state, armedWhole, armedSurfaces = [], onSurfaceClick, onWholeToothClick }: ToothProps) {
  const wholeMark = state?.whole;

  const toothSvg = (
    <svg
      className={styles.ToothSvg}
      viewBox="-1 -1 46 46"
      width={TOOTH_SIZE}
      height={TOOTH_SIZE}
      aria-label={`Tooth ${meta.id}`}
    >
      <rect
        x={0.5} y={0.5} width={43} height={43}
        className={styles.ToothOutline}
      />
      {EDGES.map(({ edge, points }) => {
        const surface = surfaceName(edge, meta);
        const mark = state?.surfaces[surface];
        const isArmedSurface = armedSurfaces.includes(surface);
        return (
          <polygon
            key={edge}
            points={points}
            className={[styles.ToothSurface, isArmedSurface ? styles.ToothSurfaceArmed : ''].join(' ')}
            style={mark?.color ? { fill: mark.color } : undefined}
            role="button"
            tabIndex={0}
            aria-label={`Tooth ${meta.id} ${surface}`}
            onClick={e => {
              onSurfaceClick(meta, surface);
              // Armed fill is the selection indicator — drop focus so the UA
              // ring doesn't linger after a pointer click on the SVG polygon.
              e.currentTarget.blur();
            }}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSurfaceClick(meta, surface); } }}
          />
        );
      })}
      {wholeMark && (
        <>
          <rect x={1} y={1} width={42} height={42} className={styles.ToothWholeRing} style={{ stroke: wholeMark.color }} />
          {wholeMark.badge && (
            <>
              <circle cx={36} cy={36} r={7} style={{ fill: wholeMark.color }} />
              <text x={36} y={38.5} className={styles.ToothBadgeText}>{wholeMark.badge}</text>
            </>
          )}
        </>
      )}
    </svg>
  );

  const numberLabel = (
    <button
      type="button"
      className={[styles.ToothNumber, armedWhole ? styles.ToothNumberArmed : ''].join(' ')}
      onClick={() => onWholeToothClick(meta)}
      aria-label={`Tooth ${meta.id} whole tooth`}
      aria-pressed={armedWhole}
    >
      {meta.id}
    </button>
  );

  // Numbers sit at the bite line (the two arches' number rows face each
  // other), with crowns pointing outward — so the upper arch shows the tooth
  // above its number, and the lower arch shows the number above its tooth.
  return (
    <div className={styles.ToothCell}>
      {meta.arch === 'upper' ? <>{toothSvg}{numberLabel}</> : <>{numberLabel}{toothSvg}</>}
    </div>
  );
}
