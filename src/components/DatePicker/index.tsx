import { useEffect, useMemo, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '../Popover';
import { Select, SelectTrigger, SelectContent, SelectItem } from '../Select';
import Button from '../Button';
import { AngleLeftIcon, AngleRightIcon } from '../Icon';
import styles from './index.module.css';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

interface GridCell {
  date: Date;
  outside: boolean;
}

function parseIso(iso: string | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

function buildMonthGrid(year: number, month: number): GridCell[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // Sunday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: GridCell[] = [];

  for (let i = startPad; i > 0; i -= 1) {
    cells.push({ date: new Date(year, month, 1 - i), outside: true });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(year, month, day), outside: false });
  }
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ date: new Date(year, month + 1, nextDay), outside: true });
    nextDay += 1;
  }
  while (cells.length < 35) {
    cells.push({ date: new Date(year, month + 1, nextDay), outside: true });
    nextDay += 1;
  }

  return cells;
}

function yearOptions(center: number): number[] {
  const start = center - 50;
  return Array.from({ length: 101 }, (_, i) => start + i);
}

export interface DatePickerProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactElement;
  side?: React.ComponentPropsWithoutRef<typeof PopoverContent>['side'];
  align?: React.ComponentPropsWithoutRef<typeof PopoverContent>['align'];
  sideOffset?: number;
}

export function DatePicker({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
}: DatePickerProps) {
  const isValueControlled = valueProp !== undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? '');
  const value = isValueControlled ? (valueProp ?? '') : uncontrolledValue;

  const isOpenControlled = openProp !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = isOpenControlled ? openProp : uncontrolledOpen;

  const selected = useMemo(() => parseIso(value), [value]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const [viewYear, setViewYear] = useState(() => (selected ?? today).getFullYear());
  const [viewMonth, setViewMonth] = useState(() => (selected ?? today).getMonth());
  const [monthSelectOpen, setMonthSelectOpen] = useState(false);
  const [yearSelectOpen, setYearSelectOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const anchor = selected ?? today;
    setViewYear(anchor.getFullYear());
    setViewMonth(anchor.getMonth());
  }, [open, selected, today]);

  useEffect(() => {
    if (open) return;
    setMonthSelectOpen(false);
    setYearSelectOpen(false);
  }, [open]);

  const setOpen = (next: boolean) => {
    if (!isOpenControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  const handleOpenChange = (
    next: boolean,
    details?: { reason?: string; cancel?: () => void },
  ) => {
    // Select menus portal outside the calendar — don't dismiss the picker when
    // interacting with month/year dropdowns.
    if (!next && (monthSelectOpen || yearSelectOpen)) {
      details?.cancel?.();
      return;
    }
    setOpen(next);
  };

  const commit = (next: string) => {
    if (!isValueControlled) setUncontrolledValue(next);
    onValueChange?.(next);
    setOpen(false);
  };

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const years = useMemo(() => yearOptions(viewYear), [viewYear]);

  const shiftMonth = (delta: number) => {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger>{children}</PopoverTrigger>
      <PopoverContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        className={styles.Popup}
        aria-label="Choose date"
      >
        <div className={styles.Calendar}>
          <div className={styles.Header}>
            <Button
              type="button"
              variant="ghost"
              iconOnly
              aria-label="Previous month"
              leftIcon={<AngleLeftIcon />}
              onClick={() => shiftMonth(-1)}
            />

            <div className={styles.DateContent}>
              <div className={styles.MonthField}>
                <Select
                  value={MONTHS[viewMonth]}
                  open={monthSelectOpen}
                  onOpenChange={setMonthSelectOpen}
                  onValueChange={(next) => {
                    if (next == null) return;
                    const index = MONTHS.indexOf(next as (typeof MONTHS)[number]);
                    if (index >= 0) setViewMonth(index);
                  }}
                >
                  <SelectTrigger aria-label="Month" />
                  <SelectContent
                    align="start"
                    positionerClassName={styles.MonthSelectPositioner}
                    positionerStyle={{ zIndex: 10000 }}
                  >
                    {MONTHS.map((month) => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={styles.YearField}>
                <Select
                  value={String(viewYear)}
                  open={yearSelectOpen}
                  onOpenChange={setYearSelectOpen}
                  onValueChange={(next) => {
                    if (next == null) return;
                    setViewYear(Number(next));
                  }}
                >
                  <SelectTrigger aria-label="Year" />
                  <SelectContent
                    align="start"
                    positionerClassName={styles.YearSelectPositioner}
                    positionerStyle={{ zIndex: 10000 }}
                  >
                    {years.map((year) => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              iconOnly
              aria-label="Next month"
              leftIcon={<AngleRightIcon />}
              onClick={() => shiftMonth(1)}
            />
          </div>

          <div className={styles.Weekdays} aria-hidden="true">
            {WEEKDAYS.map((day, index) => (
              <div key={`${day}-${index}`} className={styles.Weekday}>{day}</div>
            ))}
          </div>

          <div className={styles.Grid} role="grid" aria-label={`${MONTHS[viewMonth]} ${viewYear}`}>
            {Array.from({ length: cells.length / 7 }, (_, weekIndex) => (
              <div key={weekIndex} className={styles.Row} role="row">
                {cells.slice(weekIndex * 7, weekIndex * 7 + 7).map((cell) => {
                  const { date, outside } = cell;
                  const iso = toIso(date);
                  const isSelected = !outside && selected ? sameDay(date, selected) : false;
                  const isToday = !outside && sameDay(date, today);

                  return (
                    <div key={`${iso}-${outside ? 'out' : 'in'}`} className={styles.DaySlot} role="presentation">
                      <button
                        type="button"
                        role="gridcell"
                        className={[
                          styles.Day,
                          outside ? styles.DayOutside : '',
                          isToday ? styles.DayToday : '',
                          isSelected ? styles.DaySelected : '',
                        ].filter(Boolean).join(' ')}
                        aria-label={date.toLocaleDateString(undefined, {
                          weekday: 'long',
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                        aria-selected={isSelected}
                        aria-disabled={outside || undefined}
                        disabled={outside}
                        onClick={outside ? undefined : () => commit(iso)}
                      >
                        <span className={styles.DayLabel}>{date.getDate()}</span>
                        {isToday ? (
                          <span className={styles.TodayMark} aria-hidden="true" />
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default DatePicker;
