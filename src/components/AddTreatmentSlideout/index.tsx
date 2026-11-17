import { useEffect, useMemo, useState } from 'react';
import Button from '../Button';
import { Input } from '../Input';
import { Radio, RadioGroup } from '../Radio';
import { Tag } from '../Tag';
import { CloseIcon, WarningIcon } from '../Icon';
import { ScrollArea, ScrollAreaViewport, ScrollAreaContent, ScrollAreaScrollbar, ScrollAreaThumb } from '../ScrollArea';
import { ToothSelectorPopover } from '../ToothSelectorModal';
import { AREA_PRESETS, CONDITION_CHIPS, EXPLOSION_CODES, type ChipDef } from '../CarePanel/data';
import type { DentalCode } from '../CarePanel/dentalCodes';
import type { CarePanelSelectionContext } from '../CarePanel';
import styles from './index.module.css';

/** A line in the table: a code/condition plus the tooth / surface / area it still needs. */
export interface TreatmentRow {
  key: number;
  chip: ChipDef;
  area?: DentalCode['area'];
  thArea: string;
  surface: string;
}

type TreatmentType = 'planned' | 'existing' | 'completed';

const CONTEXTS: Record<TreatmentType, CarePanelSelectionContext> = {
  planned: { tab: 'new', txType: 'proposed' },
  existing: { tab: 'existing', txType: 'proposed' },
  completed: { tab: 'new', txType: 'completed' },
};
const TYPE_TAG = { planned: ['Planned', 'blue'], existing: ['Existing', 'grey'], completed: ['Completed', 'green'] } as const;

const isComplete = (r: TreatmentRow) =>
  r.chip.requires === 'none' || (!!r.thArea && (r.chip.requires !== 'surface' || !!r.surface));

/** Wide left-hand, full-height slideout: pick conditions, codes and explosion codes into a table, fill in tooth/surface/area, then bulk-add. */
export function AddTreatmentSlideout({ open, codes, onAdd, onClose }: {
  open: boolean;
  codes: DentalCode[];
  onAdd: (rows: TreatmentRow[], context: CarePanelSelectionContext) => void;
  onClose: () => void;
}) {
  // Body state resets each time the slideout opens.
  const [session, setSession] = useState(0);
  useEffect(() => { if (open) setSession(n => n + 1); }, [open]);

  return (
    <>
    <div className={styles.Backdrop} data-open={open ? '' : undefined} aria-hidden onClick={onClose} />
    <aside
      className={styles.Slideout}
      data-open={open ? '' : undefined}
      aria-hidden={!open}
      inert={!open}
      aria-label="Add treatment"
    >
      <Body key={session} open={open} codes={codes} onAdd={onAdd} onClose={onClose} />
    </aside>
    </>
  );
}

