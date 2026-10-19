import { useEffect, useId, useRef, useState } from 'react';
import Button from '../Button';
import { PopoverHeader, PopoverClose, PopoverTitle } from '../Popover';
import { CloseIcon } from '../Icon';
import { SegmentedButton, SegmentedButtonItem } from '../SegmentedButton';
import { Combobox, ComboboxInput, ComboboxContent, ComboboxItemMulti, ComboboxEmpty } from '../Combobox';
import { SurfaceQuicklinks } from './ToothGrid';
import { buildRegularGridRows } from './toothGridRows';
import { ICD_OPTIONS } from './icdCodes';
import styles from './index.module.css';

/** Ring segments (+ centre) of the surface circle. Angles: 0° = top, clockwise. */
const C = 80, R = 78, r = 50, GAP = 3;
const pt = (rad: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + rad * Math.cos(a), C + rad * Math.sin(a)];
};
const arc = (from: number, to: number) => {
  const [x1, y1] = pt(R, from + GAP), [x2, y2] = pt(R, to - GAP);
  const [x3, y3] = pt(r, to - GAP), [x4, y4] = pt(r, from + GAP);
  return `M${x1} ${y1}A${R} ${R} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${r} ${r} 0 0 0 ${x4} ${y4}Z`;
};
const REGIONS = [
  { label: 'B/La', letters: 'B',  toggle: 'B', cls: 'labelBuccal',   d: arc(-45, 45) },
  { label: 'D',    letters: 'D',  toggle: 'D', cls: 'labelDistal',   d: arc(45, 135) },
  { label: 'L/P',  letters: 'LP', toggle: 'L', cls: 'labelLingual',  d: arc(135, 225) },
  { label: 'M',    letters: 'M',  toggle: 'M', cls: 'labelMesial',   d: arc(225, 315) },
] as const;

export interface IcdConfig {
  required: boolean;
  /** Pre-filled values for this code. */
  defaults: string[];
}

interface Props {
  title: string;
  requiresSurface: boolean;
  validTeeth: Set<string>;
  toothId: string;
  surfaceLetters: string;
  /** Omit to hide the ICD field (codes that don't use one). */
  icd?: IcdConfig;
  /** Called once per tooth. `more` = keep the popover open for the next one. */
  onCommit: (toothId: string, surfaceLetters: string, more: boolean, icd: string[]) => void;
  /** Enables Shift+Enter (apply and keep going). Off where the caller can't take repeat adds. */
  allowMore?: boolean;
}

const Kbd = ({ children }: { children: React.ReactNode }) => <kbd className={styles.Kbd}>{children}</kbd>;
const EnterIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-label="Enter" role="img">
    <path d="M4.04459 9.04471C3.88187 9.20743 3.61805 9.20743 3.45533 9.04471L0.955331 6.54471C0.792613 6.38199 0.792613 6.11817 0.955331 5.95545L3.45533 3.45545C3.61805 3.29274 3.88187 3.29274 4.04459 3.45545C4.20731 3.61817 4.20731 3.88199 4.04459 4.04471L2.25588 5.83342L6.24996 5.83342C7.40055 5.83341 8.33329 4.90067 8.33329 3.75008L8.33329 1.25008C8.33329 1.01996 8.51984 0.833415 8.74996 0.833415C8.98008 0.833415 9.16663 1.01996 9.16663 1.25008L9.16663 3.75008C9.16663 5.36091 7.86079 6.66675 6.24996 6.66675L2.25588 6.66675L4.04459 8.45545C4.20731 8.61817 4.20731 8.88199 4.04459 9.04471Z" fill="currentColor" />
  </svg>
);
const KbdEnter = () => <Kbd><EnterIcon /></Kbd>;
const KbdShiftEnter = () => <span className={styles.KeyCombo}><Kbd>Shift</Kbd><KbdEnter /></span>;

/**
 * Keyboard-first entry. Tooth frame: type digits (S = supernumerary, R = regular).
 * A valid typed tooth is the current one (orange — only ever one); Enter moves to the
 * surface frame, Shift+Enter keeps it and stays for the next tooth, pushing earlier
 * ones into the (blue) selection. Surface frame: letters toggle surfaces; Enter applies
 * the surface to every selected tooth and closes; Shift+Enter applies to the current
 * tooth only, promotes the next one and stays. If the code needs an ICD code and has
 * none, Enter moves focus there instead. Nothing reaches the caller until an apply.
 */
