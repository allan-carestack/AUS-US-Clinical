import { useState, useRef, useLayoutEffect } from 'react';
import styles from './index.module.css';
import Tooth, { type ToothState } from './Tooth';
import { ChartTools } from './ChartTools';
import { getArchRows, getMixedArchRows, SURFACE_LABEL, type Dentition, type ToothMeta, type SurfaceName } from './toothData';

export type { ToothState, ToothMark } from './Tooth';
export type { Dentition, ToothMeta, SurfaceName } from './toothData';
export { SURFACE_LABEL };

export interface ArmedTooth {
  toothId: string;
  /** Absent for a whole-tooth (no specific surface) selection. */
  surface?: SurfaceName;
}

export interface OdontogramProps {
  /** Current chart state, keyed by tooth id — set externally (CarePanel /
      +Code flow), not by clicking the odontogram itself. */
  toothStates?: Record<string, ToothState>;
  /** Tooth-first flow: the multi-selected teeth/surfaces waiting for a
      CarePanel chip or +Code pick to complete the selection. */
  armedTeeth?: ArmedTooth[];
  /** Active dentition. Controlled when provided (so callers can validate tooth
      input against the visible tab); falls back to internal state otherwise. */
  dentition?: Dentition;
  onDentitionChange?: (dentition: Dentition) => void;
  onSurfaceClick?: (meta: ToothMeta, surface: SurfaceName) => void;
  onWholeToothClick?: (meta: ToothMeta) => void;
}

function ArchRow({ teeth, states, armedTeeth, numberPosition, onSurfaceClick, onWholeToothClick }: {
  teeth: (ToothMeta | null)[];
  states: Record<string, ToothState>;
  armedTeeth: ArmedTooth[];
  numberPosition?: 'above' | 'below';
  onSurfaceClick: (meta: ToothMeta, surface: SurfaceName) => void;
  onWholeToothClick: (meta: ToothMeta) => void;
}) {
  return (
    <div className={styles.ArchRow}>
      {teeth.map((meta, i) => {
        if (!meta) return <div key={`gap-${i}`} className={styles.ToothCellPlaceholder} aria-hidden="true" />;
        const forTooth = armedTeeth.filter(a => a.toothId === meta.id);
        return (
          <Tooth
            key={meta.id}
            meta={meta}
            state={states[meta.id]}
            armedWhole={forTooth.some(a => !a.surface)}
            armedSurfaces={forTooth.filter(a => a.surface).map(a => a.surface!)}
            numberPosition={numberPosition}
            onSurfaceClick={onSurfaceClick}
            onWholeToothClick={onWholeToothClick}
          />
        );
      })}
    </div>
  );
}

// Charting itself happens through the CarePanel/+Code flow: click a tooth
// then a chip, or a chip then a tooth — this component only displays the
// current chart state and reports clicks upward via callbacks.
export function Odontogram({ toothStates = {}, armedTeeth = [], dentition: dentitionProp, onDentitionChange, onSurfaceClick, onWholeToothClick }: OdontogramProps) {
  const [internalDentition, setInternalDentition] = useState<Dentition>('permanent');
  const dentition = dentitionProp ?? internalDentition;
  const setDentition = (d: Dentition) => {
    if (dentitionProp === undefined) setInternalDentition(d);
    onDentitionChange?.(d);
  };
  const { upper, lower, upperPrimary, lowerPrimary } =
    dentition === 'mixed'
      ? getMixedArchRows()
      : { ...getArchRows(dentition), upperPrimary: null, lowerPrimary: null };

  const viewportRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, width: 0, height: 0 });

  // Scale the natural-width chart down to fit the viewport — never up —
  // so narrow layouts shrink uniformly instead of growing a horizontal scrollbar.
  // The outer box is sized to the *visual* scaled bounds so layout matches what
  // the user sees (transform alone would leave the pre-scale layout box).
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    const chart = chartRef.current;
    if (!viewport || !chart) return;

    const update = () => {
      const availableW = viewport.clientWidth;
      const availableH = viewport.clientHeight;
      const naturalW = chart.offsetWidth;
      const naturalH = chart.offsetHeight;
      const scaleW = availableW > 0 && naturalW > 0 ? availableW / naturalW : 1;
      const scaleH = availableH > 0 && naturalH > 0 ? availableH / naturalH : 1;
      const scale = Math.min(1, scaleW, scaleH);
      const width = naturalW * scale;
      const height = naturalH * scale;
      setFit(prev => (
        prev.scale === scale && prev.width === width && prev.height === height
          ? prev
          : { scale, width, height }
      ));
    };

    const ro = new ResizeObserver(update);
    ro.observe(viewport);
    ro.observe(chart);
    update();
    return () => ro.disconnect();
  }, [dentition]);

  const handleSurfaceClick = (meta: ToothMeta, surface: SurfaceName) => onSurfaceClick?.(meta, surface);
  const handleWholeToothClick = (meta: ToothMeta) => onWholeToothClick?.(meta);

  return (
    <div className={styles.Odontogram}>
      <ChartTools dentition={dentition} onDentitionChange={setDentition} />

      <div className={styles.ChartViewport} ref={viewportRef}>
        <div
          className={styles.ChartFit}
          style={fit.width > 0 ? { width: fit.width, height: fit.height } : undefined}
        >
          <div
            className={styles.Chart}
            ref={chartRef}
            style={{ transform: `scale(${fit.scale})` }}
          >
            {upperPrimary && (
              <ArchRow teeth={upperPrimary} states={toothStates} armedTeeth={armedTeeth} numberPosition="above" onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
            )}
            <ArchRow teeth={upper} states={toothStates} armedTeeth={armedTeeth} onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
            <div className={styles.BiteLine} aria-hidden="true" />
            <ArchRow teeth={lower} states={toothStates} armedTeeth={armedTeeth} onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
            {lowerPrimary && (
              <ArchRow teeth={lowerPrimary} states={toothStates} armedTeeth={armedTeeth} numberPosition="below" onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
