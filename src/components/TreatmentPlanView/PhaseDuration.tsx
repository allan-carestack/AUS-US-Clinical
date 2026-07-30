import { useEffect, useId, useRef, useState } from 'react';
import Button from '../Button';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../Select';
import { ClockIcon, CloseIcon, EditIcon, TickIcon } from '../Icon';
import { Tooltip } from '../Tooltip';
import styles from './PhaseDuration.module.css';

export type DurationValue = { hours: number; minutes: number };

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const DEFAULT_NAME_MAX_LENGTH = 125;

export function formatDuration({ hours, minutes }: DurationValue): string {
  if (hours === 0 && minutes === 0) return '0 m';
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} hrs`);
  if (minutes > 0) parts.push(`${minutes} mins`);
  return parts.join(' ') || '0 m';
}

interface PhaseDurationProps {
  name: string;
  onNameChange: (name: string) => void;
  value: DurationValue;
  onChange: (value: DurationValue) => void;
  maxLength?: number;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  'aria-label'?: string;
}

export function PhaseDuration({
  name,
  onNameChange,
  value,
  onChange,
  maxLength = DEFAULT_NAME_MAX_LENGTH,
  open: openProp,
  onOpenChange,
  'aria-label': ariaLabel = 'Phase details',
}: PhaseDurationProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const hoursFieldRef = useRef<HTMLDivElement>(null);
  const minutesFieldRef = useRef<HTMLDivElement>(null);
  const draftDurationRef = useRef<DurationValue>(value);
  const focusFieldRef = useRef<'name' | 'hours'>('name');
  const chipId = useId();
  const hoursTriggerId = useId();
  const minutesTriggerId = useId();

  const isControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = isControlled ? openProp : uncontrolledOpen;

  const setOpen = (next: boolean) => {
    if (!next) focusFieldRef.current = 'name';
    onOpenChange?.(next);
    if (!isControlled) setUncontrolledOpen(next);
  };

  const [draftName, setDraftName] = useState(name);
  const [draftHours, setDraftHours] = useState(value.hours);
  const [draftMinutes, setDraftMinutes] = useState(value.minutes);
  const [hoursListOpen, setHoursListOpen] = useState(false);
  const [minutesListOpen, setMinutesListOpen] = useState(false);

  const listOpen = hoursListOpen || minutesListOpen;

  const focusTrigger = (field: HTMLDivElement | null) => {
    field?.querySelector<HTMLElement>('button')?.focus();
  };

  const seedDrafts = () => {
    const next = { hours: value.hours, minutes: value.minutes };
    draftDurationRef.current = next;
    setDraftName(name);
    setDraftHours(next.hours);
    setDraftMinutes(next.minutes);
    setHoursListOpen(false);
    setMinutesListOpen(false);
  };

  const openEditor = (field: 'name' | 'hours' = 'name') => {
    focusFieldRef.current = field;
    seedDrafts();
    setOpen(true);
  };

  const focusOpenField = () => {
    if (focusFieldRef.current === 'hours') {
      focusTrigger(hoursFieldRef.current);
      return;
    }
    nameInputRef.current?.focus();
    nameInputRef.current?.select();
  };

  // Seed drafts when opened externally (e.g. Rename phase menu).
  useEffect(() => {
    if (!open) return;
    seedDrafts();
    const timer = window.setTimeout(focusOpenField, 0);
    return () => window.clearTimeout(timer);
    // Only re-seed when the editor opens, not when name/value change mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional open-only sync
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if ((target as Element).closest?.('[data-base-ui-portal], [role="listbox"]')) return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  const apply = () => {
    const trimmed = draftName.trim().slice(0, maxLength);
    if (trimmed && trimmed !== name) onNameChange(trimmed);
    onChange({ ...draftDurationRef.current });
    setOpen(false);
  };

  const dismiss = () => {
    setOpen(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (listOpen) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      dismiss();
      return;
    }

    if (event.key === 'Enter' && event.target === nameInputRef.current) {
      event.preventDefault();
      apply();
    }
  };

  const focusMinutes = () => {
    window.setTimeout(() => {
      focusTrigger(minutesFieldRef.current);
    }, 0);
  };

  const hasValue = value.hours > 0 || value.minutes > 0;

  const renderCollapsedInner = () => (
    <div className={styles.CollapsedInner}>
      <span className={styles.Name}>{name}</span>
      <span className={styles.Divider} aria-hidden="true" />
      <span className={styles.DurationGroup}>
        <ClockIcon className={styles.ClockIcon} />
        <span className={[styles.Label, hasValue ? styles.LabelSet : ''].filter(Boolean).join(' ')}>
          {formatDuration(value)}
        </span>
      </span>
      <span className={styles.EditButton} aria-hidden="true">
        <EditIcon />
      </span>
    </div>
  );

  return (
    <div
      ref={rootRef}
      className={[styles.Root, open ? styles.RootOpen : ''].filter(Boolean).join(' ')}
    >
      <div className={styles.Sizer} aria-hidden="true">
        {renderCollapsedInner()}
      </div>

      <div
        className={[styles.Chip, open ? styles.ChipOpen : ''].filter(Boolean).join(' ')}
        id={chipId}
        onKeyDown={open ? handleKeyDown : undefined}
      >
        <div className={styles.Collapsed} aria-hidden={open}>
          <div className={styles.PaneClip}>
            <Tooltip
              content="Edit phase details"
              side="right"
              delay={400}
              closeOnClick
              disabled={open}
            >
              <button
                type="button"
                className={styles.CollapsedButton}
                aria-label={`Edit ${ariaLabel}`}
                aria-expanded={open}
                aria-controls={chipId}
                tabIndex={open ? -1 : 0}
                onMouseDown={(event) => {
                  event.preventDefault();
                }}
                onClick={(event) => {
                  const target = event.target as Element | null;
                  const focusHours = Boolean(target?.closest(`.${styles.DurationGroup}`));
                  openEditor(focusHours ? 'hours' : 'name');
                }}
              >
                {renderCollapsedInner()}
              </button>
            </Tooltip>
          </div>
        </div>

        <div className={styles.Expanded} aria-hidden={!open} inert={!open || undefined}>
          <div className={styles.PaneClip}>
            <div className={styles.ExpandedInner}>
              <input
                ref={nameInputRef}
                type="text"
                className={styles.NameInput}
                value={draftName}
                maxLength={maxLength}
                aria-label="Phase name"
                onChange={(event) => setDraftName(event.target.value)}
              />

              <span className={styles.Divider} aria-hidden="true" />

              <span className={styles.DurationLabel}>Duration :</span>

              <div className={styles.Field} ref={hoursFieldRef}>
                <Select
                  value={String(draftHours)}
                  modal={false}
                  onValueChange={(v) => {
                    const hours = Number(v);
                    draftDurationRef.current = { ...draftDurationRef.current, hours };
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
                    draftDurationRef.current = { ...draftDurationRef.current, minutes };
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
                  aria-label="Apply phase details"
                  onClick={apply}
                />
                <Button
                  variant="secondary-destructive"
                  iconOnly
                  leftIcon={<CloseIcon />}
                  aria-label="Cancel phase details edit"
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