function Body({ open, codes, onAdd, onClose }: { open: boolean; codes: DentalCode[]; onAdd: (rows: TreatmentRow[], context: CarePanelSelectionContext) => void; onClose: () => void }) {
  const [type, setType] = useState<TreatmentType>('planned');
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<TreatmentRow[]>([]);
  const [nextKey, setNextKey] = useState(1);
  const [editing, setEditing] = useState<{ key: number; anchor: HTMLElement } | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || document.querySelector('[data-tooth-selector-popup]')) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();
  const match = (text: string) => !q || text.toLowerCase().includes(q);
  const codeChip = (c: DentalCode): ChipDef => ({ id: `code-${c.code}`, label: `${c.code} - ${c.description}`, kind: 'procedure', requires: c.requires });
  const treatments = useMemo(() => codes.map(c => ({ c, label: `${c.code} - ${c.description}` })), [codes]);

  const addRows = (items: Omit<TreatmentRow, 'key' | 'thArea' | 'surface'>[]) => {
    setRows(prev => [...prev, ...items.map((it, i) => ({ ...it, key: nextKey + i, thArea: '', surface: '' }))]);
    setNextKey(k => k + items.length);
  };
  const addCode = (c: DentalCode) => addRows([{ chip: codeChip(c), area: c.area }]);
  const addExplosion = (id: string) => {
    const items = EXPLOSION_CODES.find(e => e.id === id)!.items.flatMap(it => {
      const c = it.code ? codes.find(x => x.code === it.code) : undefined;
      const chip = it.chipId ? CONDITION_CHIPS.find(x => x.id === it.chipId) : undefined;
      return c ? [{ chip: codeChip(c), area: c.area }] : chip ? [{ chip }] : [];
    });
    addRows(items);
  };

  const editingRow = rows.find(r => r.key === editing?.key);
  const ready = rows.length > 0 && rows.every(isComplete);
  const [tagLabel, tagColor] = TYPE_TAG[type];

  const cellButton = (r: TreatmentRow, text: string) => (
    <button type="button" className={styles.CellButton} onClick={e => setEditing({ key: r.key, anchor: e.currentTarget })}>
      {text ? text : <WarningIcon className={styles.Warn} aria-label="Required" />}
    </button>
  );

  return (
    <>
      <header className={styles.Header}>
        <h2 className={styles.Title}>Add Treatment</h2>
        <Button variant="ghost" inverse iconOnly aria-label="Close" leftIcon={<CloseIcon />} onClick={onClose} />
      </header>

      <div className={styles.Toolbar}>
        <span className={styles.ToolbarLabel}>Treatment Type</span>
        <RadioGroup value={type} onValueChange={v => setType(v as TreatmentType)} style={{ flexDirection: 'row', gap: 'var(--spacing-24)' }}>
          <Radio value="planned">Planned</Radio>
          <Radio value="existing">Existing</Radio>
          <Radio value="completed">Completed</Radio>
        </RadioGroup>
        <div className={styles.Search}>
          <Input type="search" placeholder="Search conditions or treatments" value={query} onChange={setQuery} />
        </div>
      </div>

      <div className={styles.Lists}>
        <List title="Conditions">
          {CONDITION_CHIPS.filter(c => match(c.label)).map(c => (
            <ListItem key={c.id} label={c.label} onClick={() => addRows([{ chip: c }])} />
          ))}
        </List>
        <List title="Treatments">
          {treatments.filter(t => match(t.label)).map(({ c, label }) => (
            <ListItem key={c.code} label={label} onClick={() => addCode(c)} />
          ))}
        </List>
        <List title="Explosion Codes">
          {EXPLOSION_CODES.filter(e => match(e.label)).map(e => (
            <ListItem key={e.id} label={e.label} onClick={() => addExplosion(e.id)} />
          ))}
        </List>
      </div>

      <div className={styles.TableHalf}>
      <div className={styles.TableWrap}>
        <table className={styles.Table}>
          <thead>
            <tr>
              <th>Description</th>
              <th className={styles.ColNarrow}>Tooth/Area</th>
              <th className={styles.ColNarrow}>Surface</th>
              <th className={styles.ColNarrow}>Status</th>
              <th className={styles.ColIcon} aria-label="Remove" />
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const { requires } = r.chip;
              const area = AREA_PRESETS.find(a => a.id === r.thArea)?.label;
              return (
                <tr key={r.key}>
                  <td className={isComplete(r) ? undefined : styles.Incomplete}>{r.chip.label}</td>
                  <td>{requires === 'none' ? '--' : cellButton(r, area ?? r.thArea)}</td>
                  <td>{requires === 'surface' ? cellButton(r, r.surface) : '--'}</td>
                  <td><Tag variant="fill" color={tagColor}>{tagLabel}</Tag></td>
                  <td>
                    <Button variant="ghost" iconOnly aria-label={`Remove ${r.chip.label}`} leftIcon={<CloseIcon />} onClick={() => setRows(prev => prev.filter(x => x.key !== r.key))} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!rows.length && <p className={styles.Empty}>Pick a condition, treatment or explosion code above to add it here.</p>}
      </div>
      </div>

      <footer className={styles.Footer}>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!ready} onClick={() => onAdd(rows, CONTEXTS[type])}>Add to Treatment</Button>
      </footer>

      {editing && editingRow && (
        <ToothSelectorPopover
          open
          onOpenChange={o => { if (!o) setEditing(null); }}
          anchor={editing.anchor}
          title={editingRow.chip.label}
          requiresSurface={editingRow.chip.requires === 'surface'}
          area={editingRow.chip.requires === 'area' ? (editingRow.area ?? 'quadrant') : undefined}
          toothId={editingRow.thArea}
          surfaceLetters={editingRow.surface}
          onCommit={(thArea, surface) => {
            setRows(prev => prev.map(r => (r.key === editingRow.key ? { ...r, thArea, surface } : r)));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function List({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className={styles.List}>
      <h3 className={styles.ListTitle}>{title}</h3>
      <ScrollArea className={styles.ListScroll}>
        <ScrollAreaViewport>
          <ScrollAreaContent>{children}</ScrollAreaContent>
        </ScrollAreaViewport>
        <ScrollAreaScrollbar><ScrollAreaThumb /></ScrollAreaScrollbar>
      </ScrollArea>
    </section>
  );
}

const ListItem = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <button type="button" className={styles.Item} onClick={onClick}>{label}</button>
);
