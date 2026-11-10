import { useState, useRef, useLayoutEffect } from 'react';
import styles from './index.module.css';
import Tooth, { type ToothState } from './Tooth';
import { ChartTools } from './ChartTools';
import Button from '../Button';
import { Dialog, DialogBody, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../Dialog';
import { useToothSelectorOpen } from '../ToothSelectorModal/useToothSelectorOpen';
import {
  getArchRows, slotKey, slotKeyFromId, uniformToothTypes, uniformKind, applyToothType, markTeethUnerupted, markToothErupted, allUnerupted, SURFACE_LABEL,
  type DentitionView, type ToothMeta, type ToothType, type ToothTypes, type SurfaceName,
} from './toothData';

export type { ToothState, ToothMark } from './Tooth';
export type { DentitionView, ToothMeta, SurfaceName, ToothType, ToothTypes } from './toothData';
export { SURFACE_LABEL, slotKeyFromId, uniformToothTypes };

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
  /** What the chart shows: the current teeth, or the current teeth plus a set of primary teeth.
      Controlled when provided (so callers can validate tooth input against it). */
  view?: DentitionView;
  onViewChange?: (view: DentitionView) => void;
  /** Kind and unerupted flag of every tooth position. Controlled when provided. */
  toothTypes?: ToothTypes;
  onToothTypesChange?: (types: ToothTypes) => void;
  /** Called after the teeth menu used up the current tooth selection (or reset the chart's teeth). */
  onClearSelection?: () => void;
  onSurfaceClick?: (meta: ToothMeta, surface: SurfaceName) => void;
  onWholeToothClick?: (meta: ToothMeta) => void;
}

// FDI 51–85 are primary teeth.
const toothKind = (m: ToothMeta): 'permanent' | 'primary' => (Number(m.id) >= 50 ? 'primary' : 'permanent');

function ArchRow({ teeth, className, states, armedTeeth, numberPosition, isDimmed, onUneruptedClick, onSurfaceClick, onWholeToothClick }: {
  teeth: (ToothMeta | null)[];
  className?: string;
  /** Unerupted teeth are drawn dimmed and can't be charted. */
  isDimmed: (meta: ToothMeta) => boolean;
  onUneruptedClick: (meta: ToothMeta) => void;
  states: Record<string, ToothState>;
  armedTeeth: ArmedTooth[];
  numberPosition?: 'above' | 'below';
  onSurfaceClick: (meta: ToothMeta, surface: SurfaceName) => void;
  onWholeToothClick: (meta: ToothMeta) => void;
}) {
  return (
    <div className={[styles.ArchRow, className].filter(Boolean).join(' ')}>
      {teeth.map((meta, i) => {
        if (!meta) return <div key={`gap-${i}`} className={styles.ToothCellPlaceholder} aria-hidden="true" />;
        const unerupted = isDimmed(meta);
        const forTooth = unerupted ? [] : armedTeeth.filter(a => a.toothId === meta.id);
        return (
          <Tooth
            key={meta.id}
            meta={meta}
            state={states[meta.id]}
            armedWhole={forTooth.some(a => !a.surface)}
            armedSurfaces={forTooth.filter(a => a.surface).map(a => a.surface!)}
            numberPosition={numberPosition}
            unerupted={unerupted}
            // An unerupted tooth can't be charted — any click on it offers to mark it as erupted instead.
            onSurfaceClick={unerupted ? onUneruptedClick : onSurfaceClick}
            onWholeToothClick={unerupted ? onUneruptedClick : onWholeToothClick}
          />
        );
      })}
    </div>
  );
}

