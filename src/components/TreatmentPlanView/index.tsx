import { useEffect, useRef, useState } from 'react';
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
  onStartEditCell: (rowId: string, field: 'thArea' | 'surface') => void;
  onCommitCell: (rowId: string, field: 'thArea' | 'surface', value: string) => void;
  onCancelEditCell: () => void;
  onDeletePendingProcedure: (id: string) => void;
  isValidTooth: (value: string) => string | null;
  isValidSurface: (value: string) => string | null;
  onSelectArea: (procedureId: string, areaId: string) => void;
}

const STATUS_COLOR = {
  Proposed: 'blue',
  Completed: 'green',
  Accepted: 'teal',
} as const;

function PlanInlineEditCell({
  field,
  validate,
  onCommit,
  onCancel,
}: {
  field: 'thArea' | 'surface';
  validate: (v: string) => string | null;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState('');
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
            setValue(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') onCancel();
          }}
          onBlur={commit}
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
  linkedConditions,
  phasesCompleted,
  phasesTotal,
  showInsBreakdown,
  onShowInsBreakdownChange,
}: {
  planLabel: string;
  onPlanLabelChange: (label: string) => void;
  status: string;
  linkedConditions: number;
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

        <div className={styles.MetaGroup}>
          <span className={styles.CountBadge}>{linkedConditions}</span>
          <Button variant="link">Linked Conditions</Button>
        </div>

        <div className={styles.Divider} aria-hidden="true" />

        <div className={styles.ProgressInfo}>
          <span className={styles.ProgressRing} aria-hidden="true" />
          <p className={styles.ProgressText}>
            <strong>{phasesCompleted}/{phasesTotal} phases</strong> completed
          </p>
        </div>
      </div>

      <div className={styles.HeaderRight}>
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

function ColumnHeaders() {
  return (
    <div className={styles.HeaderRow} role="row">
      <div className={styles.ThCenter} role="columnheader" />
      <div className={styles.ThCenter} role="columnheader">
        <Checkbox aria-label="Select all procedures" />
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
  onDeletePending,
  isValidTooth,
  isValidSurface,
  onSelectArea,
}: {
  procedure: PlanProcedure;
  selected: boolean;
  onToggle: (id: string, checked: boolean) => void;
  pending: boolean;
  editingCell: PlanEditingCell | null;
  onStartEditCell: (rowId: string, field: 'thArea' | 'surface') => void;
  onCommitCell: (rowId: string, field: 'thArea' | 'surface', value: string) => void;
  onCancelEditCell: () => void;
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
  })();

  const surfaceCell = (() => {
    if (!needsSurface) return procedure.surface || '--';
    if (editingCell?.rowId === procedure.id && editingCell.field === 'surface') {
      return (
        <PlanInlineEditCell
          field="surface"
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
          onClick={() => onStartEditCell(procedure.id, 'surface')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onStartEditCell(procedure.id, 'surface');
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
    <div className={[styles.Row, pending ? styles.PendingRow : ''].filter(Boolean).join(' ')} role="row">
      <div className={styles.TdCenter} role="cell">
        {pending ? (
          <button
            type="button"
            className={appStyles.DeleteButton}
            onClick={() => onDeletePending(procedure.id)}
            aria-label="Remove pending row"
          >
            <CloseIcon />
          </button>
        ) : null}
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
        <Tag variant="fill" color={STATUS_COLOR[procedure.status]}>{procedure.status}</Tag>
      </div>
    </div>
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
  duration,
  onDurationChange,
  pendingProcedureIds,
  editingCell,
  onStartEditCell,
  onCommitCell,
  onCancelEditCell,
  onDeletePendingProcedure,
  isValidTooth,
  isValidSurface,
  onSelectArea,
}: {
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
  duration: DurationValue;
  onDurationChange: (value: DurationValue) => void;
  pendingProcedureIds: Set<string>;
  editingCell: PlanEditingCell | null;
  onStartEditCell: (rowId: string, field: 'thArea' | 'surface') => void;
  onCommitCell: (rowId: string, field: 'thArea' | 'surface', value: string) => void;
  onCancelEditCell: () => void;
  onDeletePendingProcedure: (id: string) => void;
  isValidTooth: (value: string) => string | null;
  isValidSurface: (value: string) => string | null;
  onSelectArea: (procedureId: string, areaId: string) => void;
}) {
  const active = expanded && phase.procedures.length > 0;

  return (
    <section className={[styles.PhaseCard, active ? styles.PhaseCardActive : ''].filter(Boolean).join(' ')}>
      <div
        className={styles.PhaseHeader}
        onClick={onSelectTarget}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelectTarget();
          }
        }}
        aria-label={`Add codes to ${phaseName}`}
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
          {expanded && isTarget && (
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

      {expanded && (
        <>
          {phase.procedures.map((procedure) => (
            <ProcedureRow
              key={procedure.id}
              procedure={procedure}
              selected={selectedIds.has(procedure.id)}
              onToggle={onToggleRow}
              pending={pendingProcedureIds.has(procedure.id)}
              editingCell={editingCell}
              onStartEditCell={onStartEditCell}
              onCommitCell={onCommitCell}
              onCancelEditCell={onCancelEditCell}
              onDeletePending={onDeletePendingProcedure}
              isValidTooth={isValidTooth}
              isValidSurface={isValidSurface}
              onSelectArea={onSelectArea}
            />
          ))}
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
  onDeletePendingProcedure,
  isValidTooth,
  isValidSurface,
  onSelectArea,
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

  const togglePhase = (phaseId: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(phaseId)) next.delete(phaseId);
      else next.add(phaseId);
      return next;
    });
  };

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

  return (
    <div className={[styles.Root, compact ? styles.Compact : ''].filter(Boolean).join(' ')}>
      <PlanHeader
        planLabel={planLabel}
        onPlanLabelChange={onPlanLabelChange}
        status={plan.status}
        linkedConditions={plan.linkedConditions}
        phasesCompleted={plan.phasesCompleted}
        phasesTotal={plan.phasesTotal}
        showInsBreakdown={showInsBreakdown}
        onShowInsBreakdownChange={setShowInsBreakdown}
      />

      <div className={styles.Body}>
        <div className={styles.TableShell}>
          <ScrollArea className={styles.Scroll}>
            <ScrollAreaViewport>
              <ScrollAreaContent>
                <div className={styles.Grid} role="table" aria-label={`${planLabel} procedures`}>
                  <ColumnHeaders />
                  {plan.phases.map((phase) => {
                    const phaseName = phaseNames[phase.id] ?? phase.name;
                    return (
                      <PhaseSection
                        key={phase.id}
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
                        duration={durations[phase.id] ?? ZERO_DURATION}
                        onDurationChange={(value) => {
                          setDurations((prev) => ({ ...prev, [phase.id]: value }));
                        }}
                        pendingProcedureIds={pendingProcedureIds}
                        editingCell={editingCell}
                        onStartEditCell={onStartEditCell}
                        onCommitCell={onCommitCell}
                        onCancelEditCell={onCancelEditCell}
                        onDeletePendingProcedure={onDeletePendingProcedure}
                        isValidTooth={isValidTooth}
                        isValidSurface={isValidSurface}
                        onSelectArea={onSelectArea}
                      />
                    );
                  })}
                </div>
              </ScrollAreaContent>
            </ScrollAreaViewport>
            <ScrollAreaScrollbar orientation="vertical">
              <ScrollAreaThumb />
            </ScrollAreaScrollbar>
            <ScrollAreaScrollbar orientation="horizontal">
              <ScrollAreaThumb />
            </ScrollAreaScrollbar>
          </ScrollArea>
        </div>

        <Button variant="ghost" leftIcon={<PlusIcon />} className={styles.NewPhase}>
          New Phase
        </Button>
      </div>

      <PlanFooter totals={plan.totals} />
    </div>
  );
}

export default TreatmentPlanView;
