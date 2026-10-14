import { useEffect, useRef, useState } from 'react';
import Button from '../Button';
import { PopoverHeader, PopoverClose, PopoverTitle } from '../Popover';
import { AngleDownIcon, CloseIcon } from '../Icon';
import { Radio, RadioGroup } from '../Radio';
import { SegmentedButton, SegmentedButtonItem } from '../SegmentedButton';
import { Tag } from '../Tag';
import { SurfaceQuicklinks } from './ToothGrid';
import { buildRegularGridRows } from './toothGridRows';
import styles from './index.module.css';

// ponytail: ICD is always pre-filled per the brief; static placeholder until the real source is wired.
const ICD_CODES = ['A001', 'A009', 'AB10'];

const SUP_ROWS = [0, 16].map(o => Array.from({ length: 16 }, (_, i) => `S${o + i + 1}`));
const SUP_IDS = new Set(SUP_ROWS.flat());

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

interface Props {
  title: string;
  requiresSurface: boolean;
  validTeeth: Set<string>;
  toothId: string;
  surfaceLetters: string;
  onCommit: (toothId: string, surfaceLetters: string) => void;
}

/**
 * Keyboard-first entry. Tooth frame: type digits, S = supernumerary, R = regular,
 * Enter → surface frame. Surface frame: 1 / 5 = Class 1 / V, letters toggle surfaces,
 * Enter → commit. Nothing is committed to the caller until that final Enter / Add.
 */
