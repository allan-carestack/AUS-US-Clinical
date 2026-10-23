import { Fragment, useEffect, useRef, useState } from 'react';
import Button from '../Button';
import Checkbox from '../Checkbox';
import { Tag } from '../Tag';
import { Menu, MenuTrigger, MenuContent, MenuItem } from '../Menu';
import {
  ScrollArea,
  ScrollAreaViewport,
  ScrollAreaContent,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
} from '../ScrollArea';
import {
  AngleDownIcon,
  WarningIcon,
  CloseIcon,
  DragHandleIcon,
  EditIcon,
  InfoSolidIcon,
  KebabMenuIcon,
  NotScheduledIcon,
  NotesIcon,
  PlusIcon,
  PrintIcon,
  RetryIcon,
} from '../Icon';
import { Tooltip } from '../Tooltip';
import type { PlanPhase, PlanProcedure, TreatmentPlanMock } from './mockData';
import { PhaseDuration, type DurationValue } from './PhaseDuration';
import { EditableName } from './EditableName';
import { EditPlanDetailsDialog } from './EditPlanDetailsDialog';
import { AREA_PRESETS } from '../CarePanel/data';
import { PlanCodeAdd } from '../CarePanel/PlanCodeAdd';
import type { CodeInput, DentalCode } from '../CarePanel';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../Select';
import appStyles from '../../styles/app.module.css';
import styles from './index.module.css';

const ZERO_DURATION: DurationValue = { hours: 0, minutes: 0 };
const NAME_MAX_LENGTH = 125;

export type PlanEditingCell = { rowId: string; field: 'thArea' | 'surface' };

export interface TreatmentPlanViewProps {
  planId: string;
  plan: TreatmentPlanMock;
  planLabel: string;
  compact?: boolean;
  onPlanLabelChange: (label: string) => void;
  targetPhaseId: string;
  onSelectTargetPhase: (phaseId: string) => void;
  pendingProcedureIds: Set<string>;
  editingCell: PlanEditingCell | null;
  /** anchorEl is passed for the tooth/surface cells (not the area Select) —
      its presence tells the caller whether to open the Tooth and Surface
      Selector popover. */
  onStartEditCell: (rowId: string, field: 'thArea' | 'surface', anchorEl?: HTMLElement) => void;
  onCommitCell: (rowId: string, field: 'thArea' | 'surface', value: string) => void;
  onCancelEditCell: () => void;
  /** Live-writes a tooth/surface draft as the user types — the same field
      the Tooth and Surface Selector popover reads and writes. */
  onDraftChange: (procedureId: string, field: 'thArea' | 'surface', value: string) => void;
  onDeletePendingProcedure: (id: string) => void;
  isValidTooth: (value: string) => string | null;
  isValidSurface: (value: string) => string | null;
  onSelectArea: (procedureId: string, areaId: string) => void;
  /** Reorder / move one or more codes (kept in their current relative order). `index` is the insertion point in the target phase's current list (before the codes are removed from it). */
  onMoveProcedure: (procedureIds: string[], toPhaseId: string, index: number) => void;
  /** Reorder a whole phase. `index` is the insertion point in the current phase list (before the phase is removed from it). */
  onMovePhase: (phaseId: string, index: number) => void;
  /** Insert a new, empty phase right after `afterPhaseId` (append when null). */
  onAddPhase: (afterPhaseId: string | null, phase: PlanPhase) => void;
  /** When given, the header shows a +Code control that adds codes to the selected phase. */
  codes?: DentalCode[];
  onAddCode?: (code: DentalCode, input?: CodeInput) => void;
}

