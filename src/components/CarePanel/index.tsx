import { useState, useRef, useMemo, useEffect, useLayoutEffect } from 'react';
import styles from './index.module.css';
import Button from '../Button';
import { Label } from '../Label';
import { Radio, RadioGroup } from '../Radio';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../Select';
import { SegmentedButton, SegmentedButtonItem } from '../SegmentedButton';
import { Combobox, ComboboxInput, ComboboxItem, ComboboxEmpty } from '../Combobox';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from '../ScrollArea';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover';
import { Tag } from '../Tag';
import Input from '../Input';
import { PlusIcon, InfoOutlineIcon, InfoSolidIcon } from '../Icon';
import { PROCEDURE_CHIPS, PLAN_AND_EXPLOSION_CHIPS, CONDITION_CHIPS, CARE_PANELS, CHIP_LEGEND, type ChipDef } from './data';
import { DENTAL_CODES, type DentalCode } from './dentalCodes';

export type { ChipDef, ChipKind, ToothRequirement } from './data';

export type TxType = 'proposed' | 'completed';
export type CarePanelTab = 'new' | 'existing';

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
                  <ScrollAreaContent>
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
  const [txType, setTxType] = useState<TxType>('proposed');
  const [carePanelId, setCarePanelId] = useState(CARE_PANELS[0].id);
  const [appointmentId, setAppointmentId] = useState<string | null>(APPOINTMENTS[0].id);
  const [manualDos, setManualDos] = useState('2026-12-09');
  const [locationId, setLocationId] = useState(LOCATIONS[0].id);
  const [providerId, setProviderId] = useState(PROVIDERS[0].id);
  const [treatingDentistId, setTreatingDentistId] = useState(TREATING_DENTISTS[0].id);
  const [codeSearchMode, setCodeSearchMode] = useState<'closed' | 'open' | 'closing'>('closed');
  const [statusRipple, setStatusRipple] = useState(false);
  const statusRippleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const codeMorphTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, []);

  const selectedAppointment = appointmentId
    ? APPOINTMENTS.find(a => a.id === appointmentId) ?? null
    : null;

  const handleTxTypeChange = (value: unknown) => {
    setTxType(value as TxType);
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

  const gridChips = [
    ...(tab === 'existing' ? CONDITION_CHIPS : []),
    ...PROCEDURE_CHIPS,
    ...(tab === 'new' ? PLAN_AND_EXPLOSION_CHIPS : []),
  ];

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

  return (
    <div className={styles.CarePanel}>
      <div className={styles.Chrome}>
        <div className={styles.Header}>
          <SegmentedButton value={tab} onValueChange={v => setTab(v as CarePanelTab)}>
            <SegmentedButtonItem value="new">New Treatment</SegmentedButtonItem>
            <SegmentedButtonItem value="existing">Existing</SegmentedButtonItem>
          </SegmentedButton>
        </div>

        <div
          className={[styles.ContextSection, tab === 'existing' ? styles.ContextSectionHidden : ''].join(' ')}
          aria-hidden={tab === 'existing'}
        >
          <div className={styles.ContextSectionInner}>
            <div className={styles.AppointmentRow}>
              <div className={styles.AppointmentSelect}>
                <Select
                  items={APPOINTMENTS.map(a => ({ value: a.id, label: appointmentHeadline(a) }))}
                  value={appointmentId}
                  onValueChange={v => setAppointmentId((v as string | null) ?? null)}
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
                    positionerStyle={{ width: 467, minWidth: 467, maxWidth: 467 }}
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
                  <Tag variant="semi" color="green">Scheduled</Tag>
                  <Button variant="link">View Details</Button>
                </div>
              </div>
            </div>

            <div className={styles.MetaRow}>
              <div className={[styles.MetaItem, styles.MetaDos].join(' ')}>
                <span className={styles.MetaLabel}>DOS:</span>
                {selectedAppointment ? (
                  <span className={styles.MetaValue}>{selectedAppointment.dos}</span>
                ) : (
                  <div className={styles.MetaControl}>
                    <Input
                      type="date"
                      value={manualDos}
                      onChange={setManualDos}
                    />
                  </div>
                )}
              </div>
              <div className={[styles.MetaItem, styles.MetaLocation].join(' ')}>
                <span className={styles.MetaLabel}>Location:</span>
                {selectedAppointment ? (
                  <span className={styles.MetaValue}>{selectedAppointment.locationId}</span>
                ) : (
                  <div className={styles.MetaControl}>
                    <Select
                      items={LOCATIONS.map(l => ({ value: l.id, label: l.label }))}
                      value={locationId}
                      onValueChange={v => setLocationId(v as string)}
                    >
                      <SelectTrigger placeholder="Location" aria-label="Location" />
                      <SelectContent>
                        {LOCATIONS.map(l => (
                          <SelectItem key={l.id} value={l.id}>{l.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className={[styles.MetaItem, styles.MetaFill].join(' ')}>
                <span className={styles.MetaLabel}>Provider:</span>
                {selectedAppointment ? (
                  <span className={styles.MetaValue}>{selectedAppointment.providerId}</span>
                ) : (
                  <div className={styles.MetaControl}>
                    <Select
                      items={PROVIDERS.map(p => ({ value: p.id, label: p.label }))}
                      value={providerId}
                      onValueChange={v => setProviderId(v as string)}
                    >
                      <SelectTrigger placeholder="Provider" aria-label="Provider" />
                      <SelectContent>
                        {PROVIDERS.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className={[styles.MetaItem, styles.MetaFill].join(' ')}>
                <span className={styles.MetaLabel}>Treating Dentist:</span>
                <div className={styles.MetaControl}>
                  <Select
                    items={TREATING_DENTISTS.map(d => ({ value: d.id, label: d.label }))}
                    value={treatingDentistId}
                    onValueChange={v => setTreatingDentistId(v as string)}
                  >
                    <SelectTrigger placeholder="Select dentist" aria-label="Treating dentist" />
                    <SelectContent>
                      {TREATING_DENTISTS.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        {tab === 'new' ? (
          <div className={styles.TxTypeRow}>
            <Label size="xs">Tx Type :</Label>
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
                <Label size="xs">Care Panel :</Label>
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

            <div className={styles.ActionCollapse} aria-hidden={codeSearchMorphOpen}>
              <div className={styles.PaneClip}>
                <Button variant="secondary" leftIcon={<PlusIcon />} tabIndex={codeSearchMorphOpen ? -1 : 0}>
                  Note
                </Button>
              </div>
            </div>

            <div className={styles.ActionCollapse} aria-hidden={codeSearchMorphOpen}>
              <div className={styles.PaneClip}>
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
                  <PopoverContent side="top" align="end">
                    <Legend />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.ChipGridArea}>
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
    </div>
  );
}