export function ToothQuickEntry({ title, requiresSurface, validTeeth, toothId, surfaceLetters, onCommit }: Props) {
  const [sup, setSup] = useState(false);
  const [buffer, setBuffer] = useState('');
  const [tooth, setTooth] = useState(toothId);
  const [surface, setSurface] = useState(surfaceLetters);
  const [cls, setCls] = useState('class1');
  const [invalid, setInvalid] = useState<'tooth' | 'surface' | null>(null);
  const toothRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => { toothRef.current?.focus(); }, []);

  const typedId = buffer ? (sup ? `S${buffer}` : buffer) : '';
  const typedValid = sup ? SUP_IDS.has(typedId) : validTeeth.has(typedId);
  const shown = typedValid ? typedId : buffer ? '' : tooth;
  const complete = !!shown && (!requiresSurface || !!surface);

  const switchTab = (toSup: boolean) => { setSup(toSup); setBuffer(''); setTooth(''); setInvalid(null); };

  const advance = (id: string) => {
    setTooth(id); setBuffer(''); setInvalid(null);
    if (requiresSurface) surfaceRef.current?.focus(); else onCommit(id, '');
  };

  const toothKey = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'Enter') { e.preventDefault(); if (shown) advance(shown); else setInvalid('tooth'); }
    else if (k === 'Backspace') { e.preventDefault(); setBuffer(b => b.slice(0, -1)); setInvalid(null); }
    else if (/^\d$/.test(k)) { e.preventDefault(); setBuffer(b => (b.length >= 2 ? k : b + k)); setInvalid(null); }
    else if (k.toLowerCase() === 's') { e.preventDefault(); switchTab(true); }
    else if (k.toLowerCase() === 'r') { e.preventDefault(); switchTab(false); }
  };

  const toggleLetter = (l: string) =>
    setSurface(s => (s.includes(l) ? s.replace(l, '') : s + l));

  const surfaceKey = (e: React.KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (k === 'Enter') {
      e.preventDefault();
      if (!shown) { toothRef.current?.focus(); setInvalid('tooth'); }
      else if (!surface) setInvalid('surface');
      else onCommit(shown, surface);
    }
    else if (k === 'Backspace') { e.preventDefault(); setSurface(s => s.slice(0, -1)); }
    else if (k === '1') setCls('class1');
    else if (k === '5') setCls('classV');
    else if (/^[modblip]$/i.test(k)) { e.preventDefault(); toggleLetter(k.toUpperCase()); setInvalid(null); }
  };

  // Clicks must not steal focus from the frame (Enter on a focused cell would double-fire).
  const keepFocus = (ref: React.RefObject<HTMLDivElement | null>) => ({
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
    onClick: () => ref.current?.focus(),
  });

  const cell = (id: string) => (
    <button
      key={id}
      type="button"
      tabIndex={-1}
      className={[
        styles.ToothCell,
        shown === id ? styles.ToothCellSelected : '',
        typedId && id.startsWith(typedId) ? styles.ToothCellMatch : '',
      ].filter(Boolean).join(' ')}
      onClick={() => advance(id)}
    >
      {id}
    </button>
  );

  return (
    <>
      <PopoverHeader className={styles.DarkHeader}>
        <PopoverTitle>{title}</PopoverTitle>
        {shown && <Tag variant="fill" color="green">Tooth #{shown}</Tag>}
        <PopoverClose>
          <Button variant="ghost" inverse iconOnly aria-label="Close" leftIcon={<CloseIcon />} />
        </PopoverClose>
      </PopoverHeader>

      <div className={styles.QuickBody}>
        <div className={styles.QuickMain}>
          <div className={styles.QuickCol}>
            <div className={styles.QuickLabel}>Select tooth <span className={styles.Req}>*</span></div>
            <div
              ref={toothRef}
              data-first-focus
              tabIndex={0}
              className={styles.QuickFrame}
              aria-label="Select tooth: type a number, S for supernumerary, Enter to continue"
              aria-invalid={invalid === 'tooth' || undefined}
              onKeyDown={toothKey}
              {...keepFocus(toothRef)}
            >
              <div className={styles.QuickPanel}>
                <div className={styles.QuickTabs}>
                  <SegmentedButton value={sup ? 'sup' : 'reg'} onValueChange={v => switchTab(v === 'sup')}>
                    <SegmentedButtonItem value="reg">Regular</SegmentedButtonItem>
                    <SegmentedButtonItem value="sup">Supernumerary</SegmentedButtonItem>
                  </SegmentedButton>
                </div>
                <div className={styles.Grid}>
                  {sup
                    ? SUP_ROWS.map((row, i) => <div key={i} className={styles.GridRow}>{row.map(cell)}</div>)
                    : buildRegularGridRows().map((row, i) => (
                      <div key={i} className={[styles.GridRow, row.variant === 'primary' ? styles.GridRowPrimary : ''].join(' ')}>
                        {row.teeth.map((t, j) => (t ? cell(t.id) : <div key={j} className={styles.ToothCellEmpty} />))}
                      </div>
                    ))}
                </div>
                {requiresSurface && <SurfaceQuicklinks surfaceLetters={surface} onSelect={setSurface} />}
              </div>
            </div>
          </div>

          {requiresSurface && (
            <div className={styles.QuickColSurface}>
              <div className={styles.QuickLabel}>Select surface <span className={styles.Req}>*</span></div>
              <div
                ref={surfaceRef}
                tabIndex={0}
                className={styles.QuickFrame}
                aria-label="Select surface: 1 or 5 for class, letters to toggle surfaces, Enter to add"
                aria-invalid={invalid === 'surface' || undefined}
                onKeyDown={surfaceKey}
                {...keepFocus(surfaceRef)}
              >
                <RadioGroup value={cls} onValueChange={v => setCls(v as string)} className={styles.ClassGroup}>
                  <Radio value="class1" tabIndex={-1}>Class 1</Radio>
                  <Radio value="classV" tabIndex={-1}>Class V</Radio>
                </RadioGroup>
                <div className={styles.Diagram}>
                  <svg viewBox="0 0 160 160" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                    {REGIONS.map(g => (
                      <path
                        key={g.label}
                        d={g.d}
                        role="button"
                        aria-pressed={g.letters.split('').some(l => surface.includes(l))}
                        aria-label={`Surface ${g.label}`}
                        className={[styles.CircleRegion, g.letters.split('').some(l => surface.includes(l)) ? styles.CircleRegionSelected : ''].join(' ')}
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
              </div>
            </div>
          )}
        </div>

        <div className={styles.IcdRow}>
          <span>ICD Code <span className={styles.Req}>*</span> :</span>
          <div className={styles.IcdBox}>
            {ICD_CODES.map(c => <span key={c} className={styles.IcdChip}>{c}</span>)}
            <AngleDownIcon />
          </div>
        </div>
      </div>

      <div className={styles.QuickFooter}>
        <Button variant="primary" disabled={!complete} onClick={() => onCommit(shown, surface)}>Add</Button>
      </div>
    </>
  );
}