/** Drag-and-drop state and handlers for reordering whole phases. */
interface PhaseDnd {
  dragPhaseId: string | null;
  /** True once the drag is under way: the carried phase then shows as a faded ghost in its original spot. */
  dragPhaseStarted: boolean;
  dropIndex: number | null;
  onDragStart: (id: string, height: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDrop: (e: React.DragEvent) => void;
  /** Alt+Up / Alt+Down on a focused phase header. */
  onNudge: (id: string, index: number, dir: -1 | 1) => void;
}

/** Drag-and-drop state and handlers shared by every phase's rows. */
interface PlanDnd {
  dragId: string | null;
  /** Everything being carried: the whole checked selection when the dragged row is checked, else just the row. */
  dragIds: string[];
  /** True once the drag is under way: the carried rows then show as faded ghosts in their original spot. */
  dragStarted: boolean;
  /** Rows that were just dropped together, in order; they animate open. */
  spreadIds: string[];
  drop: { phaseId: string; index: number } | null;
  onDragStart: (id: string, rowHeight: number) => string[];
  /** Dragging over a phase header: drops at the end of that phase, and opens it if collapsed. */
  onHeaderDragOver: (e: React.DragEvent, phaseId: string, count: number, expanded: boolean) => void;
  /** Dragging over the empty space of a phase body (below its last row). */
  onBodyDragOver: (e: React.DragEvent, phaseId: string, count: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, phaseId: string, index: number) => void;
  onDrop: (e: React.DragEvent) => void;
  /** Keyboard reorder from the drag handle: -1 up, +1 down within the phase. */
  onNudge: (id: string, phaseId: string, index: number, count: number, dir: -1 | 1) => void;
}

const STATUS_COLOR = {
  Proposed: 'blue',
  Completed: 'green',
  Accepted: 'teal',
} as const;

function PlanInlineEditCell({
  field,
  value,
  onChange,
  validate,
  onCommit,
  onCancel,
}: {
  field: 'thArea' | 'surface';
  /** Controlled — the same draft value the Tooth and Surface Selector
      popover shows, so either UI stays in sync with the other. */
  value: string;
  onChange: (v: string) => void;
  validate: (v: string) => string | null;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    const err = validate(trimmed);
    if (err) {
      setError(err);
      setShake(false);
      requestAnimationFrame(() => setShake(true));
      return;
    }
    onCommit(trimmed);
  };

  return (
    <div className={appStyles.InlineEditor}>
      <Tooltip content={error} side="top" open={error != null} onOpenChange={() => {}}>
        <input
          ref={inputRef}
          className={[appStyles.InlineInput, error ? appStyles.hasError : '', shake ? appStyles.shake : ''].filter(Boolean).join(' ')}
          value={value}
          placeholder={field === 'thArea' ? 'e.g. 11' : 'e.g. MOD'}
          onChange={(e) => {
            onChange(field === 'surface' ? e.target.value.toUpperCase() : e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={(e) => {
            // Focus moving into the Tooth and Surface Selector popover isn't
            // "clicking away" — the popover is still editing this same cell.
            if (e.relatedTarget instanceof Element && e.relatedTarget.closest('[data-tooth-selector-popup]')) return;
            if (!value.trim()) onCancel();
          }}
          onAnimationEnd={() => setShake(false)}
        />
      </Tooltip>
    </div>
  );
}

function PlanHeader({
  planLabel,
  onPlanLabelChange,
  status,
  phasesCompleted,
  phasesTotal,
  showInsBreakdown,
  onShowInsBreakdownChange,
  codes,
  onAddCode,
}: {
  codes?: DentalCode[];
  onAddCode?: (code: DentalCode, input?: CodeInput) => void;
  planLabel: string;
  onPlanLabelChange: (label: string) => void;
  status: string;
  phasesCompleted: number;
  phasesTotal: number;
  showInsBreakdown: boolean;
  onShowInsBreakdownChange: (checked: boolean) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);

  return (
    <header className={styles.Header}>
      <div className={styles.HeaderLeft}>
        <div className={styles.TitleGroup}>
          <div className={styles.TitleCluster}>
            <EditableName
              as="h2"
              value={planLabel}
              onCommit={onPlanLabelChange}
              maxLength={NAME_MAX_LENGTH}
              className={styles.PlanTitle}
              aria-label="Plan name"
              editing={renaming}
              onEditingChange={setRenaming}
            />
            <Tooltip content="Edit Tx plan details" side="right" delay={400} disabled={editDetailsOpen}>
              <Button
                variant="ghost"
                iconOnly
                leftIcon={<EditIcon />}
                aria-label="Edit Tx plan details"
                className={styles.EditButton}
                onClick={() => setEditDetailsOpen(true)}
              />
            </Tooltip>
            <Tag variant="fill" color="grey">{status}</Tag>
          </div>
        </div>

        <div className={styles.ProgressInfo}>
          <span className={styles.ProgressRing} aria-hidden="true" />
          <p className={styles.ProgressText}>
            <strong>{phasesCompleted}/{phasesTotal} phases</strong> completed
          </p>
        </div>
      </div>

      <div className={styles.HeaderRight}>
        {codes && onAddCode && <PlanCodeAdd codes={codes} onAddCode={onAddCode} />}
        <Button variant="secondary" leftIcon={<RetryIcon />}>Recalculate</Button>
        <Checkbox
          checked={showInsBreakdown}
          onCheckedChange={(checked) => onShowInsBreakdownChange(checked === true)}
        >
          Show Ins. breakdown
        </Checkbox>
      </div>

      <EditPlanDetailsDialog
        open={editDetailsOpen}
        onOpenChange={setEditDetailsOpen}
        planName={planLabel}
        onSave={onPlanLabelChange}
      />
    </header>
  );
}

function ColumnHeaders({ total, selected, onToggleAll }: { total: number; selected: number; onToggleAll: (checked: boolean) => void }) {
  return (
    <div className={styles.HeaderRow} role="row">
      <div className={styles.ThCenter} role="columnheader" />
      <div className={styles.ThCenter} role="columnheader">
        <Checkbox
          checked={total > 0 && selected === total}
          indeterminate={selected > 0 && selected < total}
          disabled={total === 0}
          onCheckedChange={(checked) => onToggleAll(checked === true)}
          aria-label="Select all procedures"
        />
      </div>
      <div className={styles.Th} role="columnheader">Date</div>
      <div className={styles.Th} role="columnheader">Code</div>
      <div className={styles.Th} role="columnheader">Th/Area</div>
      <div className={styles.Th} role="columnheader">Surface</div>
      <div className={styles.Th} role="columnheader">Provider</div>
      <div className={styles.Th} role="columnheader">Loc.</div>
      <div className={styles.Th} role="columnheader">Fee</div>
      <div className={styles.Th} role="columnheader">Disc.</div>
      <div className={styles.Th} role="columnheader">Pat. Payable</div>
      <div className={styles.ThCenter} role="columnheader">
        <NotesIcon />
      </div>
      <div className={styles.Th} role="columnheader">Status</div>
    </div>
  );
}

function ProcedureRow({
  procedure,
  selected,
  onToggle,
  pending,
  editingCell,
  onStartEditCell,
  onCommitCell,
  onCancelEditCell,
  onDraftChange,
  onDeletePending,
  isValidTooth,
  isValidSurface,
  onSelectArea,
  dnd,
  phaseId,
  index,
  count,
}: {
  procedure: PlanProcedure;
  dnd: PlanDnd;
  phaseId: string;
  index: number;
  count: number;
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  pending: boolean;
  editingCell: PlanEditingCell | null;
  onStartEditCell: (rowId: string, field: 'thArea' | 'surface', anchorEl?: HTMLElement) => void;
  onCommitCell: (rowId: string, field: 'thArea' | 'surface', value: string) => void;
  onCancelEditCell: () => void;
  onDraftChange: (procedureId: string, field: 'thArea' | 'surface', value: string) => void;
  onDeletePending: (id: string) => void;
  isValidTooth: (value: string) => string | null;
  isValidSurface: (value: string) => string | null;
  onSelectArea: (procedureId: string, areaId: string) => void;
}) {
  const requires = procedure.requires ?? 'none';
  const needsTooth = pending && requires !== 'none' && requires !== 'area';
  const needsSurface = pending && requires === 'surface';

  const thAreaCell = (() => {
    if (pending && requires === 'area') {
      if (editingCell?.rowId === procedure.id && editingCell.field === 'thArea') {
        return (
          <Select
            value={procedure.thArea || null}
            defaultOpen
            onOpenChange={(open) => { if (!open) onCancelEditCell(); }}
            onValueChange={(val) => { if (typeof val === 'string') onSelectArea(procedure.id, val); }}
          >
            <SelectTrigger className={appStyles.AreaSelect} placeholder="Choose area" aria-label="Choose area" />
            <SelectContent positionerStyle={{ width: 200, minWidth: 200 }}>
              {AREA_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (procedure.thArea) {
        return (
          <span
            style={{ cursor: 'pointer' }}
            onClick={() => onStartEditCell(procedure.id, 'thArea')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') onStartEditCell(procedure.id, 'thArea');
            }}
          >
            {procedure.thArea}
          </span>
        );
      }
      return (
        <span
          className={appStyles.PendingCell}
          onClick={() => onStartEditCell(procedure.id, 'thArea')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onStartEditCell(procedure.id, 'thArea');
          }}
        >
          <WarningIcon />
        </span>
      );
    }
    if (!needsTooth) return procedure.thArea || '--';
    if (editingCell?.rowId === procedure.id && editingCell.field === 'thArea') {
      return (
        <PlanInlineEditCell
          field="thArea"
          value={procedure.thArea || ''}
          onChange={(val) => onDraftChange(procedure.id, 'thArea', val)}
          validate={isValidTooth}
          onCommit={(val) => onCommitCell(procedure.id, 'thArea', val)}
          onCancel={onCancelEditCell}
        />
      );
    }
    // Tooth already entered (e.g. waiting on surface) — show it, not the warning.
    if (procedure.thArea) {
      return (
        <span
          style={{ cursor: 'pointer' }}
          onClick={(e) => onStartEditCell(procedure.id, 'thArea', e.currentTarget.closest<HTMLElement>('[data-row-id]') ?? e.currentTarget)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onStartEditCell(procedure.id, 'thArea', e.currentTarget.closest<HTMLElement>('[data-row-id]') ?? e.currentTarget);
          }}
        >
          {procedure.thArea}
        </span>
      );
    }
    return (
      <span
        className={appStyles.PendingCell}
        onClick={(e) => onStartEditCell(procedure.id, 'thArea', e.currentTarget.closest<HTMLElement>('[data-row-id]') ?? e.currentTarget)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') onStartEditCell(procedure.id, 'thArea', e.currentTarget.closest<HTMLElement>('[data-row-id]') ?? e.currentTarget);
        }}
      >
        <WarningIcon />
      </span>
    );
  })();

  const surfaceCell = (() => {
    if (!needsSurface) return procedure.surface || '--';
    if (editingCell?.rowId === procedure.id && editingCell.field === 'surface') {
      return (
        <PlanInlineEditCell
          field="surface"
          value={(() => { const s = procedure.surface || ''; return s && s !== '--' ? s : ''; })()}
          onChange={(val) => onDraftChange(procedure.id, 'surface', val)}
          validate={isValidSurface}
          onCommit={(val) => onCommitCell(procedure.id, 'surface', val)}
          onCancel={onCancelEditCell}
        />
      );
    }
    if (procedure.thArea) {
      return (
        <span
          className={appStyles.PendingCell}
          onClick={(e) => onStartEditCell(procedure.id, 'surface', e.currentTarget.closest<HTMLElement>('[data-row-id]') ?? e.currentTarget)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onStartEditCell(procedure.id, 'surface', e.currentTarget.closest<HTMLElement>('[data-row-id]') ?? e.currentTarget);
          }}
        >
          <WarningIcon />
        </span>
      );
    }
    return (
      <span className={appStyles.PendingCell}>
        <WarningIcon />
      </span>
    );
  })();

  return (
    <div
      className={[
        styles.Row,
        pending ? styles.PendingRow : '',
        selected ? styles.RowSelected : '',
        dnd.dragStarted && dnd.dragIds.includes(procedure.id) ? styles.RowDragging : '',
        dnd.spreadIds.includes(procedure.id) ? styles.RowSpread : '',
        dnd.dragId && dnd.drop?.phaseId === phaseId && dnd.drop.index === index ? styles.GapBefore : '',
      ].filter(Boolean).join(' ')}
      role="row"
      data-row-id={procedure.id}
      style={dnd.spreadIds.includes(procedure.id) ? { animationDelay: `${dnd.spreadIds.indexOf(procedure.id) * 70}ms` } : undefined}
      onDragOver={(e) => dnd.onDragOver(e, phaseId, index)}
      onDrop={dnd.onDrop}
    >
      <div className={styles.TdCenter} role="cell">
        <button
          type="button"
          draggable
          className={styles.DragHandle}
          data-drag-handle
          aria-label={`Reorder ${procedure.code}. Drag, or use the up and down arrow keys.`}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', procedure.id);
            const row = e.currentTarget.closest<HTMLElement>('[role="row"]');
            const ids = dnd.onDragStart(procedure.id, row?.offsetHeight ?? 33);
            if (row) {
              const ghost = document.createElement('div');
              if (ids.length > 1) {
                // Several rows: a small "Moving N codes" card with a stack behind it.
                ghost.className = styles.DragStack;
                for (let i = Math.min(ids.length, 3) - 1; i >= 1; i -= 1) {
                  const layer = document.createElement('div');
                  layer.className = styles.DragStackCard;
                  layer.style.transform = `translate(${i * 4}px, ${i * 4}px)`;
                  ghost.appendChild(layer);
                }
                const front = document.createElement('div');
                front.className = [styles.DragStackCard, styles.DragStackFront].join(' ');
                front.textContent = `Moving ${ids.length} codes`;
                ghost.appendChild(front);
                row.parentElement?.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 24, 28);
              } else {
                // One row: a lifted copy of it, opaque, outlined and shadowed.
                ghost.className = styles.DragGhost;
                ghost.style.width = `${row.offsetWidth}px`;
                const clone = row.cloneNode(true) as HTMLElement;
                clone.removeAttribute('data-row-id');
                ghost.appendChild(clone);
                row.parentElement?.appendChild(ghost);
                e.dataTransfer.setDragImage(ghost, 16, 16);
              }
              setTimeout(() => ghost.remove(), 0);
            }
          }}
          onDragEnd={dnd.onDragEnd}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
            e.preventDefault();
            dnd.onNudge(procedure.id, phaseId, index, count, e.key === 'ArrowUp' ? -1 : 1);
          }}
        >
          <DragHandleIcon />
        </button>
      </div>
      <div className={styles.TdCenter} role="cell">
        <Checkbox
          checked={selected}
          onCheckedChange={(checked) => onToggle(procedure.id, checked === true)}
          aria-label={`Select ${procedure.code}`}
        />
      </div>
      <div className={styles.TdMuted} role="cell">{procedure.date}</div>
      <div className={styles.CodeCell} role="cell">
        {pending ? (
          <span className={styles.PendingCode}>
            {procedure.code} — select {requires === 'surface' ? 'a surface' : requires === 'area' ? 'an area' : 'a tooth'}
          </span>
        ) : (
          <Button variant="link">{procedure.code}</Button>
        )}
      </div>
      <div className={styles.Td} role="cell">{thAreaCell}</div>
      <div className={styles.Td} role="cell">{surfaceCell}</div>
      <div className={styles.Td} role="cell">
        <Button variant="link">{procedure.provider}</Button>
      </div>
      <div className={styles.Td} role="cell">
        <Button variant="link">{procedure.location}</Button>
      </div>
      <div className={styles.Td} role="cell">{procedure.fee}</div>
      <div className={styles.Td} role="cell">{procedure.discount}</div>
      <div className={styles.Td} role="cell">{procedure.patPayable}</div>
      <div className={styles.TdCenter} role="cell">
        <Button variant="ghost" iconOnly leftIcon={<NotesIcon />} aria-label={`Notes for ${procedure.code}`} />
      </div>
      <div className={styles.Td} role="cell">
        <div className={styles.StatusCell}>
          <Tag variant="fill" color={STATUS_COLOR[procedure.status]}>{procedure.status}</Tag>
          {pending ? (
            <Button
              type="button"
              variant="secondary-destructive-ghost"
              iconOnly
              leftIcon={<CloseIcon />}
              onClick={() => onDeletePending(procedure.id)}
              aria-label="Remove pending row"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The selected phase's bottom outline. It is a cap (see CSS) while the phase's real bottom edge
 *  is below the fold or within the table's rounded corner (the last 8px), so the line is never
 *  cut by the table's clip; otherwise it is a straight line. */
function PhaseBottomEdge() {
  const sentinel = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    let scroller = el.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    // The scroller's bottom 8px count as out of view: that is where the table's corners clip.
    const observer = new IntersectionObserver(([entry]) => setPinned(!entry.isIntersecting), {
      root: scroller,
      rootMargin: '0px 0px -8px 0px',
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div ref={sentinel} className={styles.PhaseBottomSentinel} aria-hidden />
      <div className={styles.PhaseBottomEdge} data-pinned={pinned || undefined} aria-hidden />
    </>
  );
}

function PhaseSection({
  phase,
  phaseName,
  onPhaseNameChange,
  renaming,
  onRenamingChange,
  expanded,
  onToggleExpanded,
  isTarget,
  onSelectTarget,
  selectedIds,
  onToggleRow,
  onTogglePhaseRows,
  duration,
  onDurationChange,
  pendingProcedureIds,
  editingCell,
  onStartEditCell,
  onCommitCell,
  onCancelEditCell,
  onDraftChange,
  onDeletePendingProcedure,
  isValidTooth,
  isValidSurface,
  onSelectArea,
  dnd,
  phaseDnd,
  phaseIndex,
}: {
  dnd: PlanDnd;
  phaseDnd: PhaseDnd;
  phaseIndex: number;
  phase: PlanPhase;
  phaseName: string;
  onPhaseNameChange: (name: string) => void;
  renaming: boolean;
  onRenamingChange: (renaming: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  isTarget: boolean;
  onSelectTarget: () => void;
  selectedIds: Set<string>;
  onToggleRow: (id: string, checked: boolean) => void;
  /** Checks or unchecks every code in the phase. */
  onTogglePhaseRows: (phase: PlanPhase, checked: boolean) => void;
  duration: DurationValue;
  onDurationChange: (value: DurationValue) => void;
  pendingProcedureIds: Set<string>;
  editingCell: PlanEditingCell | null;
  onStartEditCell: (rowId: string, field: 'thArea' | 'surface', anchorEl?: HTMLElement) => void;
  onCommitCell: (rowId: string, field: 'thArea' | 'surface', value: string) => void;
  onCancelEditCell: () => void;
  onDraftChange: (procedureId: string, field: 'thArea' | 'surface', value: string) => void;
  onDeletePendingProcedure: (id: string) => void;
  isValidTooth: (value: string) => string | null;
  isValidSurface: (value: string) => string | null;
  onSelectArea: (procedureId: string, areaId: string) => void;
}) {
  const total = phase.procedures.length;
  const checkedCount = phase.procedures.filter((p) => selectedIds.has(p.id)).length;
  return (
    <section
      className={[
        styles.PhaseCard,
        isTarget ? styles.PhaseCardActive : '',
        phaseDnd.dragPhaseStarted && phaseDnd.dragPhaseId === phase.id ? styles.PhaseCardDragging : '',
      ].filter(Boolean).join(' ')}
      data-phase-id={phase.id}
      onDragOver={(e) => phaseDnd.onDragOver(e, phaseIndex)}
      onDrop={phaseDnd.onDrop}
    >
      <div
        draggable={!renaming}
        onDragStart={(e) => {
          if (e.target !== e.currentTarget) return; // inner controls don't start a phase drag
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', phase.id);
          const header = e.currentTarget;
          const ghost = header.cloneNode(true) as HTMLElement;
          ghost.className = [header.className, styles.DragGhost, styles.DragGhostPlain].join(' ');
          ghost.style.width = `${header.offsetWidth}px`;
          header.parentElement?.appendChild(ghost);
          e.dataTransfer.setDragImage(ghost, 24, 18);
          setTimeout(() => ghost.remove(), 0);
          phaseDnd.onDragStart(phase.id, header.offsetHeight);
        }}
        onDragEnd={phaseDnd.onDragEnd}
        className={[styles.PhaseHeader, dnd.dragId && dnd.drop?.phaseId === phase.id && !expanded ? styles.PhaseHeaderDrop : ''].filter(Boolean).join(' ')}
        onDragOver={(e) => dnd.onHeaderDragOver(e, phase.id, phase.procedures.length, expanded)}
        onDrop={dnd.onDrop}
        onClick={onSelectTarget}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.target === e.currentTarget) {
            e.preventDefault();
            phaseDnd.onNudge(phase.id, phaseIndex, e.key === 'ArrowUp' ? -1 : 1);
            return;
          }
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTarget();
          }
        }}
        aria-label={`Add codes to ${phaseName}. Drag, or press Alt and the up or down arrow, to reorder phases.`}
      >
        <div className={styles.PhaseLeft}>
          <Button
            variant="ghost"
            iconOnly
            className={styles.PhaseToggle}
            leftIcon={
              <AngleDownIcon
                className={[
                  styles.PhaseToggleIcon,
                  expanded ? styles.PhaseToggleIconOpen : styles.PhaseToggleIconClosed,
                ].join(' ')}
              />
            }
            aria-label={expanded ? `Collapse ${phaseName}` : `Expand ${phaseName}`}
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpanded();
            }}
          />
          <div
            className={styles.PhaseCheck}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <Checkbox
              checked={total > 0 && checkedCount === total}
              indeterminate={checkedCount > 0 && checkedCount < total}
              disabled={total === 0}
              onCheckedChange={(checked) => onTogglePhaseRows(phase, checked === true)}
              aria-label={`Select all codes in ${phaseName}`}
            />
          </div>
          <div
            className={styles.PhaseDetails}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <PhaseDuration
              name={phaseName}
              onNameChange={onPhaseNameChange}
              value={duration}
              onChange={onDurationChange}
              maxLength={NAME_MAX_LENGTH}
              open={renaming}
              onOpenChange={onRenamingChange}
              aria-label={`${phaseName} details`}
            />
          </div>
          {isTarget && (
            <span className={styles.InfoChip}>
              <InfoSolidIcon />
              Codes will be added here
            </span>
          )}
        </div>

        <div className={styles.PhaseRight} onClick={(e) => e.stopPropagation()}>
          <div className={styles.ApptInfo}>
            <span className={styles.ApptLabel}>
              <NotScheduledIcon />
              No appointments booked
            </span>
            <Button variant="link">Schedule</Button>
          </div>
          <Menu>
            <MenuTrigger>
              <Button
                variant="secondary"
                iconOnly
                leftIcon={<KebabMenuIcon />}
                aria-label={`${phaseName} actions`}
              />
            </MenuTrigger>
            <MenuContent side="bottom" align="end">
              <MenuItem onClick={() => onRenamingChange(true)}>Rename phase</MenuItem>
              <MenuItem>Move phase</MenuItem>
              <MenuItem destructive>Delete phase</MenuItem>
            </MenuContent>
          </Menu>
        </div>
      </div>

      <div className={[styles.PhaseBody, expanded ? styles.PhaseBodyOpen : ''].join(' ')}>
        <div className={styles.PhaseBodyInner} onDragOver={(e) => dnd.onBodyDragOver(e, phase.id, phase.procedures.length)} onDrop={dnd.onDrop}>
          {phase.procedures.length === 0 ? (
            <div
              className={[styles.EmptyPhase, dnd.drop?.phaseId === phase.id ? styles.EmptyPhaseDrop : ''].filter(Boolean).join(' ')}
              onDragOver={(e) => dnd.onDragOver(e, phase.id, 0)}
              onDrop={dnd.onDrop}
            >
              No codes added to this phase yet
            </div>
          ) : (
            <>
              {phase.procedures.map((procedure, index) => (
                <ProcedureRow
                  key={procedure.id}
                  dnd={dnd}
                  phaseId={phase.id}
                  index={index}
                  count={phase.procedures.length}
                  procedure={procedure}
                  selected={selectedIds.has(procedure.id)}
                  onToggle={onToggleRow}
                  pending={pendingProcedureIds.has(procedure.id)}
                  editingCell={editingCell}
                  onStartEditCell={onStartEditCell}
                  onCommitCell={onCommitCell}
                  onCancelEditCell={onCancelEditCell}
                  onDraftChange={onDraftChange}
                  onDeletePending={onDeletePendingProcedure}
                  isValidTooth={isValidTooth}
                  isValidSurface={isValidSurface}
                  onSelectArea={onSelectArea}
                />
              ))}
              {dnd.dragId && (
                <div
                  className={styles.DropTail}
                  data-open={(dnd.drop?.phaseId === phase.id && dnd.drop.index === phase.procedures.length) || undefined}
                />
              )}
              {phase.estimate && (
                <div className={styles.EstimateRow} role="row">
                  <div className={styles.EstimateSpacer} />
                  <div className={styles.EstimateValue} role="cell">{phase.estimate.fee}</div>
                  <div className={styles.EstimateValue} role="cell">{phase.estimate.discount}</div>
                  <div className={styles.EstimateValue} role="cell">{phase.estimate.patPayable}</div>
                  <div className={styles.EstimateLabel} role="cell" />
                  <div className={styles.EstimateLabel} role="cell" />
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {isTarget && <PhaseBottomEdge />}
    </section>
  );
}

function PlanFooter({
  totals,
}: {
  totals: { planEstimate: string; discount: string; patientPayable: string };
}) {
  return (
    <footer className={styles.Footer}>
      <div className={styles.Totals}>
        <span className={styles.TotalItem}>Total Plan Estimate: {totals.planEstimate}</span>
        <span className={styles.TotalItem}>Total Discount: {totals.discount}</span>
        <span className={styles.TotalItem}>Total Patient Payable: {totals.patientPayable}</span>
      </div>

      <div className={styles.FooterActions}>
        <Button variant="link">Schedule</Button>

        <Menu>
          <MenuTrigger>
            <Button variant="secondary" rightIcon={<AngleDownIcon />}>Present</Button>
          </MenuTrigger>
          <MenuContent side="top" align="end">
            <MenuItem>Present to patient</MenuItem>
            <MenuItem>Present digitally</MenuItem>
          </MenuContent>
        </Menu>

        <Menu>
          <MenuTrigger>
            <Button variant="secondary" leftIcon={<PrintIcon />} rightIcon={<AngleDownIcon />}>
              Print
            </Button>
          </MenuTrigger>
          <MenuContent side="top" align="end">
            <MenuItem>Print plan</MenuItem>
            <MenuItem>Print estimate</MenuItem>
          </MenuContent>
        </Menu>

        <div className={styles.FooterDivider} aria-hidden="true" />

        <Button variant="secondary-destructive">Reject</Button>
        <Button variant="primary">Accept</Button>
      </div>
    </footer>
  );
}

export function TreatmentPlanView({
  planId,
  plan,
  planLabel,
  compact = false,
  onPlanLabelChange,
  targetPhaseId,
  onSelectTargetPhase,
  pendingProcedureIds,
  editingCell,
  onStartEditCell,
  onCommitCell,
  onCancelEditCell,
  onDraftChange,
  onDeletePendingProcedure,
  isValidTooth,
  isValidSurface,
  onSelectArea,
  onMoveProcedure,
  onMovePhase,
  onAddPhase,
  codes,
  onAddCode,
}: TreatmentPlanViewProps) {
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => {
    const first = plan.phases[0]?.id;
    return new Set(first ? [first] : []);
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showInsBreakdown, setShowInsBreakdown] = useState(true);
  const [durations, setDurations] = useState<Record<string, DurationValue>>({});
  const [phaseNames, setPhaseNames] = useState<Record<string, string>>(() =>
    Object.fromEntries(plan.phases.map((phase) => [phase.id, phase.name])),
  );
  const [renamingPhaseId, setRenamingPhaseId] = useState<string | null>(null);

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragIds, setDragIds] = useState<string[]>([]);
  const [dragStarted, setDragStarted] = useState(false);
  // Codes just dropped as a group: they open out from the single drop row, one after another.
  const [spreadIds, setSpreadIds] = useState<string[]>([]);
  const spreadTimer = useRef<number | null>(null);
  // A drop event bubbles through row → body → table; only the first one may commit.
  const dropHandled = useRef(false);

  // Native drag-and-drop doesn't scroll this custom scroll area, so while a code or phase is being
  // dragged near its top or bottom edge we scroll it ourselves (faster the closer to the edge).
  const autoScroll = useRef<{ el: HTMLElement | null; speed: number; timer: number | null }>({ el: null, speed: 0, timer: null });
  const stopAutoScroll = () => {
    const a = autoScroll.current;
    if (a.timer !== null) window.clearInterval(a.timer);
    a.timer = null;
    a.speed = 0;
  };
  const updateAutoScroll = (e: React.DragEvent) => {
    const table = e.currentTarget.querySelector<HTMLElement>('[role="table"]');
    let el: HTMLElement | null = table;
    while (el && !/(auto|scroll)/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ZONE = 60; // px from the top / bottom edge where scrolling kicks in
    const top = rect.top + ZONE + 33; // the sticky column header sits at the very top
    const bottom = rect.bottom - ZONE;
    const ramp = (depth: number) => Math.min(1, Math.max(0.15, depth / ZONE)) * 18;
    const speed = e.clientY < top ? -ramp(top - e.clientY) : e.clientY > bottom ? ramp(e.clientY - bottom) : 0;
    const a = autoScroll.current;
    a.el = el;
    a.speed = speed;
    if (speed === 0) { stopAutoScroll(); return; }
    if (a.timer === null) {
      a.timer = window.setInterval(() => { if (a.el) a.el.scrollTop += a.speed; }, 16);
    }
  };
  useEffect(() => stopAutoScroll, []);
  // After a phase is moved to `index` (counted in the current list, like onMovePhase), phases that
  // still carry a default "Phase N" name take their new position; renamed phases keep their name.
  const renumberAfterMove = (phaseId: string, index: number) => {
    const from = plan.phases.findIndex((ph) => ph.id === phaseId);
    if (from < 0) return;
    const order = [...plan.phases];
    order.splice(from < index ? index - 1 : index, 0, ...order.splice(from, 1));
    setPhaseNames((prev) => {
      const next = { ...prev };
      order.forEach((ph, i) => {
        if (/^Phase \d+$/.test(prev[ph.id] ?? ph.name)) next[ph.id] = `Phase ${i + 1}`;
      });
      return next;
    });
  };
  const expandedBeforePhaseDrag = useRef<Set<string> | null>(null);
  const restoreExpanded = () => {
    const prev = expandedBeforePhaseDrag.current;
    expandedBeforePhaseDrag.current = null;
    if (prev) setExpandedPhases(prev);
  };
  const [dragPhaseId, setDragPhaseId] = useState<string | null>(null);
  const [dragPhaseStarted, setDragPhaseStarted] = useState(false);
  const [dragPhaseHeight, setDragPhaseHeight] = useState(36);
  const [dropPhaseIndex, setDropPhaseIndex] = useState<number | null>(null);
  const phaseDnd: PhaseDnd = {
    dragPhaseId,
    dragPhaseStarted,
    dropIndex: dropPhaseIndex,
    onDragStart: (id, height) => {
      dropHandled.current = false;
      setDragPhaseId(id);
      setDragPhaseHeight(height);
      // Fold every phase down to its header so they're easy to reorder; restored afterwards.
      expandedBeforePhaseDrag.current = new Set(expandedPhases);
      requestAnimationFrame(() => setExpandedPhases(new Set()));
      // The carried phase stays where it was as a faded ghost. It is marked once the drag is under
      // way (changing the source inside dragstart can cancel the drag in some browsers).
      window.setTimeout(() => setDragPhaseStarted(true), 0);
    },
    onDragEnd: () => { stopAutoScroll(); setDragPhaseId(null); setDragPhaseStarted(false); setDropPhaseIndex(null); restoreExpanded(); },
    onDragOver: (e, index) => {
      if (!dragPhaseId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const next = index + (e.clientY > rect.top + rect.height / 2 ? 1 : 0);
      setDropPhaseIndex((prev) => (prev === next ? prev : next));
    },
    onDrop: (e) => {
      if (!dragPhaseId) return;
      e.preventDefault();
      if (dropHandled.current) return;
      dropHandled.current = true;
      stopAutoScroll();
      if (dropPhaseIndex !== null) {
        onMovePhase(dragPhaseId, dropPhaseIndex);
        renumberAfterMove(dragPhaseId, dropPhaseIndex);
      }
      const droppedId = dragPhaseId;
      setDragPhaseId(null);
      setDragPhaseStarted(false);
      setDropPhaseIndex(null);
      restoreExpanded();
      selectTargetPhase(droppedId); // the moved phase becomes the selected one (after restoreExpanded, which would reset its expansion)
      revealPhase(droppedId); // keep the moved phase on screen, wherever it landed
    },
    onNudge: (id, index, dir) => {
      const to = dir < 0 ? index - 1 : index + 2;
      if (to < 0 || to > plan.phases.length) return;
      onMovePhase(id, to);
      renumberAfterMove(id, to);
      selectTargetPhase(id);
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[data-phase-id="${id}"] [role="button"][aria-label^="Add codes to"]`)?.focus());
    },
  };
  const [dragHeight, setDragHeight] = useState(33);
  const [drop, setDrop] = useState<{ phaseId: string; index: number } | null>(null);
  const expandTimer = useRef<{ phaseId: string; t: number } | null>(null);
  const clearExpandTimer = () => {
    if (expandTimer.current) window.clearTimeout(expandTimer.current.t);
    expandTimer.current = null;
  };
  const setDropAt = (phaseId: string, index: number) =>
    setDrop((prev) => (prev?.phaseId === phaseId && prev.index === index ? prev : { phaseId, index }));
  const dnd: PlanDnd = {
    dragId,
    dragIds,
    dragStarted,
    spreadIds,
    drop,
    onDragStart: (id, rowHeight) => {
      // Dragging a checked row carries every checked row, in plan order.
      const ids = selectedIds.has(id) && selectedIds.size > 1
        ? plan.phases.flatMap((ph) => ph.procedures).map((p) => p.id).filter((pid) => selectedIds.has(pid))
        : [id];
      dropHandled.current = false;
      setDragId(id);
      setDragIds(ids);
      setDragHeight(rowHeight);
      // The original rows stay where they were as faded ghosts. They are marked once the drag is
      // under way (changing the source inside the dragstart event itself can cancel the drag in
      // some browsers).
      window.setTimeout(() => setDragStarted(true), 0);
      return ids;
    },
    onDragEnd: () => { stopAutoScroll(); clearExpandTimer(); setDragId(null); setDragIds([]); setDragStarted(false); setDrop(null); },
    onHeaderDragOver: (e, phaseId, count, expanded) => {
      if (!dragId) return;
      e.preventDefault();
      setDropAt(phaseId, count);
      // Hovering a collapsed phase opens it, so the code can be placed inside.
      if (!expanded && expandTimer.current?.phaseId !== phaseId) {
        clearExpandTimer();
        expandTimer.current = {
          phaseId,
          t: window.setTimeout(() => setExpandedPhases((prev) => new Set(prev).add(phaseId)), 450),
        };
      }
    },
    onBodyDragOver: (e, phaseId, count) => {
      if (!dragId) return;
      e.preventDefault(); // the gap between rows is not a row, but still a valid drop spot
      if ((e.target as HTMLElement).closest('[data-row-id]')) return;
      const rows = e.currentTarget.querySelectorAll('[data-row-id]');
      const last = rows[rows.length - 1];
      if (last && e.clientY > last.getBoundingClientRect().bottom) setDropAt(phaseId, count);
    },
    onDragOver: (e, phaseId, index) => {
      if (!dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const rect = e.currentTarget.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      const next = { phaseId, index: index + (after ? 1 : 0) };
      setDrop((prev) => (prev?.phaseId === next.phaseId && prev.index === next.index ? prev : next));
    },
    onDrop: (e) => {
      // Code drops only: a phase being dropped bubbles through the same headers and bodies and
      // must reach the phase handler untouched.
      if (!dragId) return;
      e.preventDefault();
      if (dropHandled.current) return;
      dropHandled.current = true;
      stopAutoScroll();
      clearExpandTimer();
      if (dragId && drop) {
        onMoveProcedure(dragIds, drop.phaseId, drop.index);
        if (dragIds.length > 1) {
          setSpreadIds(dragIds);
          if (spreadTimer.current) window.clearTimeout(spreadTimer.current);
          spreadTimer.current = window.setTimeout(() => setSpreadIds([]), 900);
        }
      }
      setDragId(null);
      setDragIds([]);
      setDragStarted(false);
      setDrop(null);
    },
    onNudge: (id, phaseId, index, count, dir) => {
      const to = dir < 0 ? index - 1 : index + 2;
      if (to < 0 || to > count) return;
      onMoveProcedure([id], phaseId, to);
      // The row re-renders in a new spot; keep the keyboard on its handle.
      requestAnimationFrame(() =>
        document.querySelector<HTMLElement>(`[data-row-id="${id}"] [data-drag-handle]`)?.focus());
    },
  };

  useEffect(() => {
    const first = plan.phases[0]?.id;
    setExpandedPhases(new Set(first ? [first] : []));
    setSelectedIds(new Set());
    setDurations({});
    setPhaseNames(Object.fromEntries(plan.phases.map((phase) => [phase.id, phase.name])));
    setRenamingPhaseId(null);
  }, [planId]);

  // Keep the drop-target phase expanded so the banner and new rows are visible.
  useEffect(() => {
    if (!targetPhaseId) return;
    setExpandedPhases((prev) => {
      if (prev.has(targetPhaseId)) return prev;
      const next = new Set(prev);
      next.add(targetPhaseId);
      return next;
    });
  }, [targetPhaseId]);

  // If the user collapses the still-selected target then adds a code, reopen
  // so the new row is visible (pending or completed insert).
  const targetProcedureCount =
    plan.phases.find((phase) => phase.id === targetPhaseId)?.procedures.length ?? 0;
  const prevTargetCountRef = useRef(targetProcedureCount);
  useEffect(() => {
    prevTargetCountRef.current = targetProcedureCount;
  }, [planId]);
  useEffect(() => {
    const prevCount = prevTargetCountRef.current;
    prevTargetCountRef.current = targetProcedureCount;
    if (!targetPhaseId || targetProcedureCount <= prevCount) return;
    setExpandedPhases((prev) => {
      if (prev.has(targetPhaseId)) return prev;
      const next = new Set(prev);
      next.add(targetPhaseId);
      return next;
    });
  }, [targetProcedureCount, targetPhaseId]);

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

  // New Phase: lands right below the selected phase and becomes the selected one.
  // Phases that still carry a default "Phase N" name are renumbered to match their position.
  const addPhase = () => {
    const at = plan.phases.findIndex((ph) => ph.id === targetPhaseId);
    const insertAt = at < 0 ? plan.phases.length : at + 1;
    const nextNum = plan.phases.reduce((max, ph) => Math.max(max, Number(ph.id.replace(/\D/g, '')) || 0), 0) + 1;
    const id = `phase-${nextNum}`;
    const after = plan.phases.slice(insertAt);
    setPhaseNames((prev) => {
      const next = { ...prev, [id]: `Phase ${insertAt + 1}` };
      after.forEach((ph, i) => {
        if (/^Phase \d+$/.test(next[ph.id] ?? ph.name)) next[ph.id] = `Phase ${insertAt + i + 2}`;
      });
      return next;
    });
    onAddPhase(at < 0 ? null : targetPhaseId, { id, name: `Phase ${insertAt + 1}`, procedures: [] });
    selectTargetPhase(id);
    scrollToPhaseRef.current = id;
  };

  // Bring a phase into view after it was added or dropped (it can land below the scroll area's
  // fold). Once as it renders, and again once its body has finished opening.
  const scrollToPhaseRef = useRef<string | null>(null);
  const revealPhase = (id: string) => {
    // Scrolls just enough that the whole phase is on screen, clear of the sticky column header.
    // Phases are reopening while this runs, so it is re-checked as the layout settles: smooth the
    // first time, instant corrections afterwards.
    const reveal = (smooth: boolean) => {
      const section = document.querySelector<HTMLElement>(`[data-phase-id="${id}"]`);
      let vp: HTMLElement | null = section;
      while (vp && !/(auto|scroll)/.test(getComputedStyle(vp).overflowY)) vp = vp.parentElement;
      if (!section || !vp) return;
      const v = vp.getBoundingClientRect();
      const sec = section.getBoundingClientRect();
      const top = v.top + 33 + 4; // clear of the sticky column header
      const bottom = v.bottom - 8;
      let delta = 0;
      if (sec.height <= bottom - top) {
        // The whole phase fits: bring all of it (header and body) into view.
        if (sec.top < top) delta = sec.top - top;
        else if (sec.bottom > bottom) delta = sec.bottom - bottom;
      } else {
        // Taller than the table area: make sure its header is in view. A header already pinned
        // under the column header (~34px down) counts as visible.
        const h = (section.firstElementChild as HTMLElement).getBoundingClientRect();
        if (h.top < v.top + 30) delta = h.top - top;
        else if (h.bottom > bottom) delta = h.bottom - bottom;
      }
      if (delta !== 0) vp.scrollTo({ top: vp.scrollTop + delta, behavior: smooth ? 'smooth' : 'auto' });
    };
    requestAnimationFrame(() => reveal(true));
    [120, 260, 450, 700].forEach((ms) => window.setTimeout(() => reveal(false), ms));
  };
  useEffect(() => {
    const id = scrollToPhaseRef.current;
    if (!id || !plan.phases.some((ph) => ph.id === id)) return;
    scrollToPhaseRef.current = null;
    revealPhase(id);
  }, [plan.phases]);

  const selectTargetPhase = (phaseId: string) => {
    onSelectTargetPhase(phaseId);
    setExpandedPhases((prev) => {
      if (prev.has(phaseId)) return prev;
      const next = new Set(prev);
      next.add(phaseId);
      return next;
    });
  };

  const toggleRow = (id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const allProcedureIds = plan.phases.flatMap((ph) => ph.procedures.map((p) => p.id));
  const selectedProcedureCount = allProcedureIds.filter((id) => selectedIds.has(id)).length;
  const toggleAllRows = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allProcedureIds.forEach((id) => (checked ? next.add(id) : next.delete(id)));
      return next;
    });
  };

  const togglePhaseRows = (phase: PlanPhase, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      phase.procedures.forEach((p) => (checked ? next.add(p.id) : next.delete(p.id)));
      return next;
    });
  };

  return (
    <div className={[styles.Root, compact ? styles.Compact : ''].filter(Boolean).join(' ')}>
      <PlanHeader
        planLabel={planLabel}
        onPlanLabelChange={onPlanLabelChange}
        status={plan.status}
        phasesCompleted={plan.phasesCompleted}
        phasesTotal={plan.phasesTotal}
        showInsBreakdown={showInsBreakdown}
        onShowInsBreakdownChange={setShowInsBreakdown}
        codes={codes}
        onAddCode={onAddCode}
      />

      <div className={styles.Body}>
        <div
          className={styles.TableShell}
          // Anywhere on the table accepts a drop, so releasing over a gap, a header or the empty
          // space below the last phase still lands the code or phase at its last highlighted spot.
          onDragOver={(e) => {
            if (!dragId && !dragPhaseId) return;
            e.preventDefault();
            updateAutoScroll(e);
            if (dragPhaseId && !(e.target as HTMLElement).closest('section')) {
              const sections = e.currentTarget.querySelectorAll('section');
              const last = sections[sections.length - 1];
              if (last && e.clientY > last.getBoundingClientRect().bottom) setDropPhaseIndex(plan.phases.length);
            }
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) stopAutoScroll();
          }}
          onDrop={(e) => {
            if (dragPhaseId) phaseDnd.onDrop(e);
            else if (dragId) dnd.onDrop(e);
          }}
        >
          <ScrollArea className={styles.Scroll}>
            <ScrollAreaViewport className={styles.NoBounce}>
              <ScrollAreaContent>
                <div
                  className={styles.Grid}
                  role="table"
                  aria-label={`${planLabel} procedures`}
                  style={{
                    '--row-h': `${dragHeight}px`, // one row high however many codes are carried
                    '--gap-label': dragIds.length > 1 ? `"${dragIds.length} codes"` : '""',
                    '--phase-h': `${dragPhaseHeight}px`,
                  } as React.CSSProperties}
                >
                  <ColumnHeaders total={allProcedureIds.length} selected={selectedProcedureCount} onToggleAll={toggleAllRows} />
                  {plan.phases.map((phase, phaseIndex) => {
                    const phaseName = phaseNames[phase.id] ?? phase.name;
                    return (
                      <Fragment key={phase.id}>
                      {dragPhaseId && <div className={styles.PhaseGap} data-open={dropPhaseIndex === phaseIndex || undefined} />}
                      <PhaseSection
                        phase={phase}
                        phaseName={phaseName}
                        onPhaseNameChange={(name) => {
                          setPhaseNames((prev) => ({ ...prev, [phase.id]: name }));
                        }}
                        renaming={renamingPhaseId === phase.id}
                        onRenamingChange={(next) => {
                          setRenamingPhaseId(next ? phase.id : null);
                        }}
                        expanded={expandedPhases.has(phase.id)}
                        onToggleExpanded={() => togglePhase(phase.id)}
                        isTarget={phase.id === targetPhaseId}
                        onSelectTarget={() => selectTargetPhase(phase.id)}
                        selectedIds={selectedIds}
                        onToggleRow={toggleRow}
                        onTogglePhaseRows={togglePhaseRows}
                        duration={durations[phase.id] ?? ZERO_DURATION}
                        onDurationChange={(value) => {
                          setDurations((prev) => ({ ...prev, [phase.id]: value }));
                        }}
                        pendingProcedureIds={pendingProcedureIds}
                        editingCell={editingCell}
                        onStartEditCell={onStartEditCell}
                        onCommitCell={onCommitCell}
                        onCancelEditCell={onCancelEditCell}
                        onDraftChange={onDraftChange}
                        onDeletePendingProcedure={onDeletePendingProcedure}
                        isValidTooth={isValidTooth}
                        isValidSurface={isValidSurface}
                        onSelectArea={onSelectArea}
                        dnd={dnd}
                        phaseDnd={phaseDnd}
                        phaseIndex={phaseIndex}
                      />
                      </Fragment>
                    );
                  })}
                  {dragPhaseId && (
                    <div className={styles.PhaseGap} data-open={dropPhaseIndex === plan.phases.length || undefined} />
                  )}
                </div>
              </ScrollAreaContent>
            </ScrollAreaViewport>
            <ScrollAreaScrollbar orientation="vertical" className={styles.BelowHeaderScrollbar}>
              <ScrollAreaThumb />
            </ScrollAreaScrollbar>
          </ScrollArea>
        </div>

        <Button variant="ghost" leftIcon={<PlusIcon />} className={styles.NewPhase} onClick={addPhase}>
          New Phase
        </Button>
      </div>

      <PlanFooter totals={plan.totals} />
    </div>
  );
}

export default TreatmentPlanView;
