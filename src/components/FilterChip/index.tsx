import { forwardRef } from 'react';
import { Toggle as BaseToggle } from '@base-ui/react/toggle';
import styles from './index.module.css';

export type FilterChipColor = 'grey' | 'pink' | 'purple' | 'olive';
export type FilterChipBadgeVariant = 'tint' | 'count' | 'notification';

type FilterChipShared = {
  color?: FilterChipColor;
  /** Rendered before the label — typically a `PlusIcon` hinting that pressing adds the filter. */
  leftIcon?: React.ReactNode;
  /** Trailing glyph — remove (×) on removable chips, or chevron on menu triggers. */
  rightIcon?: React.ReactNode;
  /** A small trailing count, rendered in a circular badge. */
  badge?: React.ReactNode;
  /** Badge treatment: `tint` (default) follows the chip color; `count` is a
      solid dark circle with white text; `notification` is red with white text. */
  badgeVariant?: FilterChipBadgeVariant;
  /** Fully-rounded (stadium) shape instead of the default radius. */
  pill?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

/** Toggle chip (default) — multi-select filter. */
type FilterChipToggleProps = FilterChipShared &
  Omit<React.ComponentPropsWithoutRef<typeof BaseToggle>, keyof FilterChipShared | 'children'> & {
    /** When false, renders a plain `<button>` for MenuTrigger (no toggle state machine). */
    toggle?: true;
  };

/** Plain button chip — same look, for dropdown triggers. */
type FilterChipButtonProps = FilterChipShared &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof FilterChipShared | 'children'> & {
    toggle: false;
    /** Mirrors selected look when the menu has active values. */
    pressed?: boolean;
  };

type FilterChipProps = FilterChipToggleProps | FilterChipButtonProps;

const colorClass: Record<FilterChipColor, string> = {
  grey: styles.colorGrey,
  pink: styles.colorPink,
  purple: styles.colorPurple,
  olive: styles.colorOlive,
};

const badgeVariantClass: Record<FilterChipBadgeVariant, string> = {
  tint: '',
  count: styles.badgeCount,
  notification: styles.badgeNotification,
};

export const FilterChip = forwardRef<HTMLButtonElement, FilterChipProps>(function FilterChip(
  { color = 'grey', leftIcon, rightIcon, badge, badgeVariant = 'tint', pill, children, className, disabled, toggle = true, ...props },
  ref,
) {
  const classNames = [styles.Chip, colorClass[color], pill ? styles.pill : '', className].filter(Boolean).join(' ');
  const content = (
    <>
      {leftIcon && <span className={styles.Icon}>{leftIcon}</span>}
      <span className={styles.Label}>{children}</span>
      {badge != null && <span className={[styles.Badge, badgeVariantClass[badgeVariant]].filter(Boolean).join(' ')}>{badge}</span>}
      {rightIcon && !disabled && <span className={styles.Icon}>{rightIcon}</span>}
    </>
  );

  if (toggle === false) {
    const { pressed, ...buttonProps } = props as FilterChipButtonProps;
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        className={classNames}
        data-pressed={pressed || undefined}
        {...buttonProps}
      >
        {content}
      </button>
    );
  }

  return (
    <BaseToggle ref={ref} disabled={disabled} className={classNames} {...(props as FilterChipToggleProps)}>
      {content}
    </BaseToggle>
  );
});
