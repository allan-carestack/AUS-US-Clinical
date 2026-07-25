import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Button from './components/Button';
import Table, { type Column } from './components/Table';
import { Tag } from './components/Tag';
import { PlusIcon, MemoIcon, PreviewIcon, AngleUpIcon, AngleLeftIcon, AngleRightIcon, WarningIcon, CloseIcon } from './components/Icon';
import {
  Odontogram, SURFACE_LABEL,
  type ArmedTooth, type ToothState, type ToothMark, type ToothMeta, type SurfaceName, type Dentition,
} from './components/Odontogram';
import { CarePanel, type ChipDef, type CarePanelSelectionContext, type DentalCode } from './components/CarePanel';
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

const ALL_CHIPS: ChipDef[] = [
  ...PROCEDURE_CHIPS,
  ...CONDITION_CHIPS,
  ...PLAN_AND_EXPLOSION_CHIPS,
];

const sameSelection = (a: ToothSelection, b: ToothSelection) =>
  a.meta.id === b.meta.id && a.surface === b.surface;

function buildDescription(chip: ChipDef, toothId?: string, surface?: SurfaceName): string {
  if (!toothId) return chip.label;
  if (surface) return `Tooth ${toothId} — ${SURFACE_LABEL[surface]} — ${chip.label}`;
  return `Tooth ${toothId} — ${chip.label}`;
}

function buildAreaDescription(chip: ChipDef, areaLabel: string): string {
  return `${areaLabel} — ${chip.label}`;
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
    date: new Date().toLocaleDateString('en-GB'),
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
};

const NOTE_TEXT = '011 | ADAS: Adarsh Ash | <Type of exam> Reviewed medical and dental history: - <Reviewed Medical History> . <Blood Pressure>  Stated chief complaint…';

const INITIAL_CHART_ROWS: ChartEntry[] = [
  { id: '1',  date: '12/09/2025', descriptionText: '011- Comprehensive oral ex...', codeId: '011', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: '--', phase: '--', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="blue">Proposed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<PlusIcon />} aria-label="Add entry" />, userName: 'Mr. John Doe' },
  { id: '2',  date: '12/09/2025', descriptionText: 'Caries', codeId: 'caries', thArea: '26', surface: 'D', provider: codeLink('ACHU'), location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="fill" color="orange">Active condition</Tag>, rowAction: '', userName: 'Mr. John Doe' },
  { id: '3',  date: '12/09/2025', descriptionText: 'Treatment Plan proposal.pdf', thArea: '', surface: '', provider: '', location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: 'Document', rowAction: '', userName: 'Mr. John Doe' },
  { id: '4',  date: '12/09/2025', descriptionText: NOTE_TEXT, thArea: '', surface: '', provider: '', location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="outline" color="grey">To start</Tag>, rowAction: '', userName: 'Mr. Adarsh Kl...' },
  { id: '5',  date: '12/09/2025', descriptionText: NOTE_TEXT, thArea: '', surface: '', provider: '', location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="outline" color="grey">To start</Tag>, rowAction: '', userName: 'Mr. Adarsh Kl...' },
  { id: '6',  date: '12/09/2025', descriptionText: '011- Comprehensive oral ex...', codeId: '011', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: 'All on 4 Tx...', phase: 'Phase 1', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="blue">Proposed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<MemoIcon />} aria-label="View notes" style={{ color: 'var(--interactive-80)' }} />, userName: 'Mr. John Doe' },
  { id: '7',  date: '12/09/2025', descriptionText: 'Caries', codeId: 'caries', thArea: '26', surface: 'D', provider: codeLink('ACHU'), location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="fill" color="orange">Active condition</Tag>, rowAction: '', userName: 'Mr. John Doe' },
  { id: '8',  date: '12/09/2025', descriptionText: '012- Periodic oral evaluation', codeId: '012', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: '--', phase: '--', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="blue">Proposed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<PlusIcon />} aria-label="Add entry" />, userName: 'Mr. John Doe' },
  { id: '9',  date: '12/09/2025', descriptionText: '011- Comprehensive oral ex...', codeId: '011', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: 'All on 4 Tx...', phase: '1st appoint...', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="blue">Proposed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<PlusIcon />} aria-label="Add entry" />, userName: 'Mr. John Doe' },
  { id: '10', date: '12/09/2025', descriptionText: '586 | ADAS: Adarsh Ash | <Type of exam> Reviewed medical and dental history: - <Reviewed Medical History> . <Blood Pressure>  Stated chief complaint…', thArea: '', surface: '', provider: '', location: '', txPlan: '', phase: '', fees: '', discount: '', patPayable: '', status: <Tag variant="outline" color="grey">To start</Tag>, rowAction: '', userName: 'Mr. Adarsh Kl...' },
  { id: '11', date: '12/09/2025', descriptionText: '586 - Crown - metallic - with tooth preparati...', codeId: '615', thArea: '--', surface: '--', provider: codeLink('ACHU'), location: codeLink('MEL'), txPlan: '--', phase: '--', fees: '$40.00', discount: '$0.00', patPayable: '$40.00', status: <Tag variant="fill" color="green">Completed</Tag>, rowAction: <Button variant="ghost" iconOnly leftIcon={<MemoIcon />} aria-label="View notes" style={{ color: 'var(--interactive-80)' }} />, userName: 'Mr. John Doe' },
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

