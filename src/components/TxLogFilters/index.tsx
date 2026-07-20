import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import styles from './index.module.css';
import { FilterChip } from '../FilterChip';
import Checkbox from '../Checkbox';
import { Menu, MenuTrigger, MenuContent, MenuCheckboxItem, MenuSeparator } from '../Menu';
import { AngleDownIcon } from '../Icon';

// Tx-log filters row — AU Chart Revamp Figma node 925:110622.
// Pills multi-select; "All" is the exclusive reset (selecting any specific
// filter drops All, clearing the last one restores it).
// When the row is narrow, trailing pills collapse into "More filters"
// instead of scrolling horizontally.

interface FilterDef {
  id: string;
  label: string;
  count?: number;
  /** Red badge (alert semantic, e.g. unfinished drafts) instead of the dark count. */
  notification?: boolean;
}

const FILTERS: FilterDef[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'existing', label: 'Existing', count: 2 },
  { id: 'planned', label: 'Planned Tx', count: 4 },
  { id: 'completed', label: 'Completed Tx' },
  { id: 'notes', label: 'Notes', count: 4 },
  { id: 'draft-notes', label: 'Draft Notes', count: 2, notification: true },
  { id: 'documents', label: 'Documents', count: 2 },
];

const MORE_FILTERS = ['Conditions', 'Referred out', 'On hold', 'Rejected Tx'];
const CASES = ['Case 1 — All on 4', 'Case 2 — Perio', 'Case 3 — Ortho'];

export interface TxLogFiltersState {
  filters: Set<string>;
  moreFilters: Set<string>;
  cases: Set<string>;
  showFeeEstimates: boolean;
  showInsBreakdown: boolean;
  showRejectedOnly: boolean;
}