export function ToothQuickEntry({ title, requiresSurface, validTeeth, toothId, surfaceLetters, icd, onCommit, allowMore }: Props) {
  const [sup, setSup] = useState(false);
  const [step, setStep] = useState<'tooth' | 'surface' | 'icd'>('tooth');
  const [buffer, setBuffer] = useState('');
  const [current, setCurrent] = useState(toothId);
  const [queue, setQueue] = useState<string[]>([]);
  const [surface, setSurface] = useState(surfaceLetters);
  const [invalid, setInvalid] = useState<'tooth' | 'surface' | 'icd' | null>(null);
  const [icdChips, setIcdChips] = useState<string[]>(icd?.defaults ?? []);
  const [icdMsg, setIcdMsg] = useState('');
  const [icdQuery, setIcdQuery] = useState('');
  const icdHighlight = useRef<unknown>(undefined);
  const toothRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const icdId = useId() + '-icd';
  const icdFocus = () => document.getElementById(icdId)?.focus();

  useEffect(() => { toothRef.current?.focus(); }, []);

  const typedId = buffer ? (sup ? `S${buffer}` : buffer) : '';
  // Supernumerary teeth reuse the regular numbering with an S prefix (S13, S55, …).
  const typedValid = validTeeth.has(sup ? typedId.slice(1) : typedId);
  /** The one orange tooth: a valid typed tooth right away, otherwise the confirmed current one. */
  const highlighted = typedValid ? typedId : current;
  const uniq = (l: string[]) => [...new Set(l.filter(Boolean))];
  /** Blue teeth: the rest of the selection. */
  const blues = uniq([...queue, typedValid && current !== typedId ? current : '']).filter(t => t !== highlighted);
  /** Everything an apply would cover: selection + current + the typed tooth, if valid. */
  const teeth = uniq([...queue, current, typedValid ? typedId : '']);
  const multi = !!allowMore && teeth.length > 1;
  /** The summary row only matters once a second tooth has been confirmed (click / Shift+Enter), not while typing. */
  /** Apply vs Apply-for-all only differ when each tooth needs its own surface / ICD. */
  const split = multi && (requiresSurface || !!icd);
  // Keeps the "(N)" readable while the suffix collapses away.
  const lastCount = useRef(2);
  if (split) lastCount.current = teeth.length;
  const showSummary = requiresSurface && uniq([...queue, current]).length > 1;
  const missing = !teeth.length ? 'Select a tooth'
    : requiresSurface && !surface ? 'Select a surface'
    : icd?.required && !icdChips.length ? 'Add an ICD code to continue'
    : '';
  const toothError = invalid === 'tooth' ? 'Type a tooth number or click one'
    : buffer.length >= 2 && !typedValid ? `${typedId} can't be selected` : '';

  /** Tab / Shift+Tab loops through tooth → surface → ICD instead of leaving the popover. */
  const cycleFocus = (e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || e.altKey || e.ctrlKey || e.metaKey) return;
    const stops = [
      toothRef.current,
      requiresSurface ? surfaceRef.current : null,
      icd ? (e.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-icd-field]') : null,
    ].filter((el): el is HTMLElement => !!el);
    const at = stops.findIndex(el => el.contains(e.target as Node));
    if (at < 0) return;
    e.preventDefault();
    const next = stops[(at + (e.shiftKey ? -1 : 1) + stops.length) % stops.length];
    (next.hasAttribute('data-icd-field') ? document.getElementById(icdId) : next)?.focus();
  };

  const switchTab = (toSup: boolean) => { setSup(toSup); setBuffer(''); setInvalid(null); };

  const removeTooth = (id: string) => {
    setQueue(q => q.filter(t => t !== id));
    setCurrent(c => (c === id ? '' : c));
    if (typedId === id) setBuffer('');
  };

  /** Moves focus to the first thing still missing; true when ready to apply. */
  const ready = (letters: string, list: string[]) => {
    if (!list.length) { toothRef.current?.focus(); setInvalid('tooth'); return false; }
    if (requiresSurface && !letters) { surfaceRef.current?.focus(); setInvalid('surface'); return false; }
    if (icd?.required && !icdChips.length) {
      icdFocus(); setIcdMsg('Add an ICD code to continue'); setInvalid('icd'); return false;
    }
    return true;
  };

  const commit = (list: string[], letters: string, more: boolean) => {
    list.forEach(t => onCommit(t, letters, more, icdChips));
    if (!more) return;
    setCurrent(''); setQueue([]); setSurface(''); setBuffer(''); setInvalid(null);
    toothRef.current?.focus();
  };

  const trySubmit = (list: string[], letters: string, more: boolean) => {
    if (ready(letters, list)) commit(list, letters, more);
  };

  /** Apply to just the orange tooth, then move to the next selected one. */
  const applyCurrent = () => {
    const id = highlighted || queue[queue.length - 1];
    if (!ready(surface, id ? [id] : [])) return;
    onCommit(id, surface, true, icdChips);
    const rest = uniq([...queue, current]).filter(t => t !== id);
    const next = rest[rest.length - 1];
    setSurface(''); setBuffer(''); setInvalid(null);
    if (next) { setCurrent(next); setQueue(rest.filter(t => t !== next)); (requiresSurface ? surfaceRef : toothRef).current?.focus(); }
    else { setCurrent(''); setQueue([]); toothRef.current?.focus(); }
  };

  /**
   * `id` is the typed/clicked tooth, or '' for a bare Enter. `more` keeps it as the
   * current tooth and stays on the tooth frame; otherwise it becomes current and we
   * move on. Only one tooth is current, so a previous current joins the selection.
   */
  const advance = (id: string, more: boolean) => {
    const others = uniq([...queue, current]).filter(t => t !== id);
    setBuffer(''); setInvalid(null);
    if (more) { setQueue(others); setCurrent(id); return; }
    const next = id || others[others.length - 1];
    const rest = others.filter(t => t !== next);
    setCurrent(next); setQueue(rest);
    if (!requiresSurface) trySubmit(uniq([...rest, next]), '', false);
    else surfaceRef.current?.focus();
  };

  const clickTooth = (id: string, e: React.MouseEvent) => {
    const multiClick = allowMore && (e.shiftKey || e.metaKey || e.ctrlKey);
    if ((blues.includes(id) || highlighted === id) && !multiClick) { removeTooth(id); return; }
    advance(id, !!allowMore && (e.shiftKey || e.metaKey || e.ctrlKey));
  };

  const toothKey = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'Enter') {
      e.preventDefault();
      const more = !!allowMore && e.shiftKey;
      const id = typedValid ? typedId : '';
      if (id || (!more && (current || queue.length))) advance(id, more); else setInvalid('tooth');
    }
    else if (k === 'Backspace') {
      e.preventDefault();
      if (buffer) setBuffer(b => b.slice(0, -1));
      else removeTooth(highlighted || queue[queue.length - 1]);
      setInvalid(null);
    }
    else if (/^\d$/.test(k)) { e.preventDefault(); setBuffer(b => (b.length >= 2 ? k : b + k)); setInvalid(null); }
    else if (k.toLowerCase() === 's') { e.preventDefault(); switchTab(true); }
    else if (k.toLowerCase() === 'r') { e.preventDefault(); switchTab(false); }
  };

  const toggleLetter = (l: string) =>
    setSurface(s => (s.includes(l) ? s.replace(l, '') : s + l));

  const applyKey = (e: React.KeyboardEvent) => {
    if (allowMore && e.shiftKey) applyCurrent(); else trySubmit(teeth, surface, false);
  };

  const surfaceKey = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'Enter') { e.preventDefault(); applyKey(e); }
    else if (k === 'Backspace') { e.preventDefault(); setSurface(s => s.slice(0, -1)); }
    else if (/^[modblip]$/i.test(k)) { e.preventDefault(); toggleLetter(k.toUpperCase()); setInvalid(null); }
  };

  // Enter with no option highlighted in the list applies, like on the other fields.
  const icdKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !icdQuery) { setIcdChips(l => l.slice(0, -1)); return; }
    if (e.key !== 'Enter' || icdHighlight.current !== undefined) return;
    e.preventDefault();
    applyKey(e);
  };

  // Clicks must not steal focus from the frame (Enter on a focused cell would double-fire).
  const keepFocus = (ref: React.RefObject<HTMLDivElement | null>) => ({
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => ref.current?.focus(),
  });

  const cell = (id: string, disabled = false) => (
    <button
      key={id}
      type="button"
      tabIndex={-1}
      disabled={disabled}
      className={[
        styles.ToothCell,
        blues.includes(id) ? styles.ToothCellQueued : '',
        highlighted === id ? styles.ToothCellStaged : '',
      ].filter(Boolean).join(' ')}
      onClick={e => clickTooth(id, e)}
    >
      {id}
    </button>
  );

  const surfaceOn = (letters: string) => letters.split('').some(l => surface.includes(l));

  return (
    <>
      <PopoverHeader className={styles.DarkHeader}>
        <div className={styles.HeaderLeft}>
          <PopoverTitle>{title}</PopoverTitle>
        </div>
        <PopoverClose>
          <Button variant="ghost" inverse iconOnly aria-label="Close" leftIcon={<CloseIcon />} />
        </PopoverClose>
      </PopoverHeader>

      <div className={styles.QuickBody} onKeyDown={cycleFocus}>
        <div className={styles.QuickMain}>
          <div className={styles.QuickCol}>
            <div className={styles.QuickLabel}>Select tooth <span className={styles.Req}>*</span></div>
            <div className={styles.Hint}>Click a tooth or type its number</div>
            <div
              ref={toothRef}
              data-first-focus
              tabIndex={0}
              className={styles.QuickFrame}
              aria-label="Select tooth: type a number, S for supernumerary, Enter to continue"
              aria-invalid={invalid === 'tooth' || undefined}
              onKeyDown={toothKey}
              onFocus={() => setStep('tooth')}
              {...keepFocus(toothRef)}
            >
              <div className={styles.QuickPanel}>
                <div className={styles.QuickTabs}>
                  <SegmentedButton value={sup ? 'sup' : 'reg'} onValueChange={v => switchTab(v === 'sup')}>
                    <SegmentedButtonItem value="reg">Regular <Kbd>R</Kbd></SegmentedButtonItem>
                    <SegmentedButtonItem value="sup">Supernumerary <Kbd>S</Kbd></SegmentedButtonItem>
                  </SegmentedButton>
                  <span className={toothError ? styles.TypedErr : styles.TypedEcho} role={toothError ? 'alert' : undefined}>
                    {toothError || (buffer && <>Typing <span className={styles.KeyCombo}>{[...typedId].map((ch, i) => <Kbd key={i}>{ch}</Kbd>)}</span></>)}
                  </span>
                </div>
                <div className={styles.GridStack}>
                  {[false, true].map(isSup => (
                    <div
                      key={String(isSup)}
                      className={[styles.Grid, styles.GridPane, sup === isSup ? '' : isSup ? styles.PaneRight : styles.PaneLeft].join(' ')}
                      inert={sup !== isSup}
                    >
                      {buildRegularGridRows().map((row, i) => (
                        <div key={i} className={[styles.GridRow, row.variant === 'primary' ? styles.GridRowPrimary : ''].join(' ')}>
                          {row.teeth.map((t, j) => (t ? cell(isSup ? `S${t.id}` : t.id, row.variant === 'primary') : <div key={j} className={styles.ToothCellEmpty} />))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {requiresSurface && (
            <div className={styles.QuickColSurface}>
              <div className={styles.QuickLabel}>Select surface <span className={styles.Req}>*</span></div>
              <div className={styles.Hint}>Click, or type <span className={styles.KeyCombo}><Kbd>M</Kbd><Kbd>O</Kbd><Kbd>D</Kbd><Kbd>B</Kbd><Kbd>L</Kbd></span></div>
              <div
                ref={surfaceRef}
                tabIndex={0}
                className={styles.QuickFrame}
                aria-label="Select surface: type M, O, D, B, L, I or P, Enter to apply"
                aria-invalid={invalid === 'surface' || undefined}
                onKeyDown={surfaceKey}
                onFocus={() => setStep('surface')}
                {...keepFocus(surfaceRef)}
              >
                <div className={styles.Diagram}>
                  <svg viewBox="0 0 160 160" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                    {REGIONS.map(g => (
                      <path
                        key={g.label}
                        d={g.d}
                        role="button"
                        aria-pressed={surfaceOn(g.letters)}
                        aria-label={`Surface ${g.label}`}
                        className={[styles.CircleRegion, surfaceOn(g.letters) ? styles.CircleRegionSelected : ''].join(' ')}
                        onClick={() => toggleLetter(g.toggle)}
                      />
                    ))}
                    <circle
                      cx={C} cy={C} r={r - GAP * 2}
                      role="button"
                      aria-label="Surface O/I"
                      aria-pressed={/[OI]/.test(surface)}
                      className={[styles.CircleRegion, /[OI]/.test(surface) ? styles.CircleRegionSelected : ''].join(' ')}
                      onClick={() => toggleLetter('O')}
                    />
                  </svg>
                  {REGIONS.map(g => <span key={g.label} className={[styles.DiagramLabel, styles[g.cls]].join(' ')}>{g.label}</span>)}
                  <span className={[styles.DiagramLabel, styles.labelOcclusal].join(' ')}>O/I</span>
                </div>
                <div className={styles.QuickPicks}>
                  <SurfaceQuicklinks
                    surfaceLetters={surface}
                    onSelect={letters => { setSurface(letters); if (teeth.length) trySubmit(teeth, letters, false); }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {icd && (
          <div className={styles.IcdBlock}>
            <div className={styles.IcdRow}>
              <label htmlFor={icdId}>ICD code {icd.required && <span className={styles.Req}>*</span>}</label>
              <div data-icd-field className={[styles.IcdField, invalid === 'icd' ? styles.IcdFieldInvalid : ''].join(' ')} onFocus={() => setStep('icd')}>
                <Combobox
                  multiple
                  items={ICD_OPTIONS.map(o => o.code)}
                  filter={null}
                  inputValue={icdQuery}
                  onItemHighlighted={v => { icdHighlight.current = v; }}
                  onInputValueChange={setIcdQuery}
                  value={icdChips}
                  onValueChange={v => { setIcdChips(v as string[]); setIcdMsg(''); setInvalid(null); }}
                >
                  <ComboboxInput id={icdId} className={styles.IcdGroup} placeholder={icdChips.length ? '' : 'Search ICD code'} onKeyDown={icdKey}>
                    {icdChips.map(c => (
                      <span key={c} className={styles.IcdChip}>
                        {c}
                        <button type="button" tabIndex={-1} className={styles.ChipX} aria-label={`Remove ${c}`} onClick={() => setIcdChips(l => l.filter(x => x !== c))}>×</button>
                      </span>
                    ))}
                  </ComboboxInput>
                  <ComboboxContent>
                    {ICD_OPTIONS.filter(o => `${o.code} ${o.label}`.toLowerCase().includes(icdQuery.trim().toLowerCase())).map(o => (
                      <ComboboxItemMulti key={o.code} value={o.code} subtext={o.label}>{o.code}</ComboboxItemMulti>
                    ))}
                    <ComboboxEmpty>No matching ICD codes</ComboboxEmpty>
                  </ComboboxContent>
                </Combobox>
              </div>
            </div>
            {invalid === 'icd' && icdMsg && <div className={styles.TypedErr} role="alert">{icdMsg}</div>}
          </div>
        )}

        <div className={styles.SummaryWrap} data-open={showSummary || undefined} inert={!showSummary}>
          <div>
            <div className={styles.Summary} aria-live="polite">
              <span className={styles.SummaryLabel}>{teeth.length > 1 ? 'Adding to' : 'Adding'}</span>
              {teeth.map(t => (
                <span key={t} className={[styles.IcdChip, t === highlighted ? styles.ChipCurrent : ''].join(' ')}>
                  #{t}
                </span>
              ))}
              {requiresSurface && (
                <>
                  <span className={styles.SummaryLabel}>→</span>
                  <span className={styles.IcdChip}>
                    {surface || '—'}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={styles.QuickFooter}>
        <span className={styles.FooterLegend}>
          {teeth.length > 0 && (
            <>
              <span key="enter" className={styles.LegendItem}>
                <KbdEnter /> {step === 'tooth' && requiresSurface ? 'Next: surface' : split ? 'Apply for all' : 'Apply'}
              </span>
              {allowMore && (
                <span key="shift" className={styles.LegendItem} style={{ animationDelay: '80ms' }}>
                  <KbdShiftEnter /> {step === 'tooth' ? 'Select another tooth' : multi ? `Apply ${highlighted || 'tooth'} and go on` : 'Apply and next tooth'}
                </span>
              )}
            </>
          )}
        </span>
        <span className={styles.CollapseX} data-open={split || undefined} inert={!split}>
          <span>
            <Button variant="secondary" disabled={!!missing} title={`Apply to tooth ${highlighted} only`} onClick={applyCurrent}>Apply</Button>
          </span>
        </span>
        <Button variant="primary" disabled={!!missing} onClick={() => trySubmit(teeth, surface, false)}>
          Apply
          <span className={styles.CollapseX} data-open={split || undefined}>
            <span>&nbsp;for all ({lastCount.current})</span>
          </span>
        </Button>
      </div>
    </>
  );
}
