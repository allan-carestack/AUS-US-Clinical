import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from './components/Button';
import Table, { type Column } from './components/Table';
import { Tag } from './components/Tag';
import { PlusIcon, MemoIcon, PreviewIcon, AngleUpIcon, AngleLeftIcon, AngleRightIcon, WarningIcon, CloseIcon } from './components/Icon';
import {
  Odontogram, SURFACE_LABEL,
  type ArmedTooth, type ToothState, type ToothMark, type ToothMeta, type SurfaceName, type Dentition,
} from './components/Odontogram';
import { CarePanel, type ChipDef, type CarePanelSelectionContext, type DentalCode, type CodeInput } from './components/CarePanel';
import { ToothSelectorPopover } from './components/ToothSelectorModal';
import { ClinicalSidebar } from './components/ClinicalSidebar';
import { GlobalHeader } from './components/GlobalHeader';
import { PatientHeader } from './components/PatientHeader';
import {
  PROCEDURE_CHIPS, CONDITION_CHIPS, PLAN_AND_EXPLOSION_CHIPS, AREA_PRESETS, AREA_PRESET_TEETH,
  type ToothRequirement,
} from './components/CarePanel/data';
import { Select, SelectTrigger, SelectContent, SelectItem } from './components/Select';
import { Tabs, TabsList, TabsTab } from './components/Tabs';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from './components/ScrollArea';
import scrollAreaStyles from './components/ScrollArea/index.module.css';
import { Menu, MenuTrigger, MenuContent, MenuItem } from './components/Menu';
import { Tooltip } from './components/Tooltip';
import { TxLogFilters } from './components/TxLogFilters';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { ComboboxInput, ComboboxItem, ComboboxEmpty, Combobox } from './components/Combobox';
import { DENTAL_CODES } from './components/CarePanel/dentalCodes';
import { TreatmentPlanView } from './components/TreatmentPlanView';
import { IcdToggle } from './components/CarePanel/IcdToggle';
import {
  cloneTreatmentPlanMock,
  firstPhaseId,
  getTreatmentPlanMock,
  seedPlansById,
  type PlanProcedure,
  type TreatmentPlanMock,
} from './components/TreatmentPlanView/mockData';
import {
  apiConfig,
  demoContext,
  listProcedureCodes,
  toDentalCode,
  listTreatmentProcedures,
  createTreatmentProcedure,
  buildCreateRequest,
  type ProcedureCode,
} from './api';
import txStyles from './styles/txHeader.module.css';
import appStyles from './styles/app.module.css';

type TxPlanTab = { id: string; label: string };
type WorkspaceTab = 'chart' | 'planner';

const PENDING_ROW_ANIMATION_MS = 240;

const INITIAL_TX_TABS: TxPlanTab[] = [
  { id: 'ungrouped', label: 'Ungrouped Tx' },
  { id: 'all-on-4', label: 'All on 4 Tx' },
  { id: 'all-on-4-alt', label: 'All on 4 Tx - ALT' },
];

// ── Code-addition workflow ──
// Two entry points into the same completion: click teeth/surfaces first
// (then pick a code/chip) or pick a code/chip first (then enter tooth/surface
// on the pending tx-log row — via keyboard or odontogram click — if that
// item needs one at all; see ChipDef.requires).
// Tooth-first supports MULTI-SELECT: each click toggles a tooth/surface in or
// out of the armed set, and the eventual code applies to every selection
// (one Tx-log row per tooth/surface).
type ToothSelection = { meta: ToothMeta; surface?: SurfaceName };

type PendingSelection = { source: 'tooth'; selections: ToothSelection[] };

// A chip/code awaiting tooth (+surface) input via the Tooth and Surface
// Selector popover — rowId is the same id space `findChartEntry` searches
// (chart rows and plan-mirrored rows alike; row.planId decides how to finalize).
type ToothSelectorRequest = { chip: ChipDef; rowId: string; anchorEl: HTMLElement };

const ALL_CHIPS: ChipDef[] = [
  ...PROCEDURE_CHIPS,
  ...CONDITION_CHIPS,
  ...PLAN_AND_EXPLOSION_CHIPS,
];

const sameSelection = (a: ToothSelection, b: ToothSelection) =>
  a.meta.id === b.meta.id && a.surface === b.surface;

function buildDescription(chip: ChipDef, toothId?: string, surface?: SurfaceName, surfaceText?: string): string {
  if (!toothId) return chip.label;
  if (surface) return `Tooth ${toothId} — ${surfaceText ?? SURFACE_LABEL[surface]} — ${chip.label}`;
  return `Tooth ${toothId} — ${chip.label}`;
}

function buildAreaDescription(chip: ChipDef, areaLabel: string): string {
  return `${areaLabel} — ${chip.label}`;
}

/** Tx-log filter bucket — conditions count as Existing (no separate Conditions pill). */
type ChartLogKind = 'condition' | 'existing' | 'proposed' | 'completed' | 'note' | 'document' | 'other';

function logKindFor(chip: ChipDef, context: CarePanelSelectionContext): ChartLogKind {
  if (chip.kind === 'condition') return 'condition';
  if (context.tab === 'existing') return 'existing';
  return context.txType === 'proposed' ? 'proposed' : 'completed';
}

function statusTagFor(chip: ChipDef, context: CarePanelSelectionContext): React.ReactNode {
  if (chip.kind === 'condition') return <Tag variant="fill" color="orange">Active condition</Tag>;
  if (context.tab === 'existing') return <Tag variant="outline" color="grey">Existing</Tag>;
  return context.txType === 'proposed'
    ? <Tag variant="fill" color="blue">Proposed</Tag>
    : <Tag variant="fill" color="green">Completed</Tag>;
}

// Odontogram marks are a generic {color, badge} shape (see ToothMark) — this
// is the one place that decides what a chip looks like when charted.
function chipMark(chip: ChipDef): ToothMark {
  const color = chip.kind === 'condition' ? 'var(--red-60)' : 'var(--blue-60)';
  const badge = chip.label.split(/[\s/]+/).map(word => word[0]).join('').slice(0, 3).toUpperCase();
  return { color, badge };
}

function chipCodeId(chip: ChipDef): string | undefined {
  if (chip.id.startsWith('code-')) return chip.id.slice(5);
  // Condition / procedure chips use a slug id — keep it for pending finalize lookup.
  return chip.id;
}

/** Resolve a ChartEntry back to a ChipDef for pending finalize / keyboard complete. */
function resolveRowChip(row: { codeId?: string; descriptionText: string; requires?: ToothRequirement }, codes: DentalCode[]): ChipDef | null {
  if (!row.codeId) return null;
  const code = codes.find(c => c.code === row.codeId) ?? DENTAL_CODES.find(c => c.code === row.codeId);
  if (code) {
    return {
      id: `code-${code.code}`,
      label: `${code.code} - ${code.description}`,
      kind: 'procedure',
      requires: code.requires,
    };
  }
  const chip = ALL_CHIPS.find(c => c.id === row.codeId);
  if (chip) return chip;
  if (row.requires) {
    return {
      id: row.codeId,
      label: row.descriptionText,
      kind: 'procedure',
      requires: row.requires,
    };
  }
  return null;
}

function chipToPlanProcedure(
  id: string,
  chip: ChipDef,
  meta?: ToothMeta,
  surface?: SurfaceName,
  pending = false,
): PlanProcedure {
  return {
    id,
    date: new Date().toLocaleDateString('en-US'),
    code: chip.label,
    codeId: chipCodeId(chip),
    requires: chip.requires,
    thArea: meta?.id ?? (pending ? '' : '--'),
    surface: surface ? SURFACE_LABEL[surface] : (pending ? '' : '--'),
    provider: 'ACHU',
    location: 'SYD',
    fee: '$0.00',
    discount: '$0.00',
    patPayable: '$0.00',
    status: 'Proposed',
  };
}

function seedTargetPhases(plans: Record<string, TreatmentPlanMock>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(plans).map(([id, plan]) => [id, firstPhaseId(plan)]),
  );
}

// ── Chart / Tx log table ──
// Description cells mix plain links, links + a preview action, and raw
// clinical-note text. The note text is deliberately plain, underlined text —
// it's a highlight treatment, not a tagged component (e.g. Tag).
const truncateCell: React.CSSProperties = { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

function DescLink({ text, withPreview = true, onClick }: { text: string; withPreview?: boolean; onClick?: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', minWidth: 0 }}>
      <Button variant="link" onClick={onClick} style={{ ...truncateCell, minWidth: 0, flex: '0 1 auto' }}>{text}</Button>
      {withPreview && (
        <Button variant="ghost" iconOnly leftIcon={<PreviewIcon />} aria-label={`Preview ${text}`} />
      )}
    </div>
  );
}

function DescNote({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-4)', minWidth: 0 }}>
      <span
        title={text}
        style={{ ...truncateCell, minWidth: 0, flex: '0 1 auto', color: 'var(--red-80)', textDecoration: 'underline', textUnderlineOffset: '2px' }}
      >
        {text}
      </span>
      <Button variant="ghost" iconOnly leftIcon={<PreviewIcon />} aria-label="Preview note" />
    </div>
  );
}

const codeLink = (text: string) => <Button variant="link">{text}</Button>;

type ChartEntry = {
  id: string;
  date: string;
  descriptionText: string;
  codeId?: string;
  /** Tooth/surface/area requirement — stored so chip slugs can finalize without a CDT lookup. */
  requires?: ToothRequirement;
  /** Bucket for TxLogFilters — conditions are included under Existing. */
  logKind?: ChartLogKind;
  thArea: string;
  surface: string;
  provider: React.ReactNode;
  location: React.ReactNode;
  txPlan: string;
  phase: string;
  fees: string;
  discount: string;
  patPayable: string;
  status: React.ReactNode;
  rowAction: React.ReactNode;
  userName: string;
  /** Source plan metadata for rows mirrored from a treatment-plan tab. */
  planId?: string;
  phaseId?: string;
};

const NOTE_TEXT = '011 | ADAS: Adarsh Ash | <Type of exam> Reviewed medical and dental history: - <Reviewed Medical History> . <Blood Pressure>  Stated chief complaint…';

