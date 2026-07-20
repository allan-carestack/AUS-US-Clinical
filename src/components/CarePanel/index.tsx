import { useState, useRef, useMemo, useEffect } from 'react';
import styles from './index.module.css';
import { Tabs, TabsList, TabsTab } from '../Tabs';
import Button from '../Button';
import { Label } from '../Label';
import { Radio, RadioGroup } from '../Radio';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../Select';
import { Combobox, ComboboxInput, ComboboxItem, ComboboxEmpty } from '../Combobox';
import { Combobox as BaseCombobox } from '@base-ui/react/combobox';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from '../ScrollArea';
import { Popover, PopoverTrigger, PopoverContent } from '../Popover';
import { PlusIcon, GearIcon, InfoOutlineIcon, InfoSolidIcon } from '../Icon';
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

const chipClass: Record<ChipDef['kind'], string> = {
  procedure: styles.chipProcedure,
  condition: styles.chipCondition,
  'treatment-plan': styles.chipTreatmentPlan,
  explosion: styles.chipExplosion,
};

function Chip({ chip, armed, onSelect }: { chip: ChipDef; armed: boolean; onSelect: (chip: ChipDef) => void }) {
  // Treatment plans and explosion codes are visually part of the palette
  // but not wired up to any behavior yet — see chip-selection follow-up.
  const disabled = chip.kind === 'treatment-plan' || chip.kind === 'explosion';
  return (
    <button
      type="button"
      className={[styles.Chip, chipClass[chip.kind], armed ? styles.chipArmed : ''].join(' ')}
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

function CodeSearch({ codes = DENTAL_CODES, onSelect, onClose }: { codes?: DentalCode[]; onSelect: (code: DentalCode) => void; onClose: () => void }) {
  const [inputValue, setInputValue] = useState('');
  const skipInputUpdateRef = useRef(false);
  const processingRef = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (wrapperRef.current?.contains(target)) return;
      if (target.closest('[role="listbox"]')) return;
      onClose();
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [onClose]);

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
    <div ref={wrapperRef}>
      <Combobox
        open
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
        onValueChange={(val: string | null) => {
          if (!val || processingRef.current) return;
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
          autoFocus
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
  const [codeSearchOpen, setCodeSearchOpen] = useState(false);

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
      <div className={styles.TopRow}>
        <Tabs variant="tertiary" value={tab} onValueChange={v => setTab(v as CarePanelTab)} className={styles.Tabs}>
          <TabsList>
            <TabsTab value="new" className={styles.TabLabel}>New Treatment</TabsTab>
            <TabsTab value="existing" className={styles.TabLabel}>Existing</TabsTab>
          </TabsList>
        </Tabs>
        <Button variant="secondary" leftIcon={<PlusIcon />}>Note</Button>
      </div>

      <div className={styles.ControlsRow}>
        {tab === 'new' ? (
          <div className={styles.TxTypeRow}>
            <Label size="xs">Tx Type</Label>
            <RadioGroup value={txType} onValueChange={v => setTxType(v as TxType)} style={{ flexDirection: 'row', gap: 'var(--spacing-12)' }}>
              <Radio value="proposed">Tx Proposed</Radio>
              <Radio value="completed">Tx Completed</Radio>
            </RadioGroup>
          </div>
        ) : (
          <div className={styles.InfoBanner}>
            <InfoSolidIcon aria-hidden="true" />
            Add conditions or pre-existing treatments
          </div>
        )}
      </div>

      {codeSearchOpen ? (
        <div className={styles.CodeSearchFullRow}>
          <CodeSearch codes={codes} onSelect={handleCodeSelect} onClose={() => setCodeSearchOpen(false)} />
        </div>
      ) : (
        <div className={styles.SelectRow}>
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
          </div>

          <div className={styles.ActionsRow}>
            <Button variant="secondary" leftIcon={<PlusIcon />} onClick={() => setCodeSearchOpen(true)}>Code</Button>
            <Button variant="secondary" iconOnly leftIcon={<GearIcon />} aria-label="Customize care panel" />
            <Popover>
              <PopoverTrigger openOnHover>
                <Button variant="ghost" iconOnly leftIcon={<InfoOutlineIcon />} aria-label="What do the care panel colors mean?" />
              </PopoverTrigger>
              <PopoverContent side="top" align="end">
                <Legend />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      <div className={styles.ChipGridArea}>
        <div className={styles.ChipGrid}>
          {tab === 'existing' && CONDITION_CHIPS.map(chip => (
            <Chip key={chip.id} chip={chip} armed={chip.id === armedChipId} onSelect={handleSelect} />
          ))}
          {PROCEDURE_CHIPS.map(chip => (
            <Chip key={chip.id} chip={chip} armed={chip.id === armedChipId} onSelect={handleSelect} />
          ))}
          {tab === 'new' && PLAN_AND_EXPLOSION_CHIPS.map(chip => (
            <Chip key={chip.id} chip={chip} armed={chip.id === armedChipId} onSelect={handleSelect} />
          ))}
        </div>
      </div>
    </div>
  );
}
