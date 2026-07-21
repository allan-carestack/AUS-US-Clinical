import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import styles from './index.module.css';
import { FilterChip } from '../FilterChip';
import Checkbox from '../Checkbox';
import { Menu, MenuTrigger, MenuContent, MenuRadioGroup, MenuRadioItem, MenuCheckboxItem, MenuSeparator } from '../Menu';
import { AngleDownIcon } from '../Icon';

// Tx-log filters row — AU Chart Revamp Figma node 925:110622.
// Everything in this row that looks like a filter (the visible pills, the
// overflowed pills in "More filters", and the saved-filter entries in that
// same menu) is ONE single-select radio group — choosing any one deselects
// every other, including across sections. "All" is just another option in
// that group, not a special reset. Case and the fee/ins/rejected checkboxes
// are separate, unrelated controls.
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
  { id: 'conditions', label: 'Conditions' },
  { id: 'today', label: 'Today' },
  { id: 'existing', label: 'Existing', count: 2 },
  { id: 'planned', label: 'Planned Tx', count: 4 },
  { id: 'completed', label: 'Completed Tx' },
  { id: 'notes', label: 'Notes', count: 4 },
  { id: 'draft-notes', label: 'Draft Notes', count: 2, notification: true },
  { id: 'documents', label: 'Documents', count: 2 },
];

// Custom saved filters a clinic user might have created — visual only, no
// wiring to the Tx-log table beyond participating in the same single-select
// radio group as FILTERS (see header comment).
const SAVED_FILTERS: FilterDef[] = [
  { id: 'saved-dr-john', label: "Dr. John's filter" },
  { id: 'saved-dr-ken', label: "Dr. Ken's filter" },
  { id: 'saved-dr-jane', label: "Dr. Jane's filter" },
];

const CASES = ['Case 1 — All on 4', 'Case 2 — Perio', 'Case 3 — Ortho'];

export interface TxLogFiltersState {
  filter: string;
  cases: Set<string>;
  showFeeEstimates: boolean;
  showInsBreakdown: boolean;
  showRejectedOnly: boolean;
}