function matchesTxLogFilter(row: ChartEntry, filter: string): boolean {
  if (filter === 'all') return true;
  // Conditions are Existing findings — show both under the Existing pill.
  if (filter === 'existing') return row.logKind === 'condition' || row.logKind === 'existing';
  if (filter === 'planned') return row.logKind === 'proposed';
  if (filter === 'completed') return row.logKind === 'completed';
  if (filter === 'notes' || filter === 'draft-notes') return row.logKind === 'note';
  if (filter === 'documents') return row.logKind === 'document';
  if (filter === 'today') {
    const today = new Date().toLocaleDateString('en-US');
    return row.date === today;
  }
  return true;
}

const INITIAL_CHART_ROWS: ChartEntry[] = [
  { id: '1',  date: '12/09/2025', descriptionText: '011- Comprehensive oral ex...', codeId: '011', logKind: 'proposed', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: '--', phase: '--', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="blue">Proposed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<PlusIcon />} aria-label="Add entry" />, userName: 'Mr. John Doe' },
  { id: '2',  date: '12/09/2025', descriptionText: 'Caries', codeId: 'caries', logKind: 'condition', thArea: '26', surface: 'D', provider: codeLink('ACHU'), location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="fill" color="orange">Active condition</Tag>, rowAction: '', userName: 'Mr. John Doe' },
  { id: '3',  date: '12/09/2025', descriptionText: 'Treatment Plan proposal.pdf', logKind: 'document', thArea: '', surface: '', provider: '', location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: 'Document', rowAction: '', userName: 'Mr. John Doe' },
  { id: '4',  date: '12/09/2025', descriptionText: NOTE_TEXT, logKind: 'note', thArea: '', surface: '', provider: '', location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="outline" color="grey">To start</Tag>, rowAction: '', userName: 'Mr. Adarsh Kl...' },
  { id: '5',  date: '12/09/2025', descriptionText: NOTE_TEXT, logKind: 'note', thArea: '', surface: '', provider: '', location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="outline" color="grey">To start</Tag>, rowAction: '', userName: 'Mr. Adarsh Kl...' },
  { id: '6',  date: '12/09/2025', descriptionText: '011- Comprehensive oral ex...', codeId: '011', logKind: 'proposed', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: 'All on 4 Tx...', phase: 'Phase 1', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="blue">Proposed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<MemoIcon />} aria-label="View notes" style={{ color: 'var(--interactive-80)' }} />, userName: 'Mr. John Doe' },
  { id: '7',  date: '12/09/2025', descriptionText: 'Caries', codeId: 'caries', logKind: 'condition', thArea: '26', surface: 'D', provider: codeLink('ACHU'), location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="fill" color="orange">Active condition</Tag>, rowAction: '', userName: 'Mr. John Doe' },
  { id: '8',  date: '12/09/2025', descriptionText: '012- Periodic oral evaluation', codeId: '012', logKind: 'proposed', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: '--', phase: '--', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="blue">Proposed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<PlusIcon />} aria-label="Add entry" />, userName: 'Mr. John Doe' },
  { id: '9',  date: '12/09/2025', descriptionText: '011- Comprehensive oral ex...', codeId: '011', logKind: 'proposed', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: 'All on 4 Tx...', phase: '1st appoint...', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="blue">Proposed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<PlusIcon />} aria-label="Add entry" />, userName: 'Mr. John Doe' },
  { id: '10', date: '12/09/2025', descriptionText: '586 | ADAS: Adarsh Ash | <Type of exam> Reviewed medical and dental history: - <Reviewed Medical History> . <Blood Pressure>  Stated chief complaint…', logKind: 'note', thArea: '', surface: '', provider: '', location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="outline" color="grey">To start</Tag>, rowAction: '', userName: 'Mr. Adarsh Kl...' },
  { id: '11', date: '12/09/2025', descriptionText: '586 - Crown - metallic - with tooth preparati...', codeId: '615', logKind: 'completed', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: '--', phase: '--', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="green">Completed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<MemoIcon />} aria-label="View notes" style={{ color: 'var(--interactive-80)' }} />, userName: 'Mr. John Doe' },
];

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <strong>{text.slice(idx, idx + query.length)}</strong>
      {text.slice(idx + query.length)}
    </>
  );
}

function CodeChangeCombobox({ currentCodeId, codes = DENTAL_CODES, onSelect, onClose }: {
  currentCodeId?: string;
  codes?: DentalCode[];
  onSelect: (code: DentalCode) => void;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState('');

  const sortedCodes = useMemo(() => {
    if (!currentCodeId) return codes;
    const current = codes.find(c => c.code === currentCodeId);
    if (!current) return codes;
    return [current, ...codes.filter(c => c.code !== currentCodeId)];
  }, [currentCodeId, codes]);

  const filtered = useMemo(() => {
    if (!inputValue) return sortedCodes;
    const q = inputValue.toLowerCase();
    return sortedCodes.filter(c =>
      c.code.includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [inputValue, sortedCodes]);

  const codeLabels = useMemo(
    () => sortedCodes.map(c => `${c.code} - ${c.description}`),
    [sortedCodes],
  );

  return (
    <Combobox
      open
      onOpenChange={open => { if (!open) onClose(); }}
      inputValue={inputValue}
      onInputValueChange={setInputValue}
      items={codeLabels}
      filter={null}
      onValueChange={(val) => {
        if (typeof val !== 'string') return;
        const code = codes.find(c => `${c.code} - ${c.description}` === val);
        if (code) onSelect(code);
      }}
    >
      <ComboboxInput
        placeholder="Search by code"
        aria-label="Change dental code"
        className={appStyles.CodeChangeInput}
        autoFocus
      />
      <BaseCombobox.Portal>
        <BaseCombobox.Positioner sideOffset={4} className={appStyles.CodeChangePositioner}>
          <BaseCombobox.Popup className={appStyles.CodeChangePopup}>
            <ScrollArea className={appStyles.CodeChangeScroll}>
              <ScrollAreaViewport>
                <ScrollAreaContent className={scrollAreaStyles.BoundedContent}>
                  <BaseCombobox.List className={appStyles.CodeChangeList}>
                    {filtered.map(code => {
                      const label = `${code.code} - ${code.description}`;
                      return (
                        <ComboboxItem key={code.code} value={label} current={code.code === currentCodeId}>
                          <HighlightMatch text={label} query={inputValue} />
                        </ComboboxItem>
                      );
                    })}
                    <ComboboxEmpty>No matching codes</ComboboxEmpty>
                  </BaseCombobox.List>
                </ScrollAreaContent>
              </ScrollAreaViewport>
              <ScrollAreaScrollbar>
                <ScrollAreaThumb />
              </ScrollAreaScrollbar>
            </ScrollArea>
          </BaseCombobox.Popup>
        </BaseCombobox.Positioner>
      </BaseCombobox.Portal>
    </Combobox>
  );
}

// ── Tx Plan header ──
const RIGHT_TAB_IDS = new Set(['aeka', 'other', 'bpe']);

/** Plan tab with 100px max-width; tooltip only when the label is truncated. */
function TxPlanTabsTab({ value, label }: { value: string; label: string }) {
  const labelRef = useRef<HTMLSpanElement>(null);
  const [truncated, setTruncated] = useState(false);

  const measure = useCallback(() => {
    const el = labelRef.current;
    if (!el) return;
    setTruncated(el.scrollWidth > el.clientWidth + 1);
  }, []);

  useEffect(() => {
    measure();
    const el = labelRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [measure, label]);

  return (
    <Tooltip content={label} side="top" delay={400} disabled={!truncated}>
      <TabsTab value={value} className={txStyles.PlanTab}>
        <span ref={labelRef} className={txStyles.PlanTabLabel}>{label}</span>
      </TabsTab>
    </Tooltip>
  );
}

function TxPlanHeader({
  activeTab,
  onActiveTabChange,
  headerCollapsed,
  onToggleHeaderCollapsed,
  txTabs,
  onAddTxPlan,
}: {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  headerCollapsed: boolean;
  onToggleHeaderCollapsed: () => void;
  txTabs: TxPlanTab[];
  onAddTxPlan: () => void;
}) {
  const [canScrollLeft,  setCanScrollLeft]  = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const planTabIds = useMemo(() => new Set(txTabs.map(t => t.id)), [txTabs]);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    el.dispatchEvent(new Event('scroll'));
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      ro.disconnect();
    };
  }, [updateScrollButtons, txTabs]);

  useEffect(() => {
    if (!scrollRef.current) return;
    const active = scrollRef.current.querySelector('[data-active]') as HTMLElement | null;
    active?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  const scrollTabs = (dir: 'left' | 'right') => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  // Each section gets a non-null value only when IT owns the active tab.
  // The other two get null → their indicators hide. This avoids the Base UI
  // limitation where multiple TabsLists inside one Tabs root share a single
  // tabMap and overwrite each other's tab registrations.
  const handleChange = (val: unknown) => onActiveTabChange(val as string);
  const leftValue  = activeTab === 'chart-details' ? activeTab : null;
  const midValue   = planTabIds.has(activeTab) ? activeTab : null;
  const rightValue = RIGHT_TAB_IDS.has(activeTab) ? activeTab : null;

  return (
    <div style={{ background: 'var(--grey-20)', padding: '0 var(--spacing-12) 0 0' }}>
      <div style={{ display: 'flex', alignItems: 'stretch' }}>

        {/* Chart Details — own Tabs root, fixed left */}
        <Tabs variant="tertiary" value={leftValue} onValueChange={handleChange} style={{ flexShrink: 0, width: 'auto' }}>
          <TabsList className={txStyles.ScrollList}>
            <TabsTab value="chart-details">Chart Details</TabsTab>
          </TabsList>
        </Tabs>

        {/* Tx Plans group — takes remaining space, clips overflow */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'stretch', overflow: 'hidden' }}>
          <Button variant="ghost" leftIcon={<PlusIcon />} onClick={onAddTxPlan} style={{ alignSelf: 'center', flexShrink: 0 }}>
            New Tx Plan
          </Button>

          {canScrollLeft && (
            <Button variant="ghost" iconOnly leftIcon={<AngleLeftIcon />} onClick={() => scrollTabs('left')} aria-label="Scroll tabs left" style={{ alignSelf: 'center', flexShrink: 0 }} />
          )}

          {/* Scrollable plan tabs — own Tabs root inside scroll container */}
          <Tabs variant="tertiary" value={midValue} onValueChange={handleChange} style={{ flex: 1, minWidth: 0, width: 'auto' }}>
            <ScrollArea className={txStyles.PlanScroll}>
              <ScrollAreaViewport ref={scrollRef} className={txStyles.PlanViewport}>
                <ScrollAreaContent>
                  <TabsList className={txStyles.ScrollList}>
                    {txTabs.map(tab => (
                      <TxPlanTabsTab key={tab.id} value={tab.id} label={tab.label} />
                    ))}
                  </TabsList>
                </ScrollAreaContent>
              </ScrollAreaViewport>
              <ScrollAreaScrollbar orientation="horizontal">
                <ScrollAreaThumb />
              </ScrollAreaScrollbar>
            </ScrollArea>
          </Tabs>

          {canScrollRight && (
            <Button variant="ghost" iconOnly leftIcon={<AngleRightIcon />} onClick={() => scrollTabs('right')} aria-label="Scroll tabs right" style={{ alignSelf: 'center', flexShrink: 0 }} />
          )}

          {/* Hidden tx plans — fixed right of group */}
          <Menu>
            <MenuTrigger>
              <Button variant="ghost" rightIcon={<AngleUpIcon className={txStyles.ChevronDown} />} style={{ alignSelf: 'center', flexShrink: 0 }}>
                Hidden Plan Items
              </Button>
            </MenuTrigger>
            <MenuContent side="bottom" align="start">
              <MenuItem>Implant Abutment</MenuItem>
              <MenuItem>Bridge Pontic</MenuItem>
              <MenuItem>Full Crown</MenuItem>
            </MenuContent>
          </Menu>
        </div>

        {/* AEKA, Other Imaging S/W, BPE — own Tabs root, fixed right */}
        <Tabs variant="tertiary" value={rightValue} onValueChange={handleChange} style={{ flexShrink: 0, width: 'auto' }}>
          <TabsList className={txStyles.ScrollList}>
            <TabsTab value="aeka">AEKA</TabsTab>
            <TabsTab value="other">Other Imaging S/W</TabsTab>
            <TabsTab value="bpe">BPE</TabsTab>
          </TabsList>
        </Tabs>

        <Button
          variant="ghost"
          iconOnly
          leftIcon={<AngleUpIcon className={[txStyles.Chevron, headerCollapsed ? txStyles.ChevronDown : ''].join(' ')} />}
          onClick={onToggleHeaderCollapsed}
          aria-label={headerCollapsed ? 'Expand header' : 'Collapse header'}
          aria-expanded={!headerCollapsed}
          style={{ alignSelf: 'center' }}
        />

      </div>
    </div>
  );
}

function PendingRecallsBanner() {
  const divider = <span style={{ color: 'var(--grey-20)' }} aria-hidden="true">|</span>;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--spacing-8)', whiteSpace: 'nowrap',
      padding: 'var(--spacing-6) var(--spacing-8) var(--spacing-6) var(--spacing-12)',
      background: 'var(--orange-5)', border: '1px solid var(--orange-20)', borderRadius: 'var(--radius-default)',
    }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '1.8rem', height: '1.8rem', borderRadius: '50%', flexShrink: 0,
        background: 'var(--red-80)', color: 'var(--white)', fontSize: 'var(--text-sm-size)', fontWeight: 700,
      }}>2</span>
      <span style={{ fontWeight: 500, color: 'var(--grey-80)' }}>Pending Recalls</span>
      <span style={{ color: 'var(--grey-40)' }}>:</span>
      <span style={{ color: 'var(--grey-80)' }}>D0120</span>
      {divider}
      <span style={{ color: 'var(--red-80)', fontWeight: 500 }}>Overdue</span>
      {divider}
      <Button variant="link">02/03/2025</Button>
      {divider}
      <Button variant="link">Book</Button>
      {divider}
      <Button variant="link">Add to Clipboard</Button>
      <Button
        variant="ghost"
        iconOnly
        leftIcon={<AngleUpIcon className={txStyles.ChevronDown} />}
        aria-label="More recall options"
        style={{ width: '1.8rem', height: '1.8rem' }}
      />
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: 'var(--spacing-8)', padding: 'var(--spacing-48)',
      color: 'var(--grey-40)', border: '1px dashed var(--grey-20)', borderRadius: 'var(--radius-8)',
    }}>
      <span style={{ fontSize: 'var(--text-lg-size)', fontWeight: 500, color: 'var(--grey-60)' }}>Nothing here yet</span>
      <span style={{ fontSize: 'var(--text-base-size)' }}>{label}</span>
    </div>
  );
}

