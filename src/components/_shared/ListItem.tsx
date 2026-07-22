import styles from './listItem.module.css';
import { TickIcon } from '../Icon';

export interface ListItemProps {
  /** Primary text — required and always visible. */
  label: React.ReactNode;
  /** Secondary text shown beneath the label, styled as text-sm. */
  subtext?: React.ReactNode;
  /** Icon rendered alongside the label. */
  icon?: React.ReactNode;
  /** Which side the icon sits on. Defaults to 'left'. */
  iconPosition?: 'left' | 'right';
  /** Render a checkbox on the left. Its checked state follows the row's
      [data-selected] attribute via CSS — no extra state needed. */
  checkbox?: boolean;
  /** A library-specific selected/checked indicator element (e.g.
      Select.ItemIndicator, Menu.RadioItemIndicator), passed in by the caller. */
  indicator?: React.ReactNode;
  /** Which side the indicator sits on. Defaults to 'left'. */
  indicatorPosition?: 'left' | 'right';
  /** A small trailing count, rendered in a circular badge — mirrors
      FilterChip's badge so a filter's count reads the same whether it's
      shown as a pill or as a row in an overflow/menu list. */
  badge?: React.ReactNode;
  /** `count` (default) is a solid dark circle; `notification` is red — same
      semantics as FilterChip's badgeVariant. */
  badgeVariant?: 'count' | 'notification';
}

/**
 * Inner content for a popup list row (Select / Combobox / Menu). Rendered
 * inside each library's own Item primitive, which carries the .ListItem
 * container class. Only the label is mandatory; checkbox, indicator, icon
 * and subtext are optional.
 */
export function ListItem({ label, subtext, icon, iconPosition = 'left', checkbox, indicator, indicatorPosition = 'left', badge, badgeVariant = 'count' }: ListItemProps) {
  return (
    <>
      {checkbox && (
        <span className={styles.Checkbox}>
          <TickIcon />
        </span>
      )}
      {indicator && indicatorPosition === 'left' && indicator}
      {icon && iconPosition === 'left' && <span className={styles.Icon}>{icon}</span>}
      <span className={styles.Text}>
        <span className={styles.Label}>{label}</span>
        {subtext != null && <span className={styles.Subtext}>{subtext}</span>}
      </span>
      {badge != null && (
        <span className={[styles.Badge, badgeVariant === 'notification' ? styles.badgeNotification : styles.badgeCount].join(' ')}>
          {badge}
        </span>
      )}
      {icon && iconPosition === 'right' && <span className={styles.Icon}>{icon}</span>}
      {indicator && indicatorPosition === 'right' && indicator}
    </>
  );
}
