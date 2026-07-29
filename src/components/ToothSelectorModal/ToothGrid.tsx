import { useState } from 'react';
import { Tabs, TabsList, TabsTab, TabsPanel } from '../Tabs';
import Button from '../Button';
import styles from './index.module.css';
import { buildRegularGridRows } from './toothGridRows';

const QUICKLINKS: { label: string; letters: string }[] = [
  { label: 'All', letters: 'BMODL' },
  { label: 'MO',  letters: 'MO' },
  { label: 'DO',  letters: 'DO' },
  { label: 'MOD', letters: 'MOD' },
  { label: 'ML',  letters: 'ML' },
  { label: 'DL',  letters: 'DL' },
];

/** Order-independent comparison — "MOD" and "DMO" are the same selection. */
function sameLetters(a: string, b: string): boolean {
  if (!a || !b) return false;
  const setA = new Set(a);
  const setB = new Set(b);
  return setA.size === setB.size && [...setA].every(c => setB.has(c));
}

interface ToothGridProps {
  selectedTooth?: string;
  onSelectTooth: (id: string) => void;
  showSurfaceLinks: boolean;
  /** Current surface letters, e.g. "MOD" — used to highlight a matching quicklink. */
  surfaceLetters: string;
  onQuicklinkSelect: (letters: string) => void;
}

export function ToothGrid({ selectedTooth, onSelectTooth, showSurfaceLinks, surfaceLetters, onQuicklinkSelect }: ToothGridProps) {
  const [tab, setTab] = useState('regular');
  const rows = buildRegularGridRows();

  return (
    <Tabs value={tab} onValueChange={value => setTab(value as string)} variant="secondary" className={styles.ToothPanel}>
      <TabsList className={styles.GridTabList}>
        <TabsTab value="regular">Regular</TabsTab>
        <TabsTab value="supernumerary">Supernumerary</TabsTab>
      </TabsList>
      <TabsPanel value="regular" className={styles.GridPanel}>
        <div className={styles.Grid}>
          {rows.map((row, i) => (
            <div key={i} className={[styles.GridRow, row.variant === 'primary' ? styles.GridRowPrimary : ''].join(' ')}>
              {row.teeth.map((tooth, j) => tooth ? (
                <button
                  key={tooth.id}
                  type="button"
                  className={[styles.ToothCell, selectedTooth === tooth.id ? styles.ToothCellSelected : ''].filter(Boolean).join(' ')}
                  onClick={() => onSelectTooth(tooth.id)}
                >
                  {tooth.id}
                </button>
              ) : (
                <div key={j} className={styles.ToothCellEmpty} />
              ))}
            </div>
          ))}
        </div>
        {showSurfaceLinks && (
          <div className={styles.Quicklinks}>
            {QUICKLINKS.map(link => (
              <Button
                key={link.label}
                variant="link"
                className={sameLetters(surfaceLetters, link.letters) ? styles.QuicklinkActive : ''}
                disabled={!selectedTooth}
                onClick={() => onQuicklinkSelect(link.letters)}
              >
                {link.label}
              </Button>
            ))}
          </div>
        )}
      </TabsPanel>
      <TabsPanel value="supernumerary" className={styles.GridPanel}>
        <div className={styles.EmptyState}>No supernumerary teeth on file.</div>
      </TabsPanel>
    </Tabs>
  );
}