function InlineEditCell({ field, value, onChange, validate, onCommit, onCancel, onEscape }: {
  field: 'thArea' | 'surface';
  /** Controlled — reads/writes the same draft value the Tooth and Surface
      Selector popover shows, so either UI stays in sync with the other. */
  value: string;
  onChange: (v: string) => void;
  validate: (v: string) => string | null;
  onCommit: (value: string) => void;
  onCancel: () => void;
  /** When set, Escape calls this instead of onCancel (e.g. discard a code change). */
  onEscape?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commit = () => {
    const trimmed = value.trim();
    if (!trimmed) { onCancel(); return; }
    const err = validate(trimmed);
    if (err) {
      setError(err);
      // Re-trigger the shake even if it was already applied (repeated bad entry):
      // drop the class, then re-add it on the next frame so the animation restarts.
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
          onChange={e => { onChange(field === 'surface' ? e.target.value.toUpperCase() : e.target.value); setError(null); }}
          onKeyDown={e => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') {
              e.preventDefault();
              e.stopPropagation();
              (onEscape ?? onCancel)();
            }
          }}
          onBlur={e => {
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

export default function App() {
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>('chart');
  const [activeTab, setActiveTab] = useState('chart-details');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [showPendingRecalls, setShowPendingRecalls] = useState(false);
  const [txTabs, setTxTabs] = useState<TxPlanTab[]>(INITIAL_TX_TABS);
  const planCounterRef = useRef(0);
  const planTabIds = useMemo(() => new Set(txTabs.map(t => t.id)), [txTabs]);
  const activePlan = useMemo(
    () => txTabs.find(t => t.id === activeTab) ?? null,
    [txTabs, activeTab],
  );
  const [plansById, setPlansById] = useState<Record<string, TreatmentPlanMock>>(() =>
    seedPlansById(INITIAL_TX_TABS.map((t) => t.id)),
  );
  const [targetPhaseByPlan, setTargetPhaseByPlan] = useState<Record<string, string>>(() =>
    seedTargetPhases(seedPlansById(INITIAL_TX_TABS.map((t) => t.id))),
  );
  const [pendingProcedureIds, setPendingProcedureIds] = useState<Set<string>>(new Set());
  const [planHistoryProcedureIds, setPlanHistoryProcedureIds] = useState<string[]>([]);
  const [chartRows, setChartRows] = useState<ChartEntry[]>(INITIAL_CHART_ROWS);
  const [toothStates, setToothStates] = useState<Record<string, ToothState>>({});
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  // Chip/code picks that require tooth (+surface) input open the Tooth and
  // Surface Selector modal instead of arming the odontogram for a click.
  const [toothSelectorRequest, setToothSelectorRequest] = useState<ToothSelectorRequest | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [pendingRowIds, setPendingRowIds] = useState<Set<string>>(new Set());
  const [deletingRowIds, setDeletingRowIds] = useState<Set<string>>(new Set());
  // Pending rows created by re-coding an existing row (vs. adding a brand-new
  // one). These get no delete (✕) affordance — there's an original row to keep.
  const [changingRowIds, setChangingRowIds] = useState<Set<string>>(new Set());
  // Pre-change row snapshots keyed by id — Esc restores these while a code
  // change is still awaiting tooth/area input.
  const codeChangeSnapshotsRef = useRef<Record<string, ChartEntry>>({});
  const [showFeeEstimates, setShowFeeEstimates] = useState(true);
  const [txLogFilter, setTxLogFilter] = useState('all');
  const planHistoryRows = useMemo(() => {
    const procedureById = new Map<string, {
      planId: string;
      planLabel: string;
      phaseId: string;
      phaseLabel: string;
      procedure: PlanProcedure;
    }>();
    Object.entries(plansById).forEach(([planId, plan]) => {
      const planLabel = txTabs.find(tab => tab.id === planId)?.label ?? planId;
      plan.phases.forEach(phase => {
        phase.procedures.forEach(procedure => {
          procedureById.set(procedure.id, {
            planId,
            planLabel,
            phaseId: phase.id,
            phaseLabel: phase.name,
            procedure,
          });
        });
      });
    });

    return planHistoryProcedureIds.flatMap(id => {
      const source = procedureById.get(id);
      if (!source) return [];
      const { planId, planLabel, phaseId, phaseLabel, procedure } = source;
      const hasTarget = !!procedure.thArea && procedure.thArea !== '--';
      const areaLabel = procedure.requires === 'area'
        ? (AREA_PRESETS.find(area => area.id === procedure.thArea)?.label ?? procedure.thArea)
        : '';
      const surfaceLabel = procedure.surface && procedure.surface !== '--'
        ? ` — ${procedure.surface}`
        : '';
      const descriptionText = !hasTarget
        ? procedure.code
        : procedure.requires === 'area'
          ? `${areaLabel} — ${procedure.code}`
          : `Tooth ${procedure.thArea}${surfaceLabel} — ${procedure.code}`;
      const completed = procedure.status === 'Completed';
      const historyRow: ChartEntry = {
        id: procedure.id,
        date: procedure.date,
        descriptionText,
        codeId: procedure.codeId,
        requires: procedure.requires,
        logKind: completed ? 'completed' : 'proposed',
        thArea: procedure.thArea,
        surface: procedure.surface,
        provider: procedure.provider ? codeLink(procedure.provider) : '',
        location: procedure.location ? codeLink(procedure.location) : '',
        txPlan: planLabel,
        phase: phaseLabel,
        fees: procedure.fee,
        discount: procedure.discount,
        patPayable: procedure.patPayable,
        status: (
          <Tag variant="fill" color={completed ? 'green' : 'blue'}>
            {procedure.status}
          </Tag>
        ),
        rowAction: '',
        userName: 'Mr. John Doe',
        planId,
        phaseId,
      };
      return [historyRow];
    });
  }, [planHistoryProcedureIds, plansById, txTabs]);
  const filteredChartRows = useMemo(() => {
    // Newly-added rows always carry an `entry-<n>` id off the same shared
    // counter, whether they came from a plan (planHistoryRows) or the plain
    // chart (chartRows) — sorting by that counter interleaves both sources
    // in true insertion order so the newest addition is always at the top,
    // regardless of which branch created it. Pre-existing/seed rows (no
    // `entry-` id) sort after all of those, keeping their given relative order.
    const insertionOrder = (row: ChartEntry): number => {
      const match = /^entry-(\d+)$/.exec(row.id);
      return match ? Number(match[1]) : -1;
    };
    return [...planHistoryRows, ...chartRows]
      .sort((a, b) => insertionOrder(b) - insertionOrder(a))
      .filter(row => matchesTxLogFilter(row, txLogFilter));
  }, [chartRows, planHistoryRows, txLogFilter]);
  const isPendingChartEntry = (row: ChartEntry) => (
    row.planId ? pendingProcedureIds.has(row.id) : pendingRowIds.has(row.id)
  );
  const findChartEntry = (rowId: string) => (
    planHistoryRows.find(row => row.id === rowId)
    ?? chartRows.find(row => row.id === rowId)
  );
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: 'thArea' | 'surface' } | null>(null);
  const [successRowIds, setSuccessRowIds] = useState<Set<string>>(new Set());
  // Active dentition, lifted from the Odontogram so tooth-input validation can
  // match the visible tab (permanent vs primary).
  const [dentition, setDentition] = useState<Dentition>('permanent');
  const entryCounterRef = useRef(0);

  const activePlanData = activePlan ? plansById[activePlan.id] : null;
  const targetPhaseId = activePlan
    ? (targetPhaseByPlan[activePlan.id] ?? (activePlanData ? firstPhaseId(activePlanData) : 'phase-1'))
    : '';

  // Ensure every plan tab has a target phase (defaults to phase 1).
  useEffect(() => {
    if (!activePlan) return;
    setTargetPhaseByPlan((prev) => {
      if (prev[activePlan.id]) return prev;
      const plan = plansById[activePlan.id];
      if (!plan) return prev;
      return { ...prev, [activePlan.id]: firstPhaseId(plan) };
    });
  }, [activePlan, plansById]);

  // ── Backend integration (carestack.clinical, mock-backed by default) ──
  // Procedure-code catalog loaded from the API; falls back to the bundled
  // DENTAL_CODES until the request resolves (or if it fails).
  const [catalog, setCatalog] = useState<ProcedureCode[] | null>(null);
  const dentalCodes = useMemo(
    () => (catalog ? catalog.map(toDentalCode) : DENTAL_CODES),
    [catalog],
  );
  // code string → backend procedureCodeId, for the write path.
  const codeIdByCode = useMemo(() => {
    const m = new Map<string, number>();
    (catalog ?? []).forEach(c => m.set(c.code, c.procedureCodeId));
    return m;
  }, [catalog]);

  useEffect(() => {
    const ac = new AbortController();
    // 1. Catalog flow — feeds the +Code search and code-change combobox.
    listProcedureCodes(ac.signal)
      .then(setCatalog)
      .catch(err => { if (!ac.signal.aborted) console.warn('[clinical] catalog load failed, using bundled codes:', err); });
    // 2. Read flow — load the demo patient's existing procedures. In mock mode
    //    we keep the curated demo table; a live backend would seed rows from this.
    listTreatmentProcedures(demoContext.patientId, ac.signal)
      .then(procs => console.info(`[clinical] loaded ${procs.length} existing procedure(s) for patient ${demoContext.patientId}${apiConfig.useMocks ? ' (mock)' : ''}`))
      .catch(err => { if (!ac.signal.aborted) console.warn('[clinical] procedure load failed:', err); });
    return () => ac.abort();
  }, []);

  // Write flow — persist a completed procedure. Fire-and-forget: the optimistic
  // UI has already updated; we log success/failure rather than block the user.
  const persistProcedure = (codeId: string | undefined, tooth: string, surface: string, status: string) => {
    if (!codeId) return;
    const procedureCodeId = codeIdByCode.get(codeId);
    if (procedureCodeId == null) return; // catalog not loaded / unknown code
    createTreatmentProcedure(buildCreateRequest({ procedureCodeId, tooth, surface, status }))
      .then(p => console.info(`[clinical] saved procedure ${p.treatmentProcedureId} (${codeId}${tooth ? ' · tooth ' + tooth : ''}${surface ? ' · ' + surface : ''})`))
      .catch(err => console.warn('[clinical] save failed:', err));
  };

  const prependPlanProcedure = (planId: string, phaseId: string, procedure: PlanProcedure) => {
    setPlansById((prev) => {
      const plan = prev[planId];
      if (!plan) return prev;
      return {
        ...prev,
        [planId]: {
          ...plan,
          phases: plan.phases.map((phase) =>
            phase.id === phaseId
              ? { ...phase, procedures: [procedure, ...phase.procedures] }
              : phase,
          ),
        },
      };
    });
  };

  const updatePlanProcedure = (planId: string, procedureId: string, patch: Partial<PlanProcedure>) => {
    setPlansById((prev) => {
      const plan = prev[planId];
      if (!plan) return prev;
      return {
        ...prev,
        [planId]: {
          ...plan,
          phases: plan.phases.map((phase) => ({
            ...phase,
            procedures: phase.procedures.map((proc) =>
              proc.id === procedureId ? { ...proc, ...patch } : proc,
            ),
          })),
        },
      };
    });
  };

  const removePlanProcedure = (planId: string, procedureId: string) => {
    setPlansById((prev) => {
      const plan = prev[planId];
      if (!plan) return prev;
      return {
        ...prev,
        [planId]: {
          ...plan,
          phases: plan.phases.map((phase) => ({
            ...phase,
            procedures: phase.procedures.filter((proc) => proc.id !== procedureId),
          })),
        },
      };
    });
  };

  const findPlanProcedure = (planId: string, procedureId: string): PlanProcedure | undefined => {
    const plan = plansById[planId];
    if (!plan) return undefined;
    for (const phase of plan.phases) {
      const found = phase.procedures.find((p) => p.id === procedureId);
      if (found) return found;
    }
    return undefined;
  };

  const findOldestPendingPlanProcedureId = (): string | undefined => {
    if (!activePlan) return undefined;
    const plan = plansById[activePlan.id];
    if (!plan) return undefined;
    const flat = plan.phases.flatMap((p) => p.procedures);
    for (let i = flat.length - 1; i >= 0; i--) {
      if (pendingProcedureIds.has(flat[i].id)) return flat[i].id;
    }
    return undefined;
  };

  const clearPendingProcedure = (procedureId: string) => {
    setPendingProcedureIds((prev) => {
      if (!prev.has(procedureId)) return prev;
      const next = new Set(prev);
      next.delete(procedureId);
      return next;
    });
    if (editingCell?.rowId === procedureId) setEditingCell(null);
  };

  const applyToothMark = (chip: ChipDef, toothId: string, surface?: SurfaceName) => {
    const mark = chipMark(chip);
    setToothStates((prev) => {
      const prevTooth = prev[toothId] ?? { surfaces: {} };
      return surface
        ? { ...prev, [toothId]: { ...prevTooth, surfaces: { ...prevTooth.surfaces, [surface]: mark } } }
        : { ...prev, [toothId]: { ...prevTooth, whole: mark } };
    });
  };

  // `surfaceText` overrides the label when several surfaces were entered (e.g. "MOD").
  // Green flash across a row that was just added or completed (cleared after the animation).
  const flashRow = (rowId: string) => {
    setSuccessRowIds(prev => new Set(prev).add(rowId));
    setTimeout(() => {
      setSuccessRowIds(prev => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }, 1200);
  };

  const applyEntry = (chip: ChipDef, context: CarePanelSelectionContext, meta?: ToothMeta, surface?: SurfaceName, surfaceText?: string) => {
    const id = `entry-${++entryCounterRef.current}`;
    const surfaceLabel = surfaceText ?? (surface ? SURFACE_LABEL[surface] : '');

    // Active tx plan tab: land in the selected phase only (not Chart Details).
    if (activePlan) {
      const phaseId = targetPhaseByPlan[activePlan.id]
        ?? (plansById[activePlan.id] ? firstPhaseId(plansById[activePlan.id]) : 'phase-1');
      const procedure = { ...chipToPlanProcedure(id, chip, meta, surface, false), ...(surface && { surface: surfaceLabel }) };
      prependPlanProcedure(activePlan.id, phaseId, procedure);
      setPlanHistoryProcedureIds(prev => [id, ...prev]);
      if (meta) applyToothMark(chip, meta.id, surface);
      persistProcedure(chipCodeId(chip), meta?.id ?? '', surfaceLabel, context.txType);
      flashRow(id);
      return;
    }

    const newRow: ChartEntry = {
      id,
      date: new Date().toLocaleDateString('en-US'),
      descriptionText: buildDescription(chip, meta?.id, surface, surfaceText),
      codeId: chipCodeId(chip),
      requires: chip.requires,
      logKind: logKindFor(chip, context),
      thArea: meta?.id ?? '',
      surface: surfaceLabel,
      provider: '',
      location: '',
      txPlan: '',
      phase: '',
      fees: '',
      discount: '',
      patPayable: '',
      status: statusTagFor(chip, context),
      rowAction: '',
      userName: 'Mr. John Doe',
    };
    setChartRows(prev => [newRow, ...prev]);
    flashRow(id);

    if (meta) applyToothMark(chip, meta.id, surface);

    persistProcedure(newRow.codeId, meta?.id ?? '', surfaceLabel, context.txType);
  };

  // Restore a row that was mid code-change (Esc before tooth/area is entered).
  const discardCodeChange = (rowId: string) => {
    const snapshot = codeChangeSnapshotsRef.current[rowId];
    if (!snapshot) {
      if (editingCell?.rowId === rowId) setEditingCell(null);
      return;
    }
    delete codeChangeSnapshotsRef.current[rowId];
    setChartRows(prev => prev.map(row => (row.id === rowId ? snapshot : row)));
    clearPendingRow(rowId);
    setEditingCell(null);
  };

  // Code-change from table description: user clicked a link, picked a new code.
  // A code that needs a tooth/surface routes through the SAME pending-row
  // mechanism as adding a new code — the row goes orange, the required column
  // gets a caution icon, and we auto-focus it for keyboard entry. This keeps
  // "change a code" and "add a code" looking, feeling, and behaving identically.
  const handleCodeChange = (rowId: string, code: DentalCode) => {
    setEditingRowId(null);
    if (code.requires === 'none') {
      setChartRows(prev => prev.map(row =>
        row.id === rowId
          ? { ...row, descriptionText: `${code.code} - ${code.description}`, codeId: code.code, requires: code.requires }
          : row
      ));
      return;
    }
    // Snapshot the pre-change row so Esc can discard before tooth/area is committed.
    const current = chartRows.find(row => row.id === rowId);
    if (current) codeChangeSnapshotsRef.current[rowId] = { ...current };
    // Reset to a pending state: new code, cleared tooth/surface awaiting input.
    setChartRows(prev => prev.map(row =>
      row.id === rowId
        ? { ...row, descriptionText: `${code.code} - ${code.description}`, codeId: code.code, requires: code.requires, thArea: '', surface: '' }
        : row
    ));
    setPendingRowIds(prev => new Set(prev).add(rowId));
    setChangingRowIds(prev => new Set(prev).add(rowId));
    // Area cells stay on the warning icon until click — don't auto-open the Select.
    if (code.requires !== 'area') {
      requestAnimationFrame(() => {
        setEditingCell({ rowId, field: 'thArea' });
        openToothSelectorForRowId(rowId);
      });
    }
  };

  // Tooth-first: toggle a tooth/surface in/out of the multi-select armed set.
  // Clicking an already-armed tooth/surface removes just that selection.
  const toggleToothSelection = (sel: ToothSelection) => {
    const current = pendingSelection?.selections ?? [];
    const next = current.some(s => sameSelection(s, sel))
      ? current.filter(s => !sameSelection(s, sel))
      : [...current, sel];
    setPendingSelection(next.length ? { source: 'tooth', selections: next } : null);
  };

  const handleSurfaceClick = (meta: ToothMeta, surface: SurfaceName) => {
    if (activePlan && pendingProcedureIds.size > 0) {
      const oldest = findOldestPendingPlanProcedureId();
      if (oldest) {
        // Area-scoped codes are driven solely by the Tooth/Area dropdown —
        // chart clicks on a pending area row are a deliberate no-op.
        if (findPlanProcedure(activePlan.id, oldest)?.requires === 'area') return;
        finalizePlanProcedure(activePlan.id, oldest, meta, surface); return;
      }
    }
    const oldestChartEntry = [...planHistoryRows, ...chartRows]
      .reverse()
      .find(isPendingChartEntry);
    if (oldestChartEntry) {
      if (oldestChartEntry.requires === 'area') return;
      finalizePendingRow(oldestChartEntry.id, meta, surface); return;
    }
    toggleToothSelection({ meta, surface });
  };

  const handleWholeToothClick = (meta: ToothMeta) => {
    if (activePlan && pendingProcedureIds.size > 0) {
      const oldest = findOldestPendingPlanProcedureId();
      if (oldest) {
        if (findPlanProcedure(activePlan.id, oldest)?.requires === 'area') return;
        finalizePlanProcedure(activePlan.id, oldest, meta); return;
      }
    }
    const oldestChartEntry = [...planHistoryRows, ...chartRows]
      .reverse()
      .find(isPendingChartEntry);
    if (oldestChartEntry) {
      if (oldestChartEntry.requires === 'area') return;
      finalizePendingRow(oldestChartEntry.id, meta); return;
    }
    toggleToothSelection({ meta });
  };

  // Chip-first: same as +Code — insert a row immediately. Tooth/surface codes
  // land as pending rows (keyboard or odontogram completes them). Tooth-first
  // multi-select still applies one completed row per armed selection.
  const handleChipSelect = (chip: ChipDef, context: CarePanelSelectionContext) => {
    if (pendingSelection?.source === 'tooth') {
      pendingSelection.selections.forEach(sel =>
        applyEntry(chip, context, sel.meta, chip.requires === 'surface' ? sel.surface : undefined)
      );
      setPendingSelection(null);
      return;
    }
    if (chip.requires === 'none') {
      applyEntry(chip, context);
      return;
    }

    const id = `entry-${++entryCounterRef.current}`;

    if (activePlan) {
      const phaseId = targetPhaseByPlan[activePlan.id]
        ?? (plansById[activePlan.id] ? firstPhaseId(plansById[activePlan.id]) : 'phase-1');
      const procedure = chipToPlanProcedure(id, chip, undefined, undefined, true);
      prependPlanProcedure(activePlan.id, phaseId, procedure);
      setPlanHistoryProcedureIds(prev => [id, ...prev]);
      setPendingProcedureIds((prev) => new Set(prev).add(id));
      // Match Chart: pending Th/Area stays on the warning until click.
      return;
    }

    const newRow: ChartEntry = {
      id,
      date: new Date().toLocaleDateString('en-US'),
      descriptionText: chip.label,
      codeId: chipCodeId(chip),
      requires: chip.requires,
      logKind: logKindFor(chip, context),
      thArea: '',
      surface: '',
      provider: '',
      location: '',
      txPlan: '',
      phase: '',
      fees: '',
      discount: '',
      patPayable: '',
      status: statusTagFor(chip, context),
      rowAction: '',
      userName: 'Mr. John Doe',
    };
    setChartRows(prev => [newRow, ...prev]);
    setPendingRowIds(prev => new Set(prev).add(id));
  };

  // Adds a row for a +Code pick whose tooth/surface/area came from the popover,
  // so it never lands in the pending state.
  const addCompletedCodeRow = (chip: ChipDef, context: CarePanelSelectionContext, input: CodeInput) => {
    const { thArea, surface: letters } = input;
    if (chip.requires === 'area') {
      const id = `entry-${++entryCounterRef.current}`;
      const areaLabel = AREA_PRESETS.find(a => a.id === thArea)?.label ?? thArea;
      if (activePlan) {
        const phaseId = targetPhaseByPlan[activePlan.id]
          ?? (plansById[activePlan.id] ? firstPhaseId(plansById[activePlan.id]) : 'phase-1');
        prependPlanProcedure(activePlan.id, phaseId, { ...chipToPlanProcedure(id, chip), thArea });
        setPlanHistoryProcedureIds(prev => [id, ...prev]);
      } else {
        setChartRows(prev => [{
          id,
          date: new Date().toLocaleDateString('en-US'),
          descriptionText: buildAreaDescription(chip, areaLabel),
          codeId: chipCodeId(chip),
          requires: chip.requires,
          logKind: logKindFor(chip, context),
          thArea,
          surface: '',
          provider: '',
          location: '',
          txPlan: '',
          phase: '',
          fees: '',
          discount: '',
          patPayable: '',
          status: statusTagFor(chip, context),
          rowAction: '',
          userName: 'Mr. John Doe',
        }, ...prev]);
      }
      applyAreaMark(chip, thArea);
      persistProcedure(chipCodeId(chip), thArea, '', context.txType);
      flashRow(id);
      return;
    }
    const surfaceName = chip.requires === 'surface' && letters
      ? SURFACE_CODE_TO_NAME[letters.charAt(0)]
      : undefined;
    applyEntry(chip, context, { id: thArea } as ToothMeta, surfaceName, surfaceName ? letters : undefined);
  };

  // Tooth/surface armed on the odontogram fills a +Code pick directly, so the
  // required-fields popover is skipped (area codes still need it). Picking a whole
  // tooth selects all of its surfaces, so a surface code is always satisfied.
  const codeUsesArmedSelection = (code: DentalCode) =>
    pendingSelection?.source === 'tooth'
    && (code.requires === 'tooth' || code.requires === 'surface');

  // +Code combobox: selecting a code adds a row immediately. If the code
  // requires tooth/surface input the row is inserted in a pending state
  // (highlighted) — the combobox stays open so the user can keep adding.
  // Tooth-first: if a tooth/surface is already armed from the odontogram,
  // it applies to the new row directly — no pending input needed.
  const handleCodeSearchSelect = (code: DentalCode, context: CarePanelSelectionContext, input?: CodeInput) => {
    const chip: ChipDef = {
      id: `code-${code.code}`,
      label: `${code.code} - ${code.description}`,
      kind: 'procedure',
      requires: code.requires,
    };
    // Required fields were collected in the +Code popover — add a finished row.
    if (input) {
      addCompletedCodeRow(chip, context, input);
      setPendingSelection(null); // the odontogram pick was consumed by the popover
      return;
    }
    if (pendingSelection?.source === 'tooth' && code.requires !== 'none') {
      // Multi-select: one row per armed tooth/surface.
      pendingSelection.selections.forEach(sel => {
        // A whole tooth carries all five surfaces.
        if (code.requires === 'surface' && !sel.surface) applyEntry(chip, context, sel.meta, SURFACE_CODE_TO_NAME.B, 'BMODL');
        else applyEntry(chip, context, sel.meta, code.requires === 'surface' ? sel.surface : undefined);
      });
      setPendingSelection(null);
      return;
    }

    const id = `entry-${++entryCounterRef.current}`;

    if (activePlan) {
      const phaseId = targetPhaseByPlan[activePlan.id]
        ?? (plansById[activePlan.id] ? firstPhaseId(plansById[activePlan.id]) : 'phase-1');
      const pending = code.requires !== 'none';
      const procedure = chipToPlanProcedure(id, chip, undefined, undefined, pending);
      prependPlanProcedure(activePlan.id, phaseId, procedure);
      setPlanHistoryProcedureIds(prev => [id, ...prev]);
      if (pending) {
        setPendingProcedureIds((prev) => new Set(prev).add(id));
        // Match Chart: pending Th/Area stays on the warning until click.
      } else {
        persistProcedure(code.code, '', '', context.txType);
      }
      return;
    }

    const newRow: ChartEntry = {
      id,
      date: new Date().toLocaleDateString('en-US'),
      descriptionText: `${code.code} - ${code.description}`,
      codeId: code.code,
      requires: code.requires,
      logKind: logKindFor(chip, context),
      thArea: '',
      surface: '',
      provider: '',
      location: '',
      txPlan: '',
      phase: '',
      fees: '',
      discount: '',
      patPayable: '',
      status: statusTagFor(chip, context),
      rowAction: '',
      userName: 'Mr. John Doe',
    };
    setChartRows(prev => [newRow, ...prev]);
    if (code.requires !== 'none') {
      setPendingRowIds(prev => new Set(prev).add(id));
    } else {
      // No tooth/surface needed — the row is complete, so persist immediately.
      persistProcedure(code.code, '', '', context.txType);
    }
  };

  // Finalize a pending row when the user clicks a tooth/surface on the odontogram.
  const finalizePendingRow = (rowId: string, meta: ToothMeta, surface?: SurfaceName) => {
    const row = findChartEntry(rowId);
    if (!row) return;
    if (row.planId) {
      finalizePlanProcedure(row.planId, rowId, meta, surface);
      return;
    }
    const chip = resolveRowChip(row, dentalCodes);
    if (!chip) return;
    const useSurface = chip.requires === 'surface' ? surface : undefined;
    const desc = buildDescription(chip, meta.id, useSurface);
    setChartRows(prev => prev.map(r =>
      r.id === rowId
        ? { ...r, descriptionText: desc, thArea: meta.id, surface: useSurface ? SURFACE_LABEL[useSurface] : '' }
        : r
    ));
    applyToothMark(chip, meta.id, useSurface);
    clearPendingRow(rowId);
    persistProcedure(chipCodeId(chip), meta.id, useSurface ? SURFACE_LABEL[useSurface] : '', 'Proposed');
  };

  const finalizePlanProcedure = (planId: string, procedureId: string, meta: ToothMeta, surface?: SurfaceName) => {
    const proc = findPlanProcedure(planId, procedureId);
    if (!proc) return;
    const requires = proc.requires ?? 'tooth';
    const chip: ChipDef = {
      id: proc.codeId ? `code-${proc.codeId}` : proc.id,
      label: proc.code,
      kind: 'procedure',
      requires,
    };
    const useSurface = requires === 'surface' ? surface : undefined;
    updatePlanProcedure(planId, procedureId, {
      thArea: meta.id,
      surface: useSurface ? SURFACE_LABEL[useSurface] : '--',
    });
    applyToothMark(chip, meta.id, useSurface);
    clearPendingProcedure(procedureId);
    persistProcedure(proc.codeId, meta.id, useSurface ? SURFACE_LABEL[useSurface] : '', 'Proposed');
  };

  // Opens the Tooth and Surface Selector popover above a pending row's
  // Th/Area or Surface cell — triggered by clicking into that cell, same as
  // the existing inline-edit entry point.
  const openToothSelectorForRow = (row: ChartEntry, anchorEl: HTMLElement) => {
    const chip = resolveRowChip(row, dentalCodes);
    if (!chip) return;
    setToothSelectorRequest({ chip, rowId: row.id, anchorEl });
  };

  // Same as openToothSelectorForRow, but looks the row and its <tr> up by id —
  // for auto-focus flows (advancing to the next pending row, a code change
  // resetting a row to pending) that don't have a click event to anchor from.
  const openToothSelectorForRowId = (rowId: string) => {
    const row = findChartEntry(rowId);
    if (!row) return;
    // Chart tab rows are <tr data-row-id>; Treatment Planner rows are <div data-row-id>.
    const anchorEl = document.querySelector<HTMLElement>(`[data-row-id="${rowId}"]`);
    if (!anchorEl) return;
    openToothSelectorForRow(row, anchorEl);
  };

  // Live-writes a tooth/surface draft value as the user interacts with the
  // Tooth and Surface Selector popover — the same row/procedure fields the
  // inline cell editors read and write, so either UI reflects the other
  // immediately. Mirrors the row.planId dispatch handleCellEditCommit uses.
  const updateDraftField = (id: string, field: 'thArea' | 'surface', value: string) => {
    const row = findChartEntry(id);
    if (row?.planId) {
      updatePlanProcedure(row.planId, id, { [field]: value } as Partial<PlanProcedure>);
    } else {
      setChartRows(prev => prev.map(r => (r.id === id ? { ...r, [field]: value } : r)));
    }
  };

  // Finalizes the row/procedure the Tooth and Surface Selector is open for —
  // the same finalize path as pressing Enter in the inline cell editors.
  // `overrides` lets a just-clicked value be used immediately, without
  // waiting for the setChartRows/updatePlanProcedure update it triggers to
  // actually land (state updates are async, so re-reading the row here could
  // still see the pre-click value).
  const handleToothSelectorApply = (overrides?: { thArea?: string; surface?: string }) => {
    if (!toothSelectorRequest) return;
    const row = findChartEntry(toothSelectorRequest.rowId);
    if (!row) return;
    const toothId = overrides?.thArea ?? (row.thArea as string) ?? '';
    const rawSurface = overrides?.surface ?? (row.surface as string) ?? '';
    const surface = rawSurface && rawSurface !== '--' ? rawSurface : '';
    if (row.planId) {
      completeEditedPlanProcedure(row.planId, toothSelectorRequest.rowId, toothId, surface);
    } else {
      completeEditedRow(toothSelectorRequest.rowId, toothId, surface);
    }
  };

  // Batch-mark every tooth in an area preset — reuses the same per-tooth
  // odontogram state `applyToothMark` already writes, just looped over the
  // preset's tooth list instead of a single tooth.
  const applyAreaMark = (chip: ChipDef, areaId: string) => {
    (AREA_PRESET_TEETH[areaId] ?? []).forEach(toothId => applyToothMark(chip, toothId));
  };

  // Area-scoped codes are driven by the Tooth/Area dropdown, not an odontogram
  // click — this is the dropdown's onValueChange target.
  const finalizeAreaSelection = (rowId: string, areaId: string) => {
    const row = findChartEntry(rowId);
    if (!row) return;
    if (row.planId) {
      finalizePlanAreaSelection(row.planId, rowId, areaId);
      return;
    }
    const chip = resolveRowChip(row, dentalCodes);
    if (!chip) return;
    const areaLabel = AREA_PRESETS.find(a => a.id === areaId)?.label ?? areaId;
    setChartRows(prev => prev.map(r =>
      r.id === rowId
        ? { ...r, descriptionText: buildAreaDescription(chip, areaLabel), thArea: areaId, surface: '' }
        : r
    ));
    applyAreaMark(chip, areaId);
    clearPendingRow(rowId);
    setEditingCell(null);
    persistProcedure(chipCodeId(chip), areaId, '', 'Proposed');
  };

  const finalizePlanAreaSelection = (planId: string, procedureId: string, areaId: string) => {
    const proc = findPlanProcedure(planId, procedureId);
    if (!proc) return;
    const chip: ChipDef = {
      id: proc.codeId ? `code-${proc.codeId}` : proc.id,
      label: proc.code,
      kind: 'procedure',
      requires: 'area',
    };
    updatePlanProcedure(planId, procedureId, { thArea: areaId, surface: '--' });
    applyAreaMark(chip, areaId);
    clearPendingProcedure(procedureId);
    setEditingCell(null);
    persistProcedure(proc.codeId, areaId, '', 'Proposed');
  };

  // Remove a row from every "pending" tracking set — used whenever a row
  // leaves the pending state (completed, finalized, discarded, or deleted).
  const clearPendingRow = (rowId: string) => {
    delete codeChangeSnapshotsRef.current[rowId];
    setPendingRowIds(prev => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    setChangingRowIds(prev => {
      if (!prev.has(rowId)) return prev;
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
  };

  // Escape: close code-change combobox → discard in-progress re-code → clear tooth-first arming.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (editingRowId) { setEditingRowId(null); return; }
      if (changingRowIds.size > 0) {
        const rowId = editingCell?.rowId && changingRowIds.has(editingCell.rowId)
          ? editingCell.rowId
          : [...changingRowIds][changingRowIds.size - 1];
        discardCodeChange(rowId);
        return;
      }
      setPendingSelection(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editingRowId, changingRowIds, editingCell]);

  const isValidTooth = (v: string): string | null => {
    const num = parseInt(v, 10);
    if (isNaN(num) || String(num) !== v) return 'Enter a valid tooth number';
    const q = Math.floor(num / 10);
    const t = num % 10;
    // FDI numbering — permanent: quadrants 1-4, positions 1-8; primary
    // (deciduous): quadrants 5-8, positions 1-5. Validate against the active
    // dentition tab so charting matches what the odontogram shows.
    if (dentition === 'primary') {
      const isPrimary = [5, 6, 7, 8].includes(q) && t >= 1 && t <= 5;
      if (!isPrimary) return 'Primary tooth must be 51-55, 61-65, 71-75, or 81-85';
    } else {
      const isPermanent = [1, 2, 3, 4].includes(q) && t >= 1 && t <= 8;
      if (!isPermanent) return 'Tooth must be 11-18, 21-28, 31-38, or 41-48';
    }
    return null;
  };

  const VALID_SURFACES = new Set(['M', 'O', 'D', 'B', 'L', 'I', 'P']);
  const isValidSurface = (v: string): string | null => {
    const upper = v.toUpperCase();
    if (!upper) return 'Enter a surface code';
    const chars = upper.split('');
    if (!chars.every(c => VALID_SURFACES.has(c))) return 'Valid surfaces: M, O, D, B, L, I, P';
    if (new Set(chars).size !== chars.length) return 'Duplicate surface letters';
    return null;
  };

  const SURFACE_CODE_TO_NAME: Record<string, SurfaceName> = {
    M: 'mesial', O: 'occlusal', D: 'distal', B: 'buccal', L: 'lingual', I: 'incisal', P: 'palatal',
  };

  const handleCellEditCommit = (rowId: string, field: 'thArea' | 'surface', value: string) => {
    const row = findChartEntry(rowId);
    if (!row) return;
    if (row.planId) {
      handlePlanCellEditCommit(row.planId, rowId, field, value);
      return;
    }
    const chip = resolveRowChip(row, dentalCodes);
    if (!chip) return;

    if (field === 'thArea') {
      const err = isValidTooth(value);
      if (err) return;
      setChartRows(prev => prev.map(r => r.id === rowId ? { ...r, thArea: value } : r));
      if (chip.requires === 'surface') {
        setEditingCell({ rowId, field: 'surface' });
        return;
      }
      completeEditedRow(rowId, value, '');
    } else {
      const err = isValidSurface(value);
      if (err) return;
      const updatedRow = findChartEntry(rowId);
      completeEditedRow(rowId, updatedRow?.thArea as string || '', value.toUpperCase());
    }
  };

  const handlePlanCellEditCommit = (planId: string, procedureId: string, field: 'thArea' | 'surface', value: string) => {
    const proc = findPlanProcedure(planId, procedureId);
    if (!proc) return;
    const requires = proc.requires ?? 'tooth';

    if (field === 'thArea') {
      const err = isValidTooth(value);
      if (err) return;
      updatePlanProcedure(planId, procedureId, { thArea: value });
      if (requires === 'surface') {
        setEditingCell({ rowId: procedureId, field: 'surface' });
        return;
      }
      completeEditedPlanProcedure(planId, procedureId, value, '');
    } else {
      const err = isValidSurface(value);
      if (err) return;
      const latest = findPlanProcedure(planId, procedureId);
      completeEditedPlanProcedure(planId, procedureId, latest?.thArea || '', value.toUpperCase());
    }
  };

  const completeEditedPlanProcedure = (planId: string, procedureId: string, thArea: string, surfaceCode: string) => {
    const proc = findPlanProcedure(planId, procedureId);
    if (!proc) return;
    const requires = proc.requires ?? 'tooth';
    const chip: ChipDef = {
      id: proc.codeId ? `code-${proc.codeId}` : proc.id,
      label: proc.code,
      kind: 'procedure',
      requires,
    };
    const surfaceName = surfaceCode ? SURFACE_CODE_TO_NAME[surfaceCode.charAt(0)] : undefined;
    const surfaceLabel = surfaceCode || '--';

    updatePlanProcedure(planId, procedureId, {
      thArea,
      surface: surfaceLabel,
    });

    if (thArea) {
      applyToothMark(chip, thArea, surfaceName);
    }

    clearPendingProcedure(procedureId);
    persistProcedure(proc.codeId, thArea, surfaceCode || '', 'Proposed');
    setToothSelectorRequest(prev => (prev && prev.rowId === procedureId ? null : prev));
    flashRow(procedureId);

    const plan = plansById[planId];
    const flat = plan?.phases.flatMap((p) => p.procedures) ?? [];
    const currentIdx = flat.findIndex((p) => p.id === procedureId);
    const nextBelow = flat.find((p, i) =>
      i > currentIdx
      && pendingProcedureIds.has(p.id)
      && p.id !== procedureId
      && p.requires !== 'area',
    );
    if (nextBelow) {
      requestAnimationFrame(() => {
        setEditingCell({ rowId: nextBelow.id, field: 'thArea' });
        openToothSelectorForRowId(nextBelow.id);
      });
    } else {
      setEditingCell(null);
    }
  };

  const completeEditedRow = (rowId: string, thArea: string, surfaceCode: string) => {
    const row = findChartEntry(rowId);
    if (!row) return;
    const chip = resolveRowChip(row, dentalCodes);
    if (!chip) return;

    const surfaceName = chip.requires === 'surface' && surfaceCode
      ? SURFACE_CODE_TO_NAME[surfaceCode.charAt(0)]
      : undefined;
    const desc = buildDescription(chip, thArea, surfaceName);
    const surfaceLabel = surfaceCode || '';

    setChartRows(prev => prev.map(r =>
      r.id === rowId ? { ...r, descriptionText: desc, thArea, surface: surfaceLabel } : r
    ));

    applyToothMark(chip, thArea, surfaceName);

    clearPendingRow(rowId);
    persistProcedure(chipCodeId(chip), thArea, surfaceLabel, 'Proposed');
    setToothSelectorRequest(prev => (prev && prev.rowId === rowId ? null : prev));

    flashRow(rowId);

    const currentIdx = chartRows.findIndex(r => r.id === rowId);
    const nextBelow = chartRows.find((r, i) =>
      i > currentIdx
      && pendingRowIds.has(r.id)
      && r.id !== rowId
      && r.requires !== 'area',
    );
    if (nextBelow) {
      requestAnimationFrame(() => {
        setEditingCell({ rowId: nextBelow.id, field: 'thArea' });
        openToothSelectorForRowId(nextBelow.id);
      });
    } else {
      setEditingCell(null);
    }
  };

  const handleDeletePendingRow = (rowId: string) => {
    if (deletingRowIds.has(rowId)) return;
    const row = findChartEntry(rowId);
    if (editingCell?.rowId === rowId) setEditingCell(null);
    setDeletingRowIds(prev => new Set(prev).add(rowId));

    const removeRow = () => {
      if (row?.planId) {
        removePlanProcedure(row.planId, rowId);
        clearPendingProcedure(rowId);
        setPlanHistoryProcedureIds(prev => prev.filter(id => id !== rowId));
      } else {
        setChartRows(prev => prev.filter(r => r.id !== rowId));
        clearPendingRow(rowId);
      }
      setDeletingRowIds(prev => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    };

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(removeRow, reduceMotion ? 0 : PENDING_ROW_ANIMATION_MS);
  };

  const handleDeletePendingProcedure = (procedureId: string) => {
    if (!activePlan) return;
    removePlanProcedure(activePlan.id, procedureId);
    clearPendingProcedure(procedureId);
    setPlanHistoryProcedureIds(prev => prev.filter(id => id !== procedureId));
  };

  const armedTeeth: ArmedTooth[] = pendingSelection
    ? pendingSelection.selections.map(s => ({ toothId: s.meta.id, surface: s.surface }))
    : [];

  const isNoteRow = (text: string) => text.includes('|') && text.includes('ADAS');
  const hasCodeId = (row: ChartEntry) => !!row.codeId;

  const chartColumns: Column<ChartEntry>[] = useMemo(() => [
    { key: 'date',        header: 'Date', sortable: true, width: 100 },
    { key: 'descriptionText', header: 'Description', minWidth: 240, render: (_v, row) => {
      if (editingRowId === row.id) {
        return (
          <CodeChangeCombobox
            currentCodeId={row.codeId}
            codes={dentalCodes}
            onSelect={code => handleCodeChange(row.id, code)}
            onClose={() => setEditingRowId(null)}
          />
        );
      }
      if (isPendingChartEntry(row)) {
        return (
          <span style={{ ...truncateCell, color: 'var(--orange-100)', fontWeight: 500 }}>
            {row.descriptionText} — select {row.requires === 'surface' ? 'a surface' : row.requires === 'area' ? 'an area' : 'a tooth'}
          </span>
        );
      }
      const text = row.descriptionText as string;
      if (isNoteRow(text)) return <DescNote text={text} />;
      if (hasCodeId(row)) {
        return <DescLink text={text} onClick={() => setEditingRowId(row.id)} />;
      }
      return <DescLink text={text} withPreview={false} />;
    }},
    { key: 'thArea',      header: 'Th/Area',         width: 100,  render: (_v, row) => {
      if (!isPendingChartEntry(row)) return (row.thArea as string) || '--';
      if (!row.requires || row.requires === 'none') return (row.thArea as string) || '--';
      if (row.requires === 'area') {
        if (editingCell?.rowId === row.id && editingCell.field === 'thArea') {
          return (
            <Select
              value={row.thArea || null}
              defaultOpen
              onOpenChange={(open, details) => {
                if (open) return;
                if (details.reason === 'escape-key' && changingRowIds.has(row.id)) {
                  discardCodeChange(row.id);
                  return;
                }
                setEditingCell(null);
              }}
              onValueChange={val => { if (typeof val === 'string') finalizeAreaSelection(row.id, val); }}
            >
              <SelectTrigger className={appStyles.AreaSelect} placeholder="Choose area" aria-label="Choose area" />
              <SelectContent positionerStyle={{ width: 200, minWidth: 200 }}>
                {AREA_PRESETS.map(preset => (
                  <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        if (row.thArea) {
          return (
            <span
              style={{ cursor: 'pointer' }}
              onClick={() => setEditingCell({ rowId: row.id, field: 'thArea' })}
            >
              {row.thArea}
            </span>
          );
        }
        return (
          <span className={appStyles.PendingCell} onClick={() => setEditingCell({ rowId: row.id, field: 'thArea' })}>
            <WarningIcon />
          </span>
        );
      }
      if (editingCell?.rowId === row.id && editingCell.field === 'thArea') {
        return (
          <InlineEditCell
            field="thArea"
            value={(row.thArea as string) || ''}
            onChange={val => updateDraftField(row.id, 'thArea', val)}
            validate={isValidTooth}
            onCommit={val => handleCellEditCommit(row.id, 'thArea', val)}
            onCancel={() => setEditingCell(null)}
            onEscape={changingRowIds.has(row.id) ? () => discardCodeChange(row.id) : undefined}
          />
        );
      }
      // Tooth already entered (e.g. waiting on surface) — show it, not the warning.
      if (row.thArea) {
        return (
          <span
            style={{ cursor: 'pointer' }}
            onClick={(e) => { setEditingCell({ rowId: row.id, field: 'thArea' }); openToothSelectorForRow(row, e.currentTarget.closest('tr') ?? e.currentTarget); }}
          >
            {row.thArea}
          </span>
        );
      }
      return (
        <span
          className={appStyles.PendingCell}
          onClick={(e) => { setEditingCell({ rowId: row.id, field: 'thArea' }); openToothSelectorForRow(row, e.currentTarget.closest('tr') ?? e.currentTarget); }}
        >
          <WarningIcon />
        </span>
      );
    }},
    { key: 'surface',     header: 'Surface',         width: 90,  render: (_v, row) => {
      if (!isPendingChartEntry(row)) return (row.surface as string) || '--';
      if (row.requires !== 'surface') return (row.surface as string) || '--';
      if (editingCell?.rowId === row.id && editingCell.field === 'surface') {
        return (
          <InlineEditCell
            field="surface"
            value={(() => { const s = row.surface as string; return s && s !== '--' ? s : ''; })()}
            onChange={val => updateDraftField(row.id, 'surface', val)}
            validate={isValidSurface}
            onCommit={val => handleCellEditCommit(row.id, 'surface', val)}
            onCancel={() => setEditingCell(null)}
            onEscape={changingRowIds.has(row.id) ? () => discardCodeChange(row.id) : undefined}
          />
        );
      }
      if (row.thArea) {
        return (
          <span
            className={appStyles.PendingCell}
            onClick={(e) => { setEditingCell({ rowId: row.id, field: 'surface' }); openToothSelectorForRow(row, e.currentTarget.closest('tr') ?? e.currentTarget); }}
          >
            <WarningIcon />
          </span>
        );
      }
      return (
        <span
          className={appStyles.PendingCell}
          onClick={(e) => openToothSelectorForRow(row, e.currentTarget.closest('tr') ?? e.currentTarget)}
        >
          <WarningIcon />
        </span>
      );
    }},
    { key: 'provider',    header: 'Provider',        width: 90,  render: v => v },
    { key: 'location',    header: 'Location',        width: 90,  render: v => v },
    { key: 'txPlan',      header: 'Tx Plan',         width: 110, render: v => v || '--' },
    { key: 'phase',       header: 'Phase',           width: 100, render: v => v || '--' },
    ...(showFeeEstimates ? [
      { key: 'fees',        header: 'Fees',            width: 90 },
      { key: 'discount',    header: 'Discount',        width: 90 },
      { key: 'patPayable',  header: 'Pat. Payable',    width: 100 },
    ] as Column<ChartEntry>[] : []),
    { key: 'status',      header: 'Status',          width: 140, render: v => v },
    { key: 'rowAction',   header: '',                width: 32,  render: v => v },
    { key: 'userName',    header: 'User Name',       width: 100, render: (v, row) => {
      // Delete (✕) is only for newly-added pending rows — re-coding an
      // existing row has an original to preserve, so no delete affordance. It
      // lives inside User Name because pending rows must not add a new column.
      const canDelete = isPendingChartEntry(row) && !changingRowIds.has(row.id);
      return (
        <div className={appStyles.UserNameCell}>
          <span className={appStyles.UserNameValue}>{v}</span>
          {canDelete && (
            <Button
              type="button"
              variant="secondary-destructive-ghost"
              iconOnly
              leftIcon={<CloseIcon />}
              onClick={() => handleDeletePendingRow(row.id)}
              aria-label="Remove pending row"
            />
          )}
        </div>
      );
    }},
  ], [editingRowId, pendingRowIds, pendingProcedureIds, deletingRowIds, changingRowIds, editingCell, successRowIds, dentalCodes, dentition, showFeeEstimates]);

  const handleWorkspaceTabChange = (value: string) => {
    if (value !== 'chart' && value !== 'planner') return;
    if (value === 'planner') setActiveTab('all-on-4');
    setWorkspaceTab(value);
  };

  const workspaceTabs = (
    <Tabs
      variant="primary"
      value={workspaceTab}
      onValueChange={handleWorkspaceTabChange}
      style={{ width: 'auto', flexShrink: 0 }}
    >
      <TabsList>
        <TabsTab value="chart">Chart</TabsTab>
        <TabsTab value="planner">Treatment Planner</TabsTab>
      </TabsList>
    </Tabs>
  );

  const renderActiveTreatmentPlanView = (compact = false) => activePlan && activePlanData ? (
    <TreatmentPlanView
      planId={activePlan.id}
      plan={activePlanData}
      planLabel={activePlan.label}
      compact={compact}
      onPlanLabelChange={(label) => {
        setTxTabs((prev) =>
          prev.map((tab) => (tab.id === activePlan.id ? { ...tab, label } : tab)),
        );
      }}
      targetPhaseId={targetPhaseId}
      onSelectTargetPhase={(phaseId) => {
        setTargetPhaseByPlan((prev) => ({ ...prev, [activePlan.id]: phaseId }));
      }}
      pendingProcedureIds={pendingProcedureIds}
      editingCell={
        editingCell && pendingProcedureIds.has(editingCell.rowId) ? editingCell : null
      }
      onStartEditCell={(rowId, field, anchorEl) => {
        setEditingCell({ rowId, field });
        if (anchorEl) {
          const row = findChartEntry(rowId);
          if (row) openToothSelectorForRow(row, anchorEl);
        }
      }}
      onCommitCell={(procedureId, field, value) =>
        handlePlanCellEditCommit(activePlan.id, procedureId, field, value)
      }
      onCancelEditCell={() => setEditingCell(null)}
      onDraftChange={(procedureId, field, value) => updateDraftField(procedureId, field, value)}
      onDeletePendingProcedure={handleDeletePendingProcedure}
      isValidTooth={isValidTooth}
      isValidSurface={isValidSurface}
      onSelectArea={(procedureId, areaId) =>
        finalizePlanAreaSelection(activePlan.id, procedureId, areaId)
      }
    />
  ) : null;

  return (
    <div className="root" style={{ fontFamily: 'inherit', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <GlobalHeader />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
      <ClinicalSidebar />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <PatientHeader
        avatarSrc="https://i.pravatar.cc/150?img=12"
        name="Mr. John Doe"
        patientId="11091"
        dob="09/12/1990"
        age="29y 1m"
        gender="Male"
        relationshipTag={{ label: 'RP', color: 'green', variant: 'fill' }}
        statusTag={{ label: 'Active', color: 'green', variant: 'semi' }}
        chartFlags={[
          { label: 'CDB', color: 'orange' },
          { label: 'DV', color: 'red' },
          { label: 'CDBS', color: 'orange' },
          { label: 'PV', color: 'orange' },
          { label: 'RO', color: 'red' },
        ]}
        linkedAccountMembers={{ count: 4, label: 'Linked Acct Members' }}
        referralSources={{ count: 2, label: 'Ref. Sources' }}
        insuranceDescription="Medibank Private Limited, Medicare Insurance"
        totalBalance="$0.00"
        unappliedCredits="$50.00"
        balanceHidden={balanceHidden}
        onToggleBalanceVisibility={() => setBalanceHidden(v => !v)}
        onNameClick={() => setShowPendingRecalls(v => !v)}
      />

      {/* One persistent shell owns the workspace tabs in both views. The primary
          column widens as the CarePanel leaves and narrows as it returns, so
          React never swaps one tab bar for another. */}
      <div
        className={[
          appStyles.WorkspaceTopBand,
          workspaceTab === 'planner' ? appStyles.isPlanner : '',
          workspaceTab === 'chart' && headerCollapsed ? appStyles.isCollapsed : '',
        ].filter(Boolean).join(' ')}
      >
        <div className={appStyles.WorkspacePrimaryColumn}>
          <div className={appStyles.WorkspaceTabBar}>
            {workspaceTabs}
            {workspaceTab === 'chart' && showPendingRecalls && (
              <div style={{ minWidth: 0, overflow: 'hidden' }}>
                <PendingRecallsBanner />
              </div>
            )}
          </div>
          {workspaceTab === 'chart' && (
            <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0 }}>
              <Odontogram
                toothStates={toothStates}
                armedTeeth={armedTeeth}
                dentition={dentition}
                onDentitionChange={setDentition}
                onSurfaceClick={handleSurfaceClick}
                onWholeToothClick={handleWholeToothClick}
              />
            </div>
          )}
        </div>
        <div
          className={appStyles.CarePanelTransition}
          aria-hidden={workspaceTab === 'planner'}
          inert={workspaceTab === 'planner'}
        >
          <CarePanel codes={dentalCodes} onChipSelect={handleChipSelect} onCodeSelect={handleCodeSearchSelect} usesArmedSelection={codeUsesArmedSelection} armedTeeth={pendingSelection?.selections.map(sel => sel.meta.id)} />
        </div>
      </div>

      <IcdToggle />

      {toothSelectorRequest && (() => {
        const draftRow = findChartEntry(toothSelectorRequest.rowId);
        const toothId = (draftRow?.thArea as string) || '';
        const rawSurface = draftRow?.surface as string;
        const surfaceLetters = rawSurface && rawSurface !== '--' ? rawSurface : '';
        return (
          <ToothSelectorPopover
            open
            onOpenChange={(next) => { if (!next) { setToothSelectorRequest(null); setEditingCell(null); } }}
            anchor={toothSelectorRequest.anchorEl}
            title={toothSelectorRequest.chip.label}
            requiresSurface={toothSelectorRequest.chip.requires === 'surface'}
            toothId={toothId}
            surfaceLetters={surfaceLetters}
            onCommit={(t, sf) => handleToothSelectorApply({ thArea: t, surface: sf })}
          />
        );
      })()}

      {workspaceTab === 'chart' ? (
      <>

      <div style={{ flexShrink: 0 }}>
        <TxPlanHeader
          activeTab={activeTab}
          onActiveTabChange={setActiveTab}
          headerCollapsed={headerCollapsed}
          onToggleHeaderCollapsed={() => setHeaderCollapsed(c => !c)}
          txTabs={txTabs}
          onAddTxPlan={() => {
            const n = ++planCounterRef.current;
            const id = `tx-plan-${n}`;
            const plan = cloneTreatmentPlanMock(getTreatmentPlanMock(id));
            setPlansById((prev) => ({ ...prev, [id]: plan }));
            setTargetPhaseByPlan((prev) => ({ ...prev, [id]: firstPhaseId(plan) }));
            setTxTabs(prev => [...prev, { id, label: `New Tx Plan ${n}` }]);
            setActiveTab(id);
          }}
        />
      </div>

      {/* Tx log filters — Chart Details only; TX plan view has its own chrome */}
      {activeTab === 'chart-details' && (
        <div style={{ flexShrink: 0 }}>
          <TxLogFilters onChange={state => {
            setTxLogFilter(state.filter);
            setShowFeeEstimates(state.showFeeEstimates);
          }} />
        </div>
      )}

      <div style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        /* Plan view is full-bleed (header under tabs + sticky footer); Chart Details keeps padding. */
        padding: activePlan ? 0 : 'var(--spacing-2) var(--spacing-12) var(--spacing-12)',
        overflow: 'hidden',
      }}>
        {activeTab === 'chart-details' ? (
          <Table
            columns={chartColumns}
            data={filteredChartRows}
            rowKey="id"
            selectable
            rowClassName={(row: ChartEntry) => {
              if (successRowIds.has(row.id)) return appStyles.SuccessRow;
              if (isPendingChartEntry(row)) {
                return [
                  appStyles.PendingRow,
                  deletingRowIds.has(row.id) ? appStyles.DeletingRow : '',
                ].filter(Boolean).join(' ');
              }
              return undefined;
            }}
          />
        ) : activePlan && activePlanData ? (
          renderActiveTreatmentPlanView()
        ) : planTabIds.has(activeTab) ? (
          <div style={{ padding: 'var(--spacing-12)', flex: 1, minHeight: 0 }}>
            <EmptyState label="Treatment plan not found." />
          </div>
        ) : (
          <div style={{ padding: 'var(--spacing-12)', flex: 1, minHeight: 0 }}>
            <EmptyState label="Switch back to Chart Details to view this patient's treatment log." />
          </div>
        )}
      </div>
      </>
      ) : (
        <div className={appStyles.PlannerWorkspace}>
          <aside className={appStyles.PlannerSidebar} aria-label="Treatment planner sidebar">
            <span>placeholder &lt;div&gt;</span>
          </aside>
          <section className={appStyles.PlannerPane} aria-label="All on 4 Tx treatment plan">
            {renderActiveTreatmentPlanView(true) ?? <EmptyState label="All on 4 Tx treatment plan not found." />}
          </section>
        </div>
      )}
      </main>
      </div>
    </div>
  );
}