// ── Page shell placeholders ──
// These mirror sections of the real product page that aren't built yet —
// each is labeled with its intended size so it's obvious what still needs
// implementing versus what's a functioning part of this prototype.
function PlaceholderBar({ height, label }: { height: string; label: string }) {
  return (
    <div style={{
      height, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'var(--grey-40)', fontSize: 'var(--text-sm-size)',
      borderBottom: '1px solid var(--grey-20)', background: 'var(--grey-5)',
    }}>
      {label}
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
      <Button variant="ghost" iconOnly leftIcon={<AngleUpIcon className={txStyles.ChevronDown} />} aria-label="More recall options" />
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

function InlineEditCell({ field, validate, onCommit, onCancel }: {
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
          onChange={e => { setValue(e.target.value); setError(null); }}
          onKeyDown={e => {
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

export default function App() {
  const [activeTab, setActiveTab] = useState('chart-details');
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
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
  const [chartRows, setChartRows] = useState<ChartEntry[]>(INITIAL_CHART_ROWS);
  const [toothStates, setToothStates] = useState<Record<string, ToothState>>({});
  const [pendingSelection, setPendingSelection] = useState<PendingSelection | null>(null);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [pendingRowIds, setPendingRowIds] = useState<Set<string>>(new Set());
  // Pending rows created by re-coding an existing row (vs. adding a brand-new
  // one). These get no delete (✕) affordance — there's an original row to keep.
  const [changingRowIds, setChangingRowIds] = useState<Set<string>>(new Set());
  const [showFeeEstimates, setShowFeeEstimates] = useState(true);
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

  // Escape backs out of tooth-first multi-select or the code-change combobox.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingRowId) { setEditingRowId(null); return; }
        setPendingSelection(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [editingRowId]);

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

  const applyEntry = (chip: ChipDef, context: CarePanelSelectionContext, meta?: ToothMeta, surface?: SurfaceName) => {
    const id = `entry-${++entryCounterRef.current}`;

    // Active tx plan tab: land in the selected phase only (not Chart Details).
    if (activePlan) {
      const phaseId = targetPhaseByPlan[activePlan.id]
        ?? (plansById[activePlan.id] ? firstPhaseId(plansById[activePlan.id]) : 'phase-1');
      const procedure = chipToPlanProcedure(id, chip, meta, surface, false);
      prependPlanProcedure(activePlan.id, phaseId, procedure);
      if (meta) applyToothMark(chip, meta.id, surface);
      persistProcedure(chipCodeId(chip), meta?.id ?? '', surface ? SURFACE_LABEL[surface] : '', context.txType);
      return;
    }

    const newRow: ChartEntry = {
      id,
      date: new Date().toLocaleDateString('en-US'),
      descriptionText: buildDescription(chip, meta?.id, surface),
      codeId: chipCodeId(chip),
      requires: chip.requires,
      thArea: meta?.id ?? '',
      surface: surface ? SURFACE_LABEL[surface] : '',
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

    if (meta) applyToothMark(chip, meta.id, surface);

    persistProcedure(newRow.codeId, meta?.id ?? '', surface ? SURFACE_LABEL[surface] : '', context.txType);
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
    // Reset to a pending state: new code, cleared tooth/surface awaiting input.
    setChartRows(prev => prev.map(row =>
      row.id === rowId
        ? { ...row, descriptionText: `${code.code} - ${code.description}`, codeId: code.code, requires: code.requires, thArea: '', surface: '' }
        : row
    ));
    setPendingRowIds(prev => new Set(prev).add(rowId));
    setChangingRowIds(prev => new Set(prev).add(rowId));
    requestAnimationFrame(() => setEditingCell({ rowId, field: 'thArea' }));
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
        finalizePendingPlanProcedure(oldest, meta, surface); return;
      }
    }
    if (pendingRowIds.size > 0) {
      const oldest = [...chartRows].reverse().find(r => pendingRowIds.has(r.id));
      if (oldest) {
        if (oldest.requires === 'area') return;
        finalizePendingRow(oldest.id, meta, surface); return;
      }
    }
    toggleToothSelection({ meta, surface });
  };

  const handleWholeToothClick = (meta: ToothMeta) => {
    if (activePlan && pendingProcedureIds.size > 0) {
      const oldest = findOldestPendingPlanProcedureId();
      if (oldest) {
        if (findPlanProcedure(activePlan.id, oldest)?.requires === 'area') return;
        finalizePendingPlanProcedure(oldest, meta); return;
      }
    }
    if (pendingRowIds.size > 0) {
      const oldest = [...chartRows].reverse().find(r => pendingRowIds.has(r.id));
      if (oldest) {
        if (oldest.requires === 'area') return;
        finalizePendingRow(oldest.id, meta); return;
      }
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
      setPendingProcedureIds((prev) => new Set(prev).add(id));
      requestAnimationFrame(() => setEditingCell({ rowId: id, field: 'thArea' }));
      return;
    }

    const newRow: ChartEntry = {
      id,
      date: new Date().toLocaleDateString('en-US'),
      descriptionText: chip.label,
      codeId: chipCodeId(chip),
      requires: chip.requires,
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

  // +Code combobox: selecting a code adds a row immediately. If the code
  // requires tooth/surface input the row is inserted in a pending state
  // (highlighted) — the combobox stays open so the user can keep adding.
  // Tooth-first: if a tooth/surface is already armed from the odontogram,
  // it applies to the new row directly — no pending input needed.
  const handleCodeSearchSelect = (code: DentalCode, context: CarePanelSelectionContext) => {
    const chip: ChipDef = {
      id: `code-${code.code}`,
      label: `${code.code} - ${code.description}`,
      kind: 'procedure',
      requires: code.requires,
    };
    if (pendingSelection?.source === 'tooth' && code.requires !== 'none') {
      // Multi-select: one row per armed tooth/surface.
      pendingSelection.selections.forEach(sel =>
        applyEntry(chip, context, sel.meta, code.requires === 'surface' ? sel.surface : undefined)
      );
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
      if (pending) {
        setPendingProcedureIds((prev) => new Set(prev).add(id));
        requestAnimationFrame(() => setEditingCell({ rowId: id, field: 'thArea' }));
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
    const row = chartRows.find(r => r.id === rowId);
    if (!row) return;
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

  const finalizePendingPlanProcedure = (procedureId: string, meta: ToothMeta, surface?: SurfaceName) => {
    if (!activePlan) return;
    const proc = findPlanProcedure(activePlan.id, procedureId);
    if (!proc) return;
    const requires = proc.requires ?? 'tooth';
    const chip: ChipDef = {
      id: proc.codeId ? `code-${proc.codeId}` : proc.id,
      label: proc.code,
      kind: 'procedure',
      requires,
    };
    const useSurface = requires === 'surface' ? surface : undefined;
    updatePlanProcedure(activePlan.id, procedureId, {
      thArea: meta.id,
      surface: useSurface ? SURFACE_LABEL[useSurface] : '--',
    });
    applyToothMark(chip, meta.id, useSurface);
    clearPendingProcedure(procedureId);
    persistProcedure(proc.codeId, meta.id, useSurface ? SURFACE_LABEL[useSurface] : '', 'Proposed');
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
    const row = chartRows.find(r => r.id === rowId);
    if (!row) return;
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
    persistProcedure(chipCodeId(chip), areaId, '', 'Proposed');
  };

  const finalizeAreaPlanSelection = (procedureId: string, areaId: string) => {
    if (!activePlan) return;
    const proc = findPlanProcedure(activePlan.id, procedureId);
    if (!proc) return;
    const chip: ChipDef = {
      id: proc.codeId ? `code-${proc.codeId}` : proc.id,
      label: proc.code,
      kind: 'procedure',
      requires: 'area',
    };
    updatePlanProcedure(activePlan.id, procedureId, { thArea: areaId, surface: '--' });
    applyAreaMark(chip, areaId);
    clearPendingProcedure(procedureId);
    persistProcedure(proc.codeId, areaId, '', 'Proposed');
  };

  // Remove a row from every "pending" tracking set — used whenever a row
  // leaves the pending state (completed, finalized, or deleted).
  const clearPendingRow = (rowId: string) => {
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
    if (activePlan && pendingProcedureIds.has(rowId)) {
      handlePlanCellEditCommit(rowId, field, value);
      return;
    }

    const row = chartRows.find(r => r.id === rowId);
    if (!row) return;
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
      const updatedRow = chartRows.find(r => r.id === rowId);
      completeEditedRow(rowId, updatedRow?.thArea as string || '', value.toUpperCase());
    }
  };

  const handlePlanCellEditCommit = (procedureId: string, field: 'thArea' | 'surface', value: string) => {
    if (!activePlan) return;
    const proc = findPlanProcedure(activePlan.id, procedureId);
    if (!proc) return;
    const requires = proc.requires ?? 'tooth';

    if (field === 'thArea') {
      const err = isValidTooth(value);
      if (err) return;
      updatePlanProcedure(activePlan.id, procedureId, { thArea: value });
      if (requires === 'surface') {
        setEditingCell({ rowId: procedureId, field: 'surface' });
        return;
      }
      completeEditedPlanProcedure(procedureId, value, '');
    } else {
      const err = isValidSurface(value);
      if (err) return;
      const latest = findPlanProcedure(activePlan.id, procedureId);
      completeEditedPlanProcedure(procedureId, latest?.thArea || '', value.toUpperCase());
    }
  };

  const completeEditedPlanProcedure = (procedureId: string, thArea: string, surfaceCode: string) => {
    if (!activePlan) return;
    const proc = findPlanProcedure(activePlan.id, procedureId);
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

    updatePlanProcedure(activePlan.id, procedureId, {
      thArea,
      surface: surfaceLabel,
    });

    if (thArea) {
      applyToothMark(chip, thArea, surfaceName);
    }

    clearPendingProcedure(procedureId);
    persistProcedure(proc.codeId, thArea, surfaceCode || '', 'Proposed');

    const plan = plansById[activePlan.id];
    const flat = plan?.phases.flatMap((p) => p.procedures) ?? [];
    const currentIdx = flat.findIndex((p) => p.id === procedureId);
    const nextBelow = flat.find((p, i) => i > currentIdx && pendingProcedureIds.has(p.id) && p.id !== procedureId);
    if (nextBelow) {
      requestAnimationFrame(() => setEditingCell({ rowId: nextBelow.id, field: 'thArea' }));
    } else {
      setEditingCell(null);
    }
  };

  const completeEditedRow = (rowId: string, thArea: string, surfaceCode: string) => {
    const row = chartRows.find(r => r.id === rowId);
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

    setSuccessRowIds(prev => new Set(prev).add(rowId));
    setTimeout(() => {
      setSuccessRowIds(prev => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
    }, 1200);

    const currentIdx = chartRows.findIndex(r => r.id === rowId);
    const nextBelow = chartRows.find((r, i) => i > currentIdx && pendingRowIds.has(r.id) && r.id !== rowId);
    if (nextBelow) {
      requestAnimationFrame(() => setEditingCell({ rowId: nextBelow.id, field: 'thArea' }));
    } else {
      setEditingCell(null);
    }
  };

  const handleDeletePendingRow = (rowId: string) => {
    setChartRows(prev => prev.filter(r => r.id !== rowId));
    clearPendingRow(rowId);
    if (editingCell?.rowId === rowId) setEditingCell(null);
  };

  const handleDeletePendingProcedure = (procedureId: string) => {
    if (!activePlan) return;
    removePlanProcedure(activePlan.id, procedureId);
    clearPendingProcedure(procedureId);
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
      if (pendingRowIds.has(row.id)) {
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
    { key: 'thArea',      header: 'Th/Area',         width: 90,  render: (_v, row) => {
      if (!pendingRowIds.has(row.id)) return (row.thArea as string) || '--';
      if (!row.requires || row.requires === 'none') return (row.thArea as string) || '--';
      if (row.requires === 'area') {
        return (
          <Select
            value={row.thArea || null}
            onValueChange={val => { if (typeof val === 'string') finalizeAreaSelection(row.id, val); }}
          >
            <SelectTrigger placeholder="Choose area" aria-label="Choose area" />
            <SelectContent>
              {AREA_PRESETS.map(preset => (
                <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      if (editingCell?.rowId === row.id && editingCell.field === 'thArea') {
        return (
          <InlineEditCell
            field="thArea"
            validate={isValidTooth}
            onCommit={val => handleCellEditCommit(row.id, 'thArea', val)}
            onCancel={() => setEditingCell(null)}
          />
        );
      }
      // Tooth already entered (e.g. waiting on surface) — show it, not the warning.
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
    }},
    { key: 'surface',     header: 'Surface',         width: 90,  render: (_v, row) => {
      if (!pendingRowIds.has(row.id)) return (row.surface as string) || '--';
      if (row.requires !== 'surface') return (row.surface as string) || '--';
      if (editingCell?.rowId === row.id && editingCell.field === 'surface') {
        return (
          <InlineEditCell
            field="surface"
            validate={isValidSurface}
            onCommit={val => handleCellEditCommit(row.id, 'surface', val)}
            onCancel={() => setEditingCell(null)}
          />
        );
      }
      if (row.thArea) {
        return (
          <span className={appStyles.PendingCell} onClick={() => setEditingCell({ rowId: row.id, field: 'surface' })}>
            <WarningIcon />
          </span>
        );
      }
      return (
        <span className={appStyles.PendingCell}>
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
    { key: 'rowAction',   header: '',                width: 32,  render: (_v, row) => {
      // Delete (✕) is only for newly-added pending rows — re-coding an
      // existing row has an original to preserve, so no delete affordance.
      if (pendingRowIds.has(row.id) && !changingRowIds.has(row.id)) {
        return (
          <div className={appStyles.DeleteCell}>
            <button type="button" className={appStyles.DeleteButton} onClick={() => handleDeletePendingRow(row.id)} aria-label="Remove pending row">
              <CloseIcon />
            </button>
          </div>
        );
      }
      return null;
    }},
    { key: 'userName',    header: 'User Name',       width: 120 },
  ], [editingRowId, pendingRowIds, changingRowIds, editingCell, successRowIds, dentalCodes, dentition, showFeeEstimates]);

  return (
    <div className="root" style={{ fontFamily: 'inherit', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Patient details header — not built yet */}
      <PlaceholderBar height="4.4rem" label="Patient details header. 44px height" />

      {/* Top band: left column = Chart tabs + odontogram; right = Care Panel
          full-height beside both (tabs no longer span over the care panel).
          Odontogram stays 300px; row height = tabs + odontogram. Collapsible
          via the Tx Plan header chevron — stays mounted so state is preserved. */}
      <div
        style={{
          flexShrink: 0,
          display: 'grid',
          gridTemplateRows: headerCollapsed ? '0fr' : '1fr',
          opacity: headerCollapsed ? 0 : 1,
          transition: 'grid-template-rows 260ms cubic-bezier(0.23, 1, 0.32, 1), opacity 200ms cubic-bezier(0.23, 1, 0.32, 1)',
        }}
      >
        <div style={{ overflow: 'hidden', minHeight: 0 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 0,
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  flexShrink: 0,
                  gap: 'var(--spacing-8)',
                  padding: 'var(--spacing-4) var(--spacing-8)',
                  borderBottom: '1px solid var(--grey-20)',
                  minWidth: 0,
                }}
              >
                <Tabs variant="primary" defaultValue="chart" style={{ width: 'auto', flexShrink: 0 }}>
                  <TabsList>
                    <TabsTab value="chart">Chart</TabsTab>
                    <TabsTab value="planner">Treatment Planner</TabsTab>
                  </TabsList>
                </Tabs>
                <div style={{ minWidth: 0, overflow: 'hidden' }}>
                  <PendingRecallsBanner />
                </div>
              </div>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Odontogram
                  toothStates={toothStates}
                  armedTeeth={armedTeeth}
                  dentition={dentition}
                  onDentitionChange={setDentition}
                  onSurfaceClick={handleSurfaceClick}
                  onWholeToothClick={handleWholeToothClick}
                />
              </div>
            </div>
            <div style={{ width: '47.2rem', flexShrink: 0, alignSelf: 'stretch' }}>
              <CarePanel codes={dentalCodes} onChipSelect={handleChipSelect} onCodeSelect={handleCodeSearchSelect} />
            </div>
          </div>
        </div>
      </div>

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
          <TxLogFilters onChange={state => setShowFeeEstimates(state.showFeeEstimates)} />
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
            data={chartRows}
            rowKey="id"
            selectable
            rowClassName={(row: ChartEntry) => {
              if (successRowIds.has(row.id)) return appStyles.SuccessRow;
              if (pendingRowIds.has(row.id)) return appStyles.PendingRow;
              return undefined;
            }}
          />
        ) : activePlan && activePlanData ? (
          <TreatmentPlanView
            planId={activePlan.id}
            plan={activePlanData}
            planLabel={activePlan.label}
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
            onStartEditCell={(rowId, field) => setEditingCell({ rowId, field })}
            onCommitCell={handlePlanCellEditCommit}
            onCancelEditCell={() => setEditingCell(null)}
            onDeletePendingProcedure={handleDeletePendingProcedure}
            isValidTooth={isValidTooth}
            isValidSurface={isValidSurface}
            onSelectArea={finalizeAreaPlanSelection}
          />
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
    </div>
  );
}
