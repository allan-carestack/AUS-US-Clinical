import { useState } from 'react';
import styles from './index.module.css';
import { SegmentedButton, SegmentedButtonItem } from '../SegmentedButton';
import Tooth, { type ToothState } from './Tooth';
import { getArchRows, SURFACE_LABEL, type Dentition, type ToothMeta, type SurfaceName } from './toothData';

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

function ArchRow({ teeth, states, armedTeeth, onSurfaceClick, onWholeToothClick }: {
  teeth: ToothMeta[];
  states: Record<string, ToothState>;
  armedTeeth: ArmedTooth[];
  onSurfaceClick: (meta: ToothMeta, surface: SurfaceName) => void;
  onWholeToothClick: (meta: ToothMeta) => void;
}) {
  return (
    <div className={styles.ArchRow}>
      {teeth.map(meta => {
        const forTooth = armedTeeth.filter(a => a.toothId === meta.id);
        return (
          <Tooth
            key={meta.id}
            meta={meta}
            state={states[meta.id]}
            armedWhole={forTooth.some(a => !a.surface)}
            armedSurfaces={forTooth.filter(a => a.surface).map(a => a.surface!)}
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
  const { upper, lower } = getArchRows(dentition);

  const handleSurfaceClick = (meta: ToothMeta, surface: SurfaceName) => onSurfaceClick?.(meta, surface);
  const handleWholeToothClick = (meta: ToothMeta) => onWholeToothClick?.(meta);

  return (
    <div className={styles.Odontogram}>
      <div className={styles.Toolbar}>
        <SegmentedButton value={dentition} onValueChange={v => setDentition(v as Dentition)}>
          <SegmentedButtonItem value="permanent">Permanent</SegmentedButtonItem>
          <SegmentedButtonItem value="primary">Primary</SegmentedButtonItem>
        </SegmentedButton>
      </div>

      <ArchRow teeth={upper} states={toothStates} armedTeeth={armedTeeth} onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
      <div className={styles.BiteLine} aria-hidden="true" />
      <ArchRow teeth={lower} states={toothStates} armedTeeth={armedTeeth} onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
    </div>
  );
}
