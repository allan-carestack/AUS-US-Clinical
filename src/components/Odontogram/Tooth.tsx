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
  /** Overrides the default arch-based number placement — used for the
      mixed-dentition primary rows, which sit outside the main arches and so
      want their numbers at the chart's outer edge instead of at the bite line. */
  numberPosition?: 'above' | 'below';
  /** Unerupted: drawn dimmed with no marks; the owner decides what a click does (not charting). */
  unerupted?: boolean;
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

export default function Tooth({ meta, state: stateProp, armedWhole, armedSurfaces = [], numberPosition, unerupted, onSurfaceClick, onWholeToothClick }: ToothProps) {
  const state = unerupted ? undefined : stateProp;
  const wholeMark = state?.whole;
  // Primary teeth (FDI 51–85) are round; the surfaces keep the same segments, just clipped to the circle.
  const primary = Number(meta.id) >= 50;
  const clipId = `tooth-clip-${meta.id}`;

  const toothSvg = (
    <svg
      className={styles.ToothSvg}
      viewBox="-1 -1 46 46"
      width={TOOTH_SIZE}
      height={TOOTH_SIZE}
      aria-label={`Tooth ${meta.id}`}
    >
      {primary ? (
        <>
          <defs>
            <clipPath id={clipId}><circle cx={22} cy={22} r={22} /></clipPath>
          </defs>
          <circle cx={22} cy={22} r={21.5} className={styles.ToothOutline} />
        </>
      ) : (
        <rect
          x={0.5} y={0.5} width={43} height={43}
          className={styles.ToothOutline}
        />
      )}
      <g clipPath={primary ? `url(#${clipId})` : undefined}>
      {EDGES.map(({ edge, points }) => {
        const surface = surfaceName(edge, meta);
        const mark = state?.surfaces[surface];
        // A whole tooth carries all of its surfaces.
        const isArmedSurface = armedWhole || armedSurfaces.includes(surface);
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
      </g>
      {/* The clip trims the outer half of the edge strokes, so the round outline is drawn again on top. */}
      {primary && <circle cx={22} cy={22} r={21.5} className={styles.ToothOutline} style={{ fill: 'none' }} />}
      {wholeMark && (
        <>
          {primary
            ? <circle cx={22} cy={22} r={21} className={styles.ToothWholeRing} style={{ stroke: wholeMark.color }} />
            : <rect x={1} y={1} width={42} height={42} className={styles.ToothWholeRing} style={{ stroke: wholeMark.color }} />}
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
  // `numberPosition` overrides this for rows that aren't at the bite line.
  const position = numberPosition ?? (meta.arch === 'upper' ? 'below' : 'above');

  return (
    <div className={[styles.ToothCell, unerupted ? styles.ToothCellUnerupted : ''].filter(Boolean).join(' ')}>
      {position === 'above' ? <>{numberLabel}{toothSvg}</> : <>{toothSvg}{numberLabel}</>}
    </div>
  );
}
