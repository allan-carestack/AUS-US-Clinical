import { useEffect, useId, useRef, useState } from 'react';
import Button from '../Button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../Select';
import { CloseIcon, RenameIcon, TickIcon } from '../Icon';
import styles from './PhaseDuration.module.css';

export type DurationValue = { hours: number; minutes: number };

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

export function formatDuration({ hours, minutes }: DurationValue): string {
  if (hours === 0 && minutes === 0) return '0 m';
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hrs`);
  if (minutes > 0) parts.push(`${minutes} mins`);
  return parts.join(' ') || '0 m';
}

interface PhaseDurationProps {
  value: DurationValue;
  onChange: (value: DurationValue) => void;
  'aria-label'?: string;
}

export function PhaseDuration({
  value,
  onChange,
  'aria-label': ariaLabel = 'Phase duration',
}: PhaseDurationProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const hoursFieldRef = useRef<HTMLDivElement>(null);
  const minutesFieldRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<DurationValue>(value);
  const chipId = useId();
  const hoursTriggerId = useId();
  const minutesTriggerId = useId();
  const [open, setOpen] = useState(false);
  const [draftHours, setDraftHours] = useState(value.hours);
  const [draftMinutes, setDraftMinutes] = useState(value.minutes);
  const [hoursListOpen, setHoursListOpen] = useState(false);
  const [minutesListOpen, setMinutesListOpen] = useState(false);

  const listOpen = hoursListOpen || minutesListOpen;

  const focusTrigger = (field: HTMLDivElement | null) => {
    field?.querySelector<HTMLElement>('button')?.focus();
  };

  const openEditor = () => {
    const next = { hours: value.hours, minutes: value.minutes };
    draftRef.current = next;
    setDraftHours(next.hours);
    setDraftMinutes(next.minutes);
    setHoursListOpen(false);
    setMinutesListOpen(false);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // Defer past the edit-button click so it can't steal focus back.
    const timer = window.setTimeout(() => {
      focusTrigger(hoursFieldRef.current);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      // Keep open while interacting with portaled select menus.
      if (rootRef.current?.contains(target)) return;
      if ((target as Element).closest?.('[data-base-ui-portal], [role="listbox"]')) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const apply = () => {
    onChange({ ...draftRef.current });
    setOpen(false);
  };

  const dismiss = () => {
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // While a select list is open, Enter/Esc belong to the list (select value / close list).
    if (listOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
    }
  };

  const focusMinutes = () => {
    window.setTimeout(() => {
      focusTrigger(minutesFieldRef.current);
    }, 0);
  };

  const hasValue = value.hours > 0 || value.minutes > 0;

  return (
    <div
      ref={rootRef}
      className={[styles.Root, open ? styles.RootOpen : ''].filter(Boolean).join(' ')}
    >
      {/* Collapsed footprint so layout doesn't jump when the chip expands over content */}
      <div className={styles.Sizer} aria-hidden="true">
        <span className={styles.Label}>{formatDuration(value)}</span>
        <span className={styles.EditButton} />
      </div>

      <div
        className={[styles.Chip, open ? styles.ChipOpen : ''].filter(Boolean).join(' ')}
        id={chipId}
        onKeyDown={open ? handleKeyDown : undefined}
      >
        <div className={styles.Collapsed} aria-hidden={open}>
          <div className={styles.PaneClip}>
            <div className={styles.CollapsedInner}>
              <span className={[styles.Label, hasValue ? styles.LabelSet : ''].filter(Boolean).join(' ')}>
                {formatDuration(value)}
              </span>
              <button
                type="button"
                className={styles.EditButton}
                aria-label={`Edit ${ariaLabel}`}
                aria-expanded={open}
                aria-controls={chipId}
                tabIndex={open ? -1 : 0}
                onMouseDown={(event) => {
                  // Keep focus from landing on the pencil so hours can take it on open.
                  event.preventDefault();
                }}
                onClick={openEditor}
              >
                <RenameIcon />
              </button>
            </div>
          </div>
        </div>

        <div className={styles.Expanded} aria-hidden={!open} inert={!open || undefined}>
          <div className={styles.PaneClip}>
            <div className={styles.ExpandedInner}>
              <div className={styles.Field} ref={hoursFieldRef}>
                <Select
                  value={String(draftHours)}
                  modal={false}
                  onValueChange={(v) => {
                    const hours = Number(v);
                    draftRef.current = { ...draftRef.current, hours };
                    setDraftHours(hours);
                  }}
                  onOpenChange={(next, details) => {
                    setHoursListOpen(next);
                    if (!next && details.reason === 'item-press') {
                      focusMinutes();
                    }
                  }}
                >
                  <SelectTrigger
                    id={hoursTriggerId}
                    aria-label="Hours"
                    className={styles.SelectTrigger}
                  />
                  <SelectContent>
                    {HOURS.map((h) => (
                      <SelectItem key={h} value={String(h)}>{h}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className={styles.Unit}>hrs</span>
              </div>

              <div className={styles.Field} ref={minutesFieldRef}>
                <Select
                  value={String(draftMinutes)}
                  modal={false}
                  onValueChange={(v) => {
                    const minutes = Number(v);
                    draftRef.current = { ...draftRef.current, minutes };
                    setDraftMinutes(minutes);
                  }}
                  onOpenChange={(next, details) => {
                    setMinutesListOpen(next);
                    if (!next && details.reason === 'item-press') {
                      apply();
                    }
                  }}
                >
                  <SelectTrigger
                    id={minutesTriggerId}
                    aria-label="Minutes"
                    className={styles.SelectTrigger}
                  />
                  <SelectContent>
                    {MINUTES.map((m) => (
                      <SelectItem key={m} value={String(m)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className={styles.Unit}>mins</span>
              </div>

              <div className={styles.Actions}>
                <Button
                  variant="secondary"
                  iconOnly
                  leftIcon={<TickIcon />}
                  aria-label="Apply duration"
                  onClick={apply}
                />
                <Button
                  variant="secondary-destructive"
                  iconOnly
                  leftIcon={<CloseIcon />}
                  aria-label="Cancel duration edit"
                  onClick={dismiss}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
