import { Popover as BasePopover } from '@base-ui/react/popover';
import styles from './index.module.css';
import { CloseIcon } from '../Icon';
import Button from '../Button';

/* ── Root ── */
export function Popover({ children, ...props }: React.ComponentPropsWithoutRef<typeof BasePopover.Root>) {
  return <BasePopover.Root {...props}>{children}</BasePopover.Root>;
}

/* ── Trigger — merges props onto child element ── */
export function PopoverTrigger({ children, ...props }: React.ComponentPropsWithoutRef<typeof BasePopover.Trigger>) {
  return <BasePopover.Trigger render={children as React.ReactElement} {...props} />;
}

/* ── Content — Portal + Positioner + Popup ── */
interface PopoverContentProps extends React.ComponentPropsWithoutRef<typeof BasePopover.Popup> {
  children: React.ReactNode;
  side?: React.ComponentPropsWithoutRef<typeof BasePopover.Positioner>['side'];
  align?: React.ComponentPropsWithoutRef<typeof BasePopover.Positioner>['align'];
  sideOffset?: number;
  showArrow?: boolean;
  /** Position against a specific element instead of the `<PopoverTrigger>` — for popovers opened imperatively (e.g. from a list-item click) rather than from a rendered trigger. */
  anchor?: React.ComponentPropsWithoutRef<typeof BasePopover.Positioner>['anchor'];
}

export function PopoverContent({
  children,
  side = 'bottom',
  align = 'center',
  sideOffset = 8,
  showArrow = false,
  anchor,
  className,
  ...props
}: PopoverContentProps) {
  return (
    <BasePopover.Portal>
      <BasePopover.Positioner
        side={side}
        align={align}
        sideOffset={sideOffset}
        arrowPadding={8}
        anchor={anchor}
        className={styles.Positioner}
      >
        <BasePopover.Popup
          className={[styles.Popup, className].filter(Boolean).join(' ')}
          {...props}
        >
          {children}
          {showArrow && <BasePopover.Arrow className={styles.Arrow} />}
        </BasePopover.Popup>
      </BasePopover.Positioner>
    </BasePopover.Portal>
  );
}

/* ── Header ── */
export function PopoverHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={[styles.Header, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

/* ── Body ── */
export function PopoverBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={[styles.Body, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

/* ── Footer ── */
export function PopoverFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={[styles.Footer, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}

/* ── Title ── */
export function PopoverTitle({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BasePopover.Title>) {
  return (
    <BasePopover.Title className={[styles.Title, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BasePopover.Title>
  );
}

/* ── Description ── */
export function PopoverDescription({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BasePopover.Description>) {
  return (
    <BasePopover.Description className={[styles.Description, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BasePopover.Description>
  );
}

/* ── Close — icon button by default; pass a child element to merge close behaviour onto it ── */
export function PopoverClose({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BasePopover.Close>) {
  if (children) {
    return <BasePopover.Close render={children as React.ReactElement} {...props} />;
  }
  return (
    <BasePopover.Close
      render={<Button variant="ghost" iconOnly aria-label="Close" leftIcon={<CloseIcon />} style={{ flexShrink: 0 }} />}
      className={className}
      {...props}
    />
  );
}
