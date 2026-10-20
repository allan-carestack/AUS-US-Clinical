import { useEffect, useRef, useState } from 'react';
import Button from '../Button';
import { Tooltip } from '../Tooltip';
import { Kbd, KbdGroup } from '../Kbd';
import { PlusIcon } from '../Icon';
import { CodeSearch, type CodeInput, type DentalCode } from './index';
import styles from './PlanCodeAdd.module.css';

const MORPH_MS = 220;

/**
 * The +Code control for the Tx plan header: same behaviour as the Chart tab's +Code — the button
 * morphs into the code search, required tooth/surface/ICD input opens the tooth selector popover
 * over the picked list item, and Shift+N starts it from anywhere outside a text field.
 */
export function PlanCodeAdd({ codes, onAddCode }: {
  codes: DentalCode[];
  onAddCode: (code: DentalCode, input?: CodeInput) => void;
}) {
  const [mode, setMode] = useState<'closed' | 'open' | 'closing'>('closed');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = mode === 'open';

  const openSearch = () => {
    if (timer.current) clearTimeout(timer.current);
    setMode('open');
  };
  const closeSearch = () => {
    if (mode !== 'open') return;
    setMode('closing');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { setMode('closed'); timer.current = null; }, MORPH_MS);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyN' || !e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      if ((e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (mode !== 'closed') return;
      e.preventDefault();
      openSearch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <div className={[styles.Root, open ? styles.Open : ''].filter(Boolean).join(' ')}>
      <div className={styles.Collapsed} aria-hidden={open}>
        <div className={styles.Clip}>
          <Tooltip
            content={<span className={styles.Tip}>Add code <KbdGroup><Kbd inverse>shift</Kbd><Kbd inverse>N</Kbd></KbdGroup></span>}
            side="top"
          >
            <Button variant="secondary" leftIcon={<PlusIcon />} tabIndex={open ? -1 : 0} onClick={openSearch}>Code</Button>
          </Tooltip>
        </div>
      </div>
      <div className={styles.Expanded} aria-hidden={mode === 'closed'} inert={!open || undefined}>
        <div className={styles.Clip}>
          {mode !== 'closed' ? (
            <CodeSearch codes={codes} active={open} onSelect={onAddCode} onClose={closeSearch} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
