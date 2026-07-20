import { useRef, useState, useLayoutEffect } from 'react';
import { ToggleGroup } from '@base-ui/react/toggle-group';
import { Toggle } from '@base-ui/react/toggle';
import styles from './index.module.css';

interface SegmentedButtonProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface SegmentedButtonItemProps {
  value: string;
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface IndicatorRect { left: number; top: number; width: number; height: number; }

export function SegmentedButton({
  value,
  defaultValue,
  onValueChange,
  disabled,
  children,
  className,
}: SegmentedButtonProps) {
  const indicatorRef = useRef<HTMLSpanElement>(null);
  const [currentValue, setCurrentValue] = useState(value ?? defaultValue ?? '');
  const [rect, setRect] = useState<IndicatorRect | null>(null);

  // Sync controlled value changes from outside
  if (value !== undefined && value !== currentValue) {
    setCurrentValue(value);
  }

  useLayoutEffect(() => {
    const group = indicatorRef.current?.parentElement;
    if (!group) return;
    const selected = group.querySelector('[data-pressed]') as HTMLElement | null;
    if (!selected) return;
    setRect({
      left:   selected.offsetLeft,
      top:    selected.offsetTop,
      width:  selected.offsetWidth,
      height: selected.offsetHeight,
    });
  }, [currentValue]);

  return (
    <ToggleGroup
      value={[currentValue]}
      onValueChange={(vals, eventDetails) => {
        if (vals.length === 0) { eventDetails.cancel(); return; }
        setCurrentValue(vals[0]);
        onValueChange?.(vals[0]);
      }}
      disabled={disabled}
      className={[styles.Group, className].filter(Boolean).join(' ')}
    >
      {!disabled && (
        <span
          ref={indicatorRef}
          className={styles.Indicator}
          style={rect ? {
            transform: `translateX(${rect.left}px)`,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          } : undefined}
          aria-hidden="true"
        />
      )}
      {children}
    </ToggleGroup>
  );
}

export function SegmentedButtonItem({ value, disabled, children, className }: SegmentedButtonItemProps) {
  return (
    <Toggle
      value={value}
      disabled={disabled}
      className={[styles.Item, className].filter(Boolean).join(' ')}
    >
      {children}
    </Toggle>
  );
}