export function TxLogFilters({ onChange }: { onChange?: (state: TxLogFiltersState) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set(['all']));
  const [moreFilters, setMoreFilters] = useState<Set<string>>(new Set());
  const [cases, setCases] = useState<Set<string>>(new Set());
  const [showFeeEstimates, setShowFeeEstimates] = useState(true);
  const [showInsBreakdown, setShowInsBreakdown] = useState(false);
  const [showRejectedOnly, setShowRejectedOnly] = useState(false);
  /** How many leading FILTERS stay visible as chips; the rest go in More filters. */
  const [visibleCount, setVisibleCount] = useState(FILTERS.length);

  const pillsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreMeasureRef = useRef<HTMLButtonElement>(null);
  const caseMeasureRef = useRef<HTMLButtonElement>(null);

  const emit = (partial: Partial<TxLogFiltersState>) => {
    onChange?.({ filters: selected, moreFilters, cases, showFeeEstimates, showInsBreakdown, showRejectedOnly, ...partial });
  };

  const togglePill = (id: string) => {
    setSelected(prev => {
      let next: Set<string>;
      if (id === 'all') {
        next = new Set(['all']);
      } else {
        next = new Set(prev);
        next.delete('all');
        if (next.has(id)) next.delete(id); else next.add(id);
        if (next.size === 0) next = new Set(['all']);
      }
      emit({ filters: next });
      return next;
    });
  };

  const toggleInSet = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };

  const overflowFilters = useMemo(() => FILTERS.slice(visibleCount), [visibleCount]);
  const visibleFilters = useMemo(() => FILTERS.slice(0, visibleCount), [visibleCount]);

  const selectedOverflow = useMemo(
    () => overflowFilters.filter(f => selected.has(f.id)),
    [overflowFilters, selected],
  );

  const moreMenuSelectionCount = selectedOverflow.length + moreFilters.size;

  /** Single selection in the More filters menu renames the trigger (e.g. "Documents"). */
  const moreChipMeta = useMemo(() => {
    if (moreMenuSelectionCount === 1) {
      if (selectedOverflow.length === 1) {
        const f = selectedOverflow[0];
        return {
          label: f.label,
          badge: f.count,
          badgeVariant: (f.notification ? 'notification' : 'count') as 'notification' | 'count',
        };
      }
      return { label: [...moreFilters][0], badge: undefined, badgeVariant: 'count' as const };
    }
    return { label: 'More filters', badge: undefined, badgeVariant: 'count' as const };
  }, [moreMenuSelectionCount, selectedOverflow, moreFilters]);

  const recomputeVisible = useCallback(() => {
    const pills = pillsRef.current;
    const measure = measureRef.current;
    if (!pills || !measure) return;

    const available = pills.clientWidth;
    const moreW = moreMeasureRef.current?.offsetWidth ?? 0;
    const caseW = caseMeasureRef.current?.offsetWidth ?? 0;
    const chipEls = Array.from(measure.querySelectorAll<HTMLElement>('[data-measure-chip]'));
    if (chipEls.length === 0) return;

    const gap = Number.parseFloat(getComputedStyle(measure).columnGap || getComputedStyle(measure).gap) || 0;

    // Always reserve More filters + Case (+ gaps between them and after the last visible pill).
    const reserved = moreW + caseW + gap * 2;
    let used = 0;
    let fit = 0;

    for (let i = 0; i < chipEls.length; i++) {
      const w = chipEls[i].offsetWidth;
      const next = used + (fit > 0 ? gap : 0) + w;
      if (next + reserved <= available) {
        used = next;
        fit++;
      } else {
        break;
      }
    }

    // Keep at least "All" visible.
    setVisibleCount(Math.max(1, fit));
  }, []);

  useLayoutEffect(() => {
    recomputeVisible();
    const pills = pillsRef.current;
    if (!pills || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(recomputeVisible);
    ro.observe(pills);
    return () => ro.disconnect();
  }, [recomputeVisible, moreChipMeta.label]);

  return (
    <div className={styles.Row}>
      {/* Off-screen measure row: natural widths of every filter chip + menu triggers. */}
      <div className={styles.Measure} aria-hidden ref={measureRef}>
        {FILTERS.map(f => (
          <FilterChip
            key={f.id}
            toggle={false}
            data-measure-chip
            badge={f.count}
            badgeVariant={f.notification ? 'notification' : 'count'}
          >
            {f.label}
          </FilterChip>
        ))}
        <FilterChip
          ref={moreMeasureRef}
          toggle={false}
          rightIcon={<AngleDownIcon />}
          pressed={moreMenuSelectionCount > 0}
          badge={moreChipMeta.badge}
          badgeVariant={moreChipMeta.badgeVariant}
        >
          {moreChipMeta.label}
        </FilterChip>
        <FilterChip ref={caseMeasureRef} toggle={false} rightIcon={<AngleDownIcon />} pressed={cases.size > 0}>
          Case
        </FilterChip>
      </div>

      <div className={styles.Pills} ref={pillsRef}>
        {visibleFilters.map(f => (
          <FilterChip
            key={f.id}
            pressed={selected.has(f.id)}
            onPressedChange={() => togglePill(f.id)}
            badge={f.count}
            badgeVariant={f.notification ? 'notification' : 'count'}
          >
            {f.label}
          </FilterChip>
        ))}

        <Menu>
          <MenuTrigger>
            <FilterChip
              toggle={false}
              rightIcon={<AngleDownIcon />}
              pressed={moreMenuSelectionCount > 0}
              badge={moreChipMeta.badge}
              badgeVariant={moreChipMeta.badgeVariant}
            >
              {moreChipMeta.label}
            </FilterChip>
          </MenuTrigger>
          <MenuContent>
            {overflowFilters.map(f => (
              <MenuCheckboxItem
                key={f.id}
                checked={selected.has(f.id)}
                onCheckedChange={() => togglePill(f.id)}
                closeOnClick={false}
              >
                {f.label}
              </MenuCheckboxItem>
            ))}
            {overflowFilters.length > 0 && MORE_FILTERS.length > 0 && <MenuSeparator />}
            {MORE_FILTERS.map(label => (
              <MenuCheckboxItem
                key={label}
                checked={moreFilters.has(label)}
                onCheckedChange={() => setMoreFilters(prev => { const next = toggleInSet(prev, label); emit({ moreFilters: next }); return next; })}
                closeOnClick={false}
              >
                {label}
              </MenuCheckboxItem>
            ))}
          </MenuContent>
        </Menu>

        <Menu>
          <MenuTrigger>
            <FilterChip toggle={false} rightIcon={<AngleDownIcon />} pressed={cases.size > 0}>
              Case
            </FilterChip>
          </MenuTrigger>
          <MenuContent>
            {CASES.map(label => (
              <MenuCheckboxItem
                key={label}
                checked={cases.has(label)}
                onCheckedChange={() => setCases(prev => { const next = toggleInSet(prev, label); emit({ cases: next }); return next; })}
                closeOnClick={false}
              >
                {label}
              </MenuCheckboxItem>
            ))}
          </MenuContent>
        </Menu>
      </div>

      <div className={styles.Toggles}>
        <Checkbox checked={showFeeEstimates} onCheckedChange={c => { setShowFeeEstimates(!!c); emit({ showFeeEstimates: !!c }); }}>
          Show fee estimates
        </Checkbox>
        <Checkbox checked={showInsBreakdown} onCheckedChange={c => { setShowInsBreakdown(!!c); emit({ showInsBreakdown: !!c }); }}>
          Show Ins. Breakdown
        </Checkbox>
        <Checkbox checked={showRejectedOnly} onCheckedChange={c => { setShowRejectedOnly(!!c); emit({ showRejectedOnly: !!c }); }}>
          Show <span className={styles.RejectedText}>Rejected Tx</span> only
        </Checkbox>
      </div>
    </div>
  );
}
