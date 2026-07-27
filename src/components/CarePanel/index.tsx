import { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import styles from './index.module.css';
import Button from '../Button';
import { Label } from '../Label';
import { Radio, RadioGroup } from '../Radio';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../Select';
import { Tabs, TabsList, TabsTab } from '../Tabs';
import { Combobox, ComboboxInput, ComboboxItem, ComboboxEmpty } from '../Combobox';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from '../ScrollArea';
import scrollAreaStyles from '../ScrollArea/index.module.css';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover';
import { Tag } from '../Tag';
import { PlusIcon, InfoOutlineIcon, InfoSolidIcon, EditIcon } from '../Icon';
import { DatePicker } from '../DatePicker';
import { Select as BaseSelect } from '@base-ui/react/select';
import { PROCEDURE_CHIPS, PLAN_AND_EXPLOSION_CHIPS, CONDITION_CHIPS, CARE_PANELS, CHIP_LEGEND, type ChipDef } from './data';
import { DENTAL_CODES, type DentalCode } from './dentalCodes';
import aiScribeIcon from '../../assets/ai-scribe-icon.svg';

export type { ChipDef, ChipKind, ToothRequirement } from './data';

export type TxType = 'proposed' | 'completed';
export type CarePanelTab = 'new' | 'existing';

function chipsForTab(tab: CarePanelTab): ChipDef[] {
  return [
    ...(tab === 'existing' ? CONDITION_CHIPS : []),
    ...PROCEDURE_CHIPS,
    ...(tab === 'new' ? PLAN_AND_EXPLOSION_CHIPS : []),
  ];
}

const TAB_LABELS: Record<CarePanelTab, string> = {
  new: 'New Treatment',
  existing: 'Existing',
};

const TX_TYPE_LABELS: Record<TxType, string> = {
  proposed: 'Proposed',
  completed: 'Completed',
};

/** How long the change notice stays readable before fading out. */
const CHANGE_NOTICE_MS = 800;
const CHANGE_NOTICE_EXIT_MS = 160;

export interface CarePanelSelectionContext {
  tab: CarePanelTab;
  txType: TxType;
}

export interface CarePanelProps {
  /** Chip id currently armed (chip-first flow, waiting for a tooth click). */
  armedChipId?: string;
  /** Procedure-code catalog for the +Code search. Defaults to the bundled list. */
  codes?: DentalCode[];
  onChipSelect: (chip: ChipDef, context: CarePanelSelectionContext) => void;
  onCodeSelect?: (code: DentalCode, context: CarePanelSelectionContext) => void;
}

export type { DentalCode } from './dentalCodes';

interface Appointment {
  id: string;
  /** Date of service, e.g. 12/15/2025 — shown in meta DOS (no time). */
  dos: string;
  /** Time window paired with DOS in the dropdown headline. */
  timeRange: string;
  providerId: string;
  providerName: string;
  locationId: string;
  locationName: string;
  room: string;
}

const APPOINTMENTS: Appointment[] = [
  {
    id: 'appt-1',
    dos: '12/15/2025',
    timeRange: '11:30 AM-12:45 PM',
    providerId: 'GMMG',
    providerName: 'MEHTA, GIREESH',
    locationId: 'MALL',
    locationName: 'Celebration Mallory Clinic',
    room: 'VISHNU 2',
  },
  {
    id: 'appt-2',
    dos: '09/29/2025',
    timeRange: '03:00 PM-04:00 PM',
    providerId: 'ALNABR',
    providerName: 'Abraham, Allan',
    locationId: 'MALL',
    locationName: 'Celebration Mallory Clinic',
    room: 'VISHNU 2',
  },
  {
    id: 'appt-3',
    dos: '08/18/2025',
    timeRange: '06:00 AM-07:00 AM',
    providerId: 'ABCD',
    providerName: 'B., Aryamol',
    locationId: 'MALL',
    locationName: 'Celebration Mallory Clinic',
    room: 'hamna Dentals',
  },
  {
    id: 'appt-4',
    dos: '04/20/2025',
    timeRange: '06:00 AM-06:30 AM',
    providerId: 'YOHA',
    providerName: 'Trial, Yohanan',
    locationId: 'GTHM',
    locationName: 'Gotham City',
    room: 'Batman',
  },
  {
    id: 'appt-5',
    dos: '04/20/2025',
    timeRange: '06:30 AM-07:00 AM',
    providerId: 'YOHA',
    providerName: 'Trial, Yohanan',
    locationId: 'GTHM',
    locationName: 'Gotham City',
    room: 'Batman',
  },
];

function appointmentHeadline(a: Appointment) {
  return `${a.dos} - ${a.timeRange}`;
}

function appointmentDetail(a: Appointment) {
  return `${a.providerId}: ${a.providerName} - ${a.locationId} : ${a.locationName} - ${a.room}`;
}

/** Display MM/DD/YYYY from an ISO YYYY-MM-DD value. */
function formatDosDisplay(iso: string) {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${m}/${d}/${y}`;
}

/** Parse MM/DD/YYYY (appointment DOS) into ISO YYYY-MM-DD. */
function parseDosToIso(display: string) {
  const [m, d, y] = display.split('/');
  if (!y || !m || !d) return display;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

interface MetaSelectItem {
  value: string;
  label: string;
}

function MetaCardFace({
  label,
  value,
  editable,
  required = false,
}: {
  label: string;
  value: string;
  editable: boolean;
  required?: boolean;
}) {
  return (
    <>
      <span className={styles.MetaCardLabel}>
        {label}
        {required ? (
          <span className={styles.MetaCardRequired} aria-hidden="true"> *</span>
        ) : null}
      </span>
      <span className={styles.MetaCardValueRow}>
        <span className={styles.MetaCardValue}>{value}</span>
        {editable ? (
          <EditIcon className={styles.MetaCardIcon} aria-hidden="true" />
        ) : null}
      </span>
    </>
  );
}

function MetaSelectCard({
  label,
  value,
  items,
  onValueChange,
  className,
  readOnly = false,
  required = false,
  'aria-label': ariaLabel,
}: {
  label: string;
  value: string;
  items: MetaSelectItem[];
  onValueChange: (value: string) => void;
  className?: string;
  readOnly?: boolean;
  required?: boolean;
  'aria-label': string;
}) {
  const display = items.find(i => i.value === value)?.label ?? value;

  if (readOnly) {
    return (
      <div className={[styles.MetaItem, className].filter(Boolean).join(' ')}>
        <div className={[styles.MetaCard, styles.MetaCardReadonly].join(' ')}>
          <MetaCardFace label={label} value={display} editable={false} required={required} />
        </div>
      </div>
    );
  }

  return (
    <div className={[styles.MetaItem, className].filter(Boolean).join(' ')}>
      <Select
        items={items}
        value={value}
        onValueChange={v => onValueChange(v as string)}
      >
        <BaseSelect.Trigger
          className={styles.MetaCard}
          aria-label={ariaLabel}
          aria-required={required || undefined}
        >
          <MetaCardFace label={label} value={display} editable required={required} />
        </BaseSelect.Trigger>
        <SelectContent align="start">
          {items.map(item => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function MetaDateCard({
  label,
  value,
  onChange,
  className,
  readOnly = false,
  required = false,
  'aria-label': ariaLabel,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  className?: string;
  readOnly?: boolean;
  required?: boolean;
  'aria-label': string;
}) {
  const display = formatDosDisplay(value);

  if (readOnly) {
    return (
      <div className={[styles.MetaItem, className].filter(Boolean).join(' ')}>
        <div className={[styles.MetaCard, styles.MetaCardReadonly].join(' ')}>
          <MetaCardFace label={label} value={display} editable={false} required={required} />
        </div>
      </div>
    );
  }

  return (
    <div className={[styles.MetaItem, className].filter(Boolean).join(' ')}>
      <DatePicker value={value} onValueChange={onChange}>
        <button
          type="button"
          className={styles.MetaCard}
          aria-label={ariaLabel}
          aria-required={required || undefined}
        >
          <MetaCardFace label={label} value={display} editable required={required} />
        </button>
      </DatePicker>
    </div>
  );
}

const TREATING_DENTISTS = [
  { id: 'dr-john', label: 'Dr. John' },
  { id: 'dr-smith', label: 'Dr. Smith' },
];

const LOCATIONS = [
  { id: 'CBO', label: 'CBO' },
  { id: 'MALL', label: 'MALL' },
  { id: 'GTHM', label: 'GTHM' },
];

const PROVIDERS = [
  { id: 'dr-john', label: 'Dr. John' },
  { id: 'dr-smith', label: 'Dr. Smith' },
  { id: 'ALNABR', label: 'ALNABR' },
  { id: 'GMMG', label: 'GMMG' },
  { id: 'ABCD', label: 'ABCD' },
  { id: 'YOHA', label: 'YOHA' },
];

const chipClass: Record<ChipDef['kind'], string> = {
  procedure: styles.chipProcedure,
  condition: styles.chipCondition,
  'treatment-plan': styles.chipTreatmentPlan,
  explosion: styles.chipExplosion,
};

function Chip({
  chip,
  armed,
  onSelect,
  statusPulse,
  pulseIndex = 0,
}: {
  chip: ChipDef;
  armed: boolean;
  onSelect: (chip: ChipDef) => void;
  statusPulse?: boolean;
  pulseIndex?: number;
}) {
  // Treatment plans and explosion codes are visually part of the palette
  // but not wired up to any behavior yet — see chip-selection follow-up.
  const disabled = chip.kind === 'treatment-plan' || chip.kind === 'explosion';
  return (
    <button
      type="button"
      className={[
        styles.Chip,
        chipClass[chip.kind],
        armed ? styles.chipArmed : '',
        statusPulse ? styles.chipStatusPulse : '',
      ].join(' ')}
      style={statusPulse ? { animationDelay: `${pulseIndex * 20}ms` } : undefined}
      disabled={disabled}
      aria-pressed={armed}
      onClick={() => onSelect(chip)}
    >
      <span className={styles.ChipLabel}>{chip.label}</span>
    </button>
  );
}

function Legend() {
  return (
    <div className={styles.Legend}>
      {CHIP_LEGEND.map(item => (
        <div key={item.kind} className={styles.LegendRow}>
          <span className={styles.LegendSwatch} style={{ background: `var(--${legendColor(item.kind)}-10)`, borderColor: `var(--${legendColor(item.kind)}-20)` }} />
          <div className={styles.LegendText}>
            <span className={styles.LegendLabel}>{item.label}</span>
            <span className={styles.LegendDescription}>{item.description}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function legendColor(kind: ChipDef['kind']) {
  return { procedure: 'green', condition: 'orange', 'treatment-plan': 'olive', explosion: 'red' }[kind];
}

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

const CODE_MORPH_MS = 220;

function CodeSearch({
  codes = DENTAL_CODES,
  active,
  onSelect,
  onClose,
}: {
  codes?: DentalCode[];
  /** When false, close the results popup immediately (reverse morph). */
  active: boolean;
  onSelect: (code: DentalCode) => void;
  onClose: () => void;
}) {
  const [inputValue, setInputValue] = useState('');
  // Start closed so Base UI can apply data-starting-style; open after the
  // button→field morph begins so the list feels anchored to the growing field.
  const [popupOpen, setPopupOpen] = useState(false);
  const skipInputUpdateRef = useRef(false);
  const processingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!active) {
      setPopupOpen(false);
      return;
    }
    const t = window.setTimeout(() => setPopupOpen(true), 60);
    return () => window.clearTimeout(t);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (wrapperRef.current?.contains(target)) return;
      if (target.closest('[role="listbox"]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [active, onClose]);

  const filtered = useMemo(() => {
    if (!inputValue) return codes;
    const q = inputValue.toLowerCase();
    return codes.filter(c =>
      c.code.includes(q) || c.description.toLowerCase().includes(q)
    );
  }, [inputValue, codes]);

  const codeLabels = useMemo(
    () => codes.map(c => `${c.code} - ${c.description}`),
    [codes],
  );

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <div ref={wrapperRef} className={styles.CodeSearchRoot}>
      <Combobox
        open={popupOpen}
        onOpenChange={() => {}}
        inputValue={inputValue}
        onInputValueChange={val => {
          if (skipInputUpdateRef.current) {
            skipInputUpdateRef.current = false;
            return;
          }
          setInputValue(val);
        }}
        items={codeLabels}
        filter={null}
        value={null}
        onValueChange={(val) => {
          if (typeof val !== 'string' || processingRef.current) return;
          processingRef.current = true;
          queueMicrotask(() => { processingRef.current = false; });
          const code = codes.find(c => `${c.code} - ${c.description}` === val);
          if (code) {
            skipInputUpdateRef.current = true;
            setInputValue('');
            onSelect(code);
          }
        }}
      >
        <ComboboxInput
          placeholder="Search by code, explosion code or treatment plan template"
          aria-label="Search dental codes"
          className={styles.CodeSearchInput}
          autoFocus={active}
          onKeyDown={handleInputKeyDown}
        />
        <BaseCombobox.Portal>
          <BaseCombobox.Positioner sideOffset={4} className={styles.CodeSearchPositioner}>
            <BaseCombobox.Popup className={styles.CodeSearchPopup}>
              <ScrollArea className={styles.CodeSearchScroll}>
                <ScrollAreaViewport>
                  <ScrollAreaContent className={scrollAreaStyles.BoundedContent}>
                    <BaseCombobox.List className={styles.CodeSearchList}>
                      {filtered.map(code => {
                        const label = `${code.code} - ${code.description}`;
                        return (
                          <ComboboxItem key={code.code} value={label}>
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
    </div>
  );
}

export function CarePanel({ armedChipId, codes, onChipSelect, onCodeSelect }: CarePanelProps) {
  const [tab, setTab] = useState<CarePanelTab>('new');
  /** Enter direction for ChipGridArea on tab change — null skips (initial mount). */
  const [gridSlide, setGridSlide] = useState<'fromLeft' | 'fromRight' | null>(null);
  /** Snapshot of the previous grid while it blurs/slides out. */
  const [outgoingGrid, setOutgoingGrid] = useState<{
    chips: ChipDef[];
    exitTo: 'left' | 'right';
  } | null>(null);
  /** Centered confirmation over the chip grid after tab or Tx Type change. */
  const [changeNotice, setChangeNotice] = useState<{
    message: string;
    phase: 'in' | 'out';
  } | null>(null);
  const [txType, setTxType] = useState<TxType>('proposed');
  const [carePanelId, setCarePanelId] = useState(CARE_PANELS[0].id);
  const [appointmentId, setAppointmentId] = useState<string | null>(APPOINTMENTS[0].id);
  const [manualDos, setManualDos] = useState(() => parseDosToIso(APPOINTMENTS[0].dos));
  const [locationId, setLocationId] = useState(APPOINTMENTS[0].locationId);
  const [providerId, setProviderId] = useState(APPOINTMENTS[0].providerId);
  const [treatingDentistId, setTreatingDentistId] = useState(TREATING_DENTISTS[0].id);
  const [codeSearchMode, setCodeSearchMode] = useState<'closed' | 'open' | 'closing'>('closed');
  const [statusRipple, setStatusRipple] = useState(false);
  const statusRippleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeMorphTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeHoldTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noticeExitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showChangeNotice = (message: string) => {
    if (noticeHoldTimeoutRef.current) clearTimeout(noticeHoldTimeoutRef.current);
    if (noticeExitTimeoutRef.current) clearTimeout(noticeExitTimeoutRef.current);
    setChangeNotice({ message, phase: 'in' });
    noticeHoldTimeoutRef.current = setTimeout(() => {
      setChangeNotice(prev => (prev ? { ...prev, phase: 'out' } : null));
      noticeExitTimeoutRef.current = setTimeout(() => {
        setChangeNotice(null);
        noticeExitTimeoutRef.current = null;
      }, CHANGE_NOTICE_EXIT_MS);
      noticeHoldTimeoutRef.current = null;
    }, CHANGE_NOTICE_MS);
  };

  const handleTabChange = (value: string) => {
    const next = value as CarePanelTab;
    if (next === tab) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      // Existing enters from left (outgoing exits right); New Treatment opposite.
      setOutgoingGrid({
        chips: chipsForTab(tab),
        exitTo: next === 'existing' ? 'right' : 'left',
      });
      setGridSlide(next === 'existing' ? 'fromLeft' : 'fromRight');
    }
    setTab(next);
    showChangeNotice(`Switched to ${TAB_LABELS[next]} carepanel`);
  };

  const applyAppointmentDefaults = (appt: Appointment | null) => {
    if (!appt) return;
    setManualDos(parseDosToIso(appt.dos));
    setLocationId(appt.locationId);
    setProviderId(appt.providerId);
  };

  const codeSearchMorphOpen = codeSearchMode === 'open';
  const codeSearchMounted = codeSearchMode !== 'closed';

  const openCodeSearch = () => {
    if (codeMorphTimeoutRef.current) clearTimeout(codeMorphTimeoutRef.current);
    setCodeSearchMode('open');
  };

  const closeCodeSearch = () => {
    if (codeSearchMode !== 'open') return;
    setCodeSearchMode('closing');
    if (codeMorphTimeoutRef.current) clearTimeout(codeMorphTimeoutRef.current);
    codeMorphTimeoutRef.current = setTimeout(() => {
      setCodeSearchMode('closed');
      codeMorphTimeoutRef.current = null;
    }, CODE_MORPH_MS);
  };

  useEffect(() => () => {
    if (codeMorphTimeoutRef.current) clearTimeout(codeMorphTimeoutRef.current);
    if (noticeHoldTimeoutRef.current) clearTimeout(noticeHoldTimeoutRef.current);
    if (noticeExitTimeoutRef.current) clearTimeout(noticeExitTimeoutRef.current);
  }, []);

  const selectedAppointment = appointmentId
    ? APPOINTMENTS.find(a => a.id === appointmentId) ?? null
    : null;

  const handleTxTypeChange = (value: unknown) => {
    const next = value as TxType;
    if (next === txType) return;
    setTxType(next);
    showChangeNotice(`Switched to ${TX_TYPE_LABELS[next]} status`);
    // Restart the staggered hover-pulse so rapid toggles always replay.
    if (statusRippleTimeoutRef.current) clearTimeout(statusRippleTimeoutRef.current);
    setStatusRipple(false);
    requestAnimationFrame(() => {
      setStatusRipple(true);
      const chipCount =
        (tab === 'existing' ? CONDITION_CHIPS.length : 0)
        + PROCEDURE_CHIPS.length
        + (tab === 'new' ? PLAN_AND_EXPLOSION_CHIPS.length : 0);
      statusRippleTimeoutRef.current = setTimeout(() => setStatusRipple(false), 200 + chipCount * 20);
    });
  };

  const gridChips = chipsForTab(tab);

  const handleSelect = (chip: ChipDef) => onChipSelect(chip, { tab, txType });

  const handleCodeSelect = (code: DentalCode) => {
    const chip: ChipDef = {
      id: `code-${code.code}`,
      label: `${code.code} - ${code.description}`,
      kind: 'procedure',
      requires: code.requires,
    };
    if (onCodeSelect) {
      onCodeSelect(code, { tab, txType });
    } else {
      onChipSelect(chip, { tab, txType });
    }
  };

  const locationItems = LOCATIONS.map(l => ({ value: l.id, label: l.label }));
  const providerItems = PROVIDERS.map(p => ({ value: p.id, label: p.label }));
  const dentistItems = TREATING_DENTISTS.map(d => ({ value: d.id, label: d.label }));

  return (
    <div className={styles.CarePanel}>
      <div className={styles.Chrome}>
        <div className={styles.ContextSection}>
          <div className={styles.ContextSectionInner}>
            <div className={styles.AppointmentRow}>
              <div className={styles.AppointmentSelect}>
                <Select
                  items={APPOINTMENTS.map(a => ({ value: a.id, label: appointmentHeadline(a) }))}
                  value={appointmentId}
                  onValueChange={v => {
                    const nextId = (v as string | null) ?? null;
                    setAppointmentId(nextId);
                    applyAppointmentDefaults(
                      nextId ? APPOINTMENTS.find(a => a.id === nextId) ?? null : null,
                    );
                  }}
                >
                  <SelectTrigger
                    placeholder="Select appointment"
                    aria-label="Appointment"
                    hasValue={!!appointmentId}
                    onClear={() => setAppointmentId(null)}
                  />
                  <SelectContent
                    align="start"
                    positionerClassName={styles.AppointmentSelectPositioner}
                    positionerStyle={{ width: 472, minWidth: 472, maxWidth: 472 }}
                  >
                    {APPOINTMENTS.map(a => (
                      <SelectItem key={a.id} value={a.id} subtext={appointmentDetail(a)}>
                        {appointmentHeadline(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div
                className={[
                  styles.AppointmentActions,
                  selectedAppointment ? styles.AppointmentActionsOpen : '',
                ].join(' ')}
                aria-hidden={!selectedAppointment}
              >
                <div className={styles.AppointmentActionsInner}>
                  <Tag variant="fill" color="green">Scheduled</Tag>
                  <Button variant="link">View Details</Button>
                </div>
              </div>
            </div>

            <div className={styles.MetaRow}>
              <MetaDateCard
                label="DOS"
                value={manualDos}
                onChange={setManualDos}
                className={styles.MetaDos}
                required={!selectedAppointment}
                readOnly={!!selectedAppointment}
                aria-label="Date of service"
              />
              <MetaSelectCard
                label="Location"
                value={locationId}
                items={locationItems}
                onValueChange={setLocationId}
                className={styles.MetaLocation}
                required={!selectedAppointment}
                readOnly={!!selectedAppointment}
                aria-label="Location"
              />
              <MetaSelectCard
                label="Provider"
                value={providerId}
                items={providerItems}
                onValueChange={setProviderId}
                className={styles.MetaFill}
                required={!selectedAppointment}
                readOnly={!!selectedAppointment}
                aria-label="Provider"
              />
              <MetaSelectCard
                label="Treating Dentist"
                value={treatingDentistId}
                items={dentistItems}
                onValueChange={setTreatingDentistId}
                className={styles.MetaFill}
                aria-label="Treating dentist"
              />
            </div>
          </div>
        </div>

        <div className={styles.TabRow}>
          <Tabs
            variant="tertiary"
            value={tab}
            onValueChange={handleTabChange}
            className={styles.TabRoot}
          >
            <TabsList className={styles.TabList}>
              <TabsTab value="new">New Treatment</TabsTab>
              <TabsTab value="existing">Existing</TabsTab>
            </TabsList>
          </Tabs>
          <div className={styles.TabActions}>
            <Button variant="secondary" leftIcon={<PlusIcon />}>
              Note
            </Button>
            <button type="button" className={styles.AiScribe} aria-label="AI Scribe">
              <img
                src={aiScribeIcon}
                alt=""
                width={16}
                height={16}
                className={styles.AiScribeIcon}
                draggable={false}
              />
              <span className={styles.AiScribeLabel}>AI Scribe</span>
            </button>
          </div>
        </div>

        <div className={styles.Controls}>
          {tab === 'new' ? (
            <div className={styles.TxTypeRow}>
              <Label size="xs">Tx Type</Label>
              <RadioGroup value={txType} onValueChange={handleTxTypeChange} style={{ flexDirection: 'row', gap: 'var(--spacing-24)' }}>
                <Radio value="proposed">Proposed</Radio>
                <Radio value="completed">Completed</Radio>
              </RadioGroup>
            </div>
          ) : (
            <div className={styles.InfoBanner}>
              <InfoSolidIcon aria-hidden="true" />
              Add conditions or pre-existing treatments
            </div>
          )}

          <div
            className={[
              styles.SelectRow,
              codeSearchMorphOpen ? styles.SelectRowCodeSearch : '',
            ].join(' ')}
          >
            <div
              className={styles.CarePanelCollapse}
              aria-hidden={codeSearchMorphOpen}
            >
              <div className={styles.PaneClip}>
                <div className={styles.CarePanelPicker}>
                  <Label size="xs">Care Panel</Label>
                  <div className={styles.SelectWrapper}>
                    <Select
                      items={CARE_PANELS.map(panel => ({ value: panel.id, label: panel.label }))}
                      value={carePanelId}
                      onValueChange={v => setCarePanelId(v as string)}
                    >
                      <SelectTrigger placeholder="Select care panel" aria-label="Care panel" />
                      <SelectContent>
                        {CARE_PANELS.map(panel => (
                          <SelectItem key={panel.id} value={panel.id}>{panel.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Popover>
                    <PopoverTrigger openOnHover>
                      <Button
                        variant="ghost"
                        iconOnly
                        leftIcon={<InfoOutlineIcon />}
                        aria-label="What do the care panel colors mean?"
                        tabIndex={codeSearchMorphOpen ? -1 : 0}
                      />
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start">
                      <Legend />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            <div className={styles.ActionsRow}>
              <div
                className={[
                  styles.CodeMorph,
                  codeSearchMorphOpen ? styles.CodeMorphOpen : '',
                ].join(' ')}
              >
                <div className={styles.CodeMorphCollapsed} aria-hidden={codeSearchMorphOpen}>
                  <div className={styles.PaneClip}>
                    <Button
                      variant="secondary"
                      leftIcon={<PlusIcon />}
                      tabIndex={codeSearchMorphOpen ? -1 : 0}
                      onClick={openCodeSearch}
                    >
                      Code
                    </Button>
                  </div>
                </div>
                <div
                  className={styles.CodeMorphExpanded}
                  aria-hidden={!codeSearchMounted}
                  inert={!codeSearchMorphOpen || undefined}
                >
                  <div className={styles.PaneClip}>
                    {codeSearchMounted ? (
                      <CodeSearch
                        codes={codes}
                        active={codeSearchMorphOpen}
                        onSelect={handleCodeSelect}
                        onClose={closeCodeSearch}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.ChipGridStage}>
        {outgoingGrid ? (
          <div
            className={[
              styles.ChipGridArea,
              styles.ChipGridOutgoing,
              outgoingGrid.exitTo === 'left'
                ? styles.ChipGridExitToLeft
                : styles.ChipGridExitToRight,
            ].join(' ')}
            aria-hidden="true"
            onAnimationEnd={e => {
              if (e.target !== e.currentTarget) return;
              setOutgoingGrid(null);
            }}
          >
            <div className={styles.ChipGrid}>
              {outgoingGrid.chips.map(chip => (
                <Chip
                  key={chip.id}
                  chip={chip}
                  armed={false}
                  onSelect={() => {}}
                />
              ))}
            </div>
          </div>
        ) : null}

        <div
          key={tab}
          className={[
            styles.ChipGridArea,
            styles.ChipGridIncoming,
            gridSlide === 'fromLeft' ? styles.ChipGridSlideFromLeft : '',
            gridSlide === 'fromRight' ? styles.ChipGridSlideFromRight : '',
          ].join(' ')}
          onAnimationEnd={e => {
            // Chip status-pulse keyframes also bubble — only clear on our slide.
            if (e.target !== e.currentTarget) return;
            setGridSlide(null);
          }}
        >
          <div className={styles.ChipGrid}>
            {gridChips.map((chip, index) => (
              <Chip
                key={chip.id}
                chip={chip}
                armed={chip.id === armedChipId}
                onSelect={handleSelect}
                statusPulse={statusRipple}
                pulseIndex={index}
              />
            ))}
          </div>
        </div>

        {changeNotice ? (
          <div
            className={[
              styles.ChipGridChangeOverlay,
              changeNotice.phase === 'out' ? styles.ChipGridChangeOverlayOut : '',
            ].join(' ')}
            aria-live="polite"
            aria-atomic="true"
          >
            {/* Blur stays at opacity 1 — animating opacity on this layer kills backdrop-filter. */}
            <div className={styles.ChipGridChangeBlur} aria-hidden="true" />
            <div className={styles.ChipGridChangeFade}>
              <div className={styles.ChipGridChangeVeil} aria-hidden="true" />
              <div className={styles.ChipGridChangeTooltip} role="status">
                {changeNotice.message}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