export function TxLogFilters({ onChange }: { onChange?: (state: TxLogFiltersState) => void }) {
  const [selected, setSelected] = useState('all');
  const [cases, setCases] = useState<Set<string>>(new Set());
  const [showFeeEstimates, setShowFeeEstimates] = useState(true);
  const [showInsBreakdown, setShowInsBreakdown] = useState(false);
  const [showRejectedOnly, setShowRejectedOnly] = useState(false);
  /** How many leading FILTERS stay visible as chips; the rest go in More filters. */
  const [visibleCount, setVisibleCount] = useState(FILTERS.length);
  /** Measured natural width of the More-filters trigger, animated via CSS transition on width. */
  const [moreChipWidth, setMoreChipWidth] = useState<number>();

  const pillsRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const moreMeasureRef = useRef<HTMLButtonElement>(null);
  const caseMeasureRef = useRef<HTMLButtonElement>(null);

  const emit = (partial: Partial<TxLogFiltersState>) => {
    onChange?.({ filter: selected, cases, showFeeEstimates, showInsBreakdown, showRejectedOnly, ...partial });
  };

  const selectPill = (id: string) => {
    setSelected(id);
    emit({ filter: id });
  };

  const toggleInSet = (set: Set<string>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  };

  const overflowFilters = useMemo(() => FILTERS.slice(visibleCount), [visibleCount]);
  const visibleFilters = useMemo(() => FILTERS.slice(0, visibleCount), [visibleCount]);

  // Everything the "More filters" menu can select from — overflowed pills
  // first, then the saved filters — all one radio group.
  const moreMenuOptions = useMemo(() => [...overflowFilters, ...SAVED_FILTERS], [overflowFilters]);

  /** The active radio choice, if it lives inside the "More filters" menu
      (overflowed pill or saved filter) rather than a visible top-level pill. */
  const selectedInMoreMenu = useMemo(
    () => moreMenuOptions.find(f => f.id === selected),
    [moreMenuOptions, selected],
  );

  const moreMenuHasSelection = selectedInMoreMenu != null;

  /** The active choice (if it's inside this menu) renames the trigger, e.g. "Documents". */
  const moreChipMeta = useMemo(() => {
    if (selectedInMoreMenu) {
      return {
        label: selectedInMoreMenu.label,
        badge: selectedInMoreMenu.count,
        badgeVariant: (selectedInMoreMenu.notification ? 'notification' : 'count') as 'notification' | 'count',
      };
    }
    return { label: 'More filters', badge: undefined, badgeVariant: 'count' as const };
  }, [selectedInMoreMenu]);

  const recomputeVisible = useCallback(() => {
    const pills = pillsRef.current;
    const measure = measureRef.current;
    if (!pills || !measure) return;

    const available = pills.clientWidth;
    const moreW = moreMeasureRef.current?.offsetWidth ?? 0;
    const caseW = caseMeasureRef.current?.offsetWidth ?? 0;
    if (moreMeasureRef.current) setMoreChipWidth(moreW + 1);
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

  /** Pills entering/leaving the visible row (vs. the More-filters overflow) animate
   *  in and out instead of popping, so a browser-width change reads as motion. */
  const [renderedFilters, setRenderedFilters] = useState<Array<FilterDef & { phase: 'idle' | 'enter' | 'exit' }>>(
    () => visibleFilters.map(f => ({ ...f, phase: 'idle' as const })),
  );

  useLayoutEffect(() => {
    setRenderedFilters(prev => {
      const currentIds = new Set(visibleFilters.map(f => f.id));
      const prevIds = new Set(prev.map(p => p.id));
      const kept = prev.map(p => (currentIds.has(p.id) ? { ...p, phase: 'idle' as const } : { ...p, phase: 'exit' as const }));
      const additions = visibleFilters.filter(f => !prevIds.has(f.id)).map(f => ({ ...f, phase: 'enter' as const }));
      return [...kept, ...additions];
    });
  }, [visibleFilters]);

  useLayoutEffect(() => {
    if (renderedFilters.some(p => p.phase === 'enter')) {
      const raf = requestAnimationFrame(() => {
        setRenderedFilters(prev => prev.map(p => (p.phase === 'enter' ? { ...p, phase: 'idle' } : p)));
      });
      return () => cancelAnimationFrame(raf);
    }
    if (renderedFilters.some(p => p.phase === 'exit')) {
      const timer = setTimeout(() => {
        setRenderedFilters(prev => prev.filter(p => p.phase !== 'exit'));
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [renderedFilters]);

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
          pressed={moreMenuHasSelection}
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
        {renderedFilters.map(f => (
          <span
            key={f.id}
            className={[styles.PillWrap, f.phase !== 'idle' ? styles.PillWrapHidden : ''].filter(Boolean).join(' ')}
          >
            <FilterChip
              pressed={selected === f.id}
              onPressedChange={() => selectPill(f.id)}
              badge={f.count}
              badgeVariant={f.notification ? 'notification' : 'count'}
            >
              {f.label}
            </FilterChip>
          </span>
        ))}

        <Menu>
          <MenuTrigger>
            <FilterChip
              toggle={false}
              rightIcon={<AngleDownIcon />}
              pressed={moreMenuHasSelection}
              badge={moreChipMeta.badge}
              badgeVariant={moreChipMeta.badgeVariant}
              style={moreChipWidth != null ? { width: moreChipWidth } : undefined}
            >
              {moreChipMeta.label}
            </FilterChip>
          </MenuTrigger>
          <MenuContent>
            {/* One radio group across both sections — an overflowed pill and a
                saved filter are mutually exclusive, same as the visible pills. */}
            <MenuRadioGroup value={selected} onValueChange={v => selectPill(v as string)}>
              {overflowFilters.map(f => (
                <MenuRadioItem
                  key={f.id}
                  value={f.id}
                  badge={f.count}
                  badgeVariant={f.notification ? 'notification' : 'count'}
                >
                  {f.label}
                </MenuRadioItem>
              ))}
              {overflowFilters.length > 0 && SAVED_FILTERS.length > 0 && <MenuSeparator />}
              {SAVED_FILTERS.map(f => (
                <MenuRadioItem key={f.id} value={f.id}>
                  {f.label}
                </MenuRadioItem>
              ))}
            </MenuRadioGroup>
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