// Charting itself happens through the CarePanel/+Code flow: click a tooth
// then a chip, or a chip then a tooth — this component only displays the
// current chart state and reports clicks upward via callbacks.
export function Odontogram({ toothStates = {}, armedTeeth = [], view: viewProp, onViewChange, toothTypes: toothTypesProp, onToothTypesChange, onClearSelection, onSurfaceClick, onWholeToothClick }: OdontogramProps) {
  const selectorOpen = useToothSelectorOpen();
  const [internalView, setInternalView] = useState<DentitionView>('current');
  const view = viewProp ?? internalView;
  const setView = (v: DentitionView) => {
    if (viewProp === undefined) setInternalView(v);
    onViewChange?.(v);
  };
  const [internalTypes, setInternalTypes] = useState<ToothTypes>(() => uniformToothTypes('permanent'));
  const toothTypes = toothTypesProp ?? internalTypes;
  const setTypes = (next: ToothTypes) => {
    if (toothTypesProp === undefined) setInternalTypes(next);
    onToothTypesChange?.(next);
  };

  // "Change all to X" (teeth menu): every tooth gets the type. Unerupted keeps each tooth's kind
  // and just dims it.
  const changeAllTo = (type: ToothType) => {
    setTypes(type === 'unerupted' ? applyToothType(toothTypes, 'unerupted') : uniformToothTypes(type));
    onClearSelection?.();
  };

  // "Mark selected as X": the same, but only for the teeth selected on the chart.
  const markSelectedAs = (type: ToothType) => {
    const slots = [...new Set(armedTeeth.map(a => slotKeyFromId(a.toothId)).filter((k): k is string => !!k))];
    setTypes(type === 'unerupted'
      ? markTeethUnerupted(toothTypes, [...new Set(armedTeeth.map(a => a.toothId))])
      : applyToothType(toothTypes, type, slots));
    onClearSelection?.();
  };

  // Tooth waiting on the "mark as erupted?" confirmation. It becomes the kind it is drawn as.
  const [eruptTarget, setEruptTarget] = useState<ToothMeta | null>(null);
  const markErupted = (meta: ToothMeta) => {
    setTypes(markToothErupted(toothTypes, meta.id));
    setEruptTarget(null);
  };

  // Always the 32-position grid: each position shows its own kind of tooth. Molar positions have no
  // primary tooth, so they stay permanent (and selectable) even when every other tooth is primary.
  const kind = uniformKind(toothTypes);
  const permanentRows = getArchRows('permanent');
  const primaryRows = getArchRows('primary');
  const primaryBySlot = new Map([...primaryRows.upper, ...primaryRows.lower].map(m => [slotKey(m), m]));
  const mixed = view === 'mixed';
  // Current view: each position shows the tooth it currently holds. Mixed view: the permanent teeth stay
  // in the main rows and every primary tooth sits in its own row above (upper) / below (lower), with
  // gaps at the molar positions.
  const pick = (m: ToothMeta) => (!mixed && toothTypes[slotKey(m)]?.kind === 'primary' ? primaryBySlot.get(slotKey(m)) ?? m : m);
  const upper = permanentRows.upper.map(pick);
  const lower = permanentRows.lower.map(pick);
  const primaryRow = (row: ToothMeta[]) => row.map(m => primaryBySlot.get(slotKey(m)) ?? null);
  const upperPrimary = mixed ? primaryRow(permanentRows.upper) : null;
  const lowerPrimary = mixed ? primaryRow(permanentRows.lower) : null;
  // Which drawn teeth are dimmed. The unerupted flag belongs to the tooth the position currently
  // holds. In the mixed view that leaves the permanent tooth under a primary position not yet erupted.
  const isDimmed = (meta: ToothMeta) => {
    const slot = toothTypes[slotKey(meta)];
    if (!slot) return false;
    if (!mixed) return slot.unerupted;
    if (toothKind(meta) === 'primary') return slot.kind === 'primary' ? slot.unerupted : slot.primaryUnerupted;
    return slot.kind === 'primary' || slot.unerupted;
  };
  const mouthType: ToothType | 'mixed' = allUnerupted(toothTypes) ? 'unerupted' : kind ?? 'mixed';

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
  }, [kind, view]);

  const handleSurfaceClick = (meta: ToothMeta, surface: SurfaceName) => onSurfaceClick?.(meta, surface);
  const handleWholeToothClick = (meta: ToothMeta) => onWholeToothClick?.(meta);

  return (
    <div className={styles.Odontogram} inert={selectorOpen}>
      <ChartTools mouthType={mouthType} view={view} selectionCount={new Set(armedTeeth.map(a => a.toothId)).size} onChangeAll={changeAllTo} onMarkSelected={markSelectedAs} onViewChange={setView} />

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
              <ArchRow className={styles.PrimaryRowAbove} teeth={upperPrimary} states={toothStates} armedTeeth={armedTeeth} isDimmed={isDimmed} onUneruptedClick={setEruptTarget} numberPosition="above" onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
            )}
            <ArchRow teeth={upper} states={toothStates} armedTeeth={armedTeeth} isDimmed={isDimmed} onUneruptedClick={setEruptTarget} onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
            <div className={styles.BiteLine} aria-hidden="true" />
            <ArchRow teeth={lower} states={toothStates} armedTeeth={armedTeeth} isDimmed={isDimmed} onUneruptedClick={setEruptTarget} onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
            {lowerPrimary && (
              <ArchRow className={styles.PrimaryRowBelow} teeth={lowerPrimary} states={toothStates} armedTeeth={armedTeeth} isDimmed={isDimmed} onUneruptedClick={setEruptTarget} numberPosition="below" onSurfaceClick={handleSurfaceClick} onWholeToothClick={handleWholeToothClick} />
            )}
          </div>
        </div>
      </div>

      <Dialog open={eruptTarget !== null} onOpenChange={open => { if (!open) setEruptTarget(null); }}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Mark tooth {eruptTarget?.id} as erupted?</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <DialogDescription>It will be available for charting again.</DialogDescription>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setEruptTarget(null)}>Cancel</Button>
            <Button variant="primary" autoFocus onClick={() => eruptTarget && markErupted(eruptTarget)}>Mark as erupted</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
