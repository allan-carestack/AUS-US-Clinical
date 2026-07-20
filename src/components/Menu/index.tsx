import { Menu as BaseMenu } from '@base-ui/react/menu';
import styles from './index.module.css';
import { ListItem, type ListItemProps } from '../_shared/ListItem';
import { TickIcon, AngleRightIcon } from '../Icon';

export const createMenuHandle = BaseMenu.createHandle;

export function Menu(props: React.ComponentPropsWithoutRef<typeof BaseMenu.Root>) {
  return <BaseMenu.Root {...props} />;
}

export function MenuTrigger({ children, ...props }: React.ComponentPropsWithoutRef<typeof BaseMenu.Trigger>) {
  return <BaseMenu.Trigger render={children as React.ReactElement} {...props} />;
}

interface MenuContentProps {
  children: React.ReactNode;
  className?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
}

export function MenuContent({ children, className, side = 'bottom', align = 'start', sideOffset = 4, alignOffset }: MenuContentProps) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner side={side} align={align} sideOffset={sideOffset} alignOffset={alignOffset} className={styles.Positioner}>
        <BaseMenu.Popup className={[styles.Popup, className].filter(Boolean).join(' ')}>
          {children}
        </BaseMenu.Popup>
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

type MenuItemProps = React.ComponentPropsWithoutRef<typeof BaseMenu.Item> &
  Pick<ListItemProps, 'icon' | 'iconPosition' | 'subtext'> & {
    /** Styles the row with the red palette, for actions like Delete. */
    destructive?: boolean;
  };

export function MenuItem({ children, className, icon, iconPosition, subtext, destructive, ...props }: MenuItemProps) {
  return (
    <BaseMenu.Item className={[styles.Item, destructive && styles.Destructive, className].filter(Boolean).join(' ')} {...props}>
      <ListItem label={children} icon={icon} iconPosition={iconPosition} subtext={subtext} />
    </BaseMenu.Item>
  );
}

export function MenuSeparator({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseMenu.Separator>) {
  return <BaseMenu.Separator className={[styles.Separator, className].filter(Boolean).join(' ')} {...props} />;
}

export function MenuGroup(props: React.ComponentPropsWithoutRef<typeof BaseMenu.Group>) {
  return <BaseMenu.Group {...props} />;
}

export function MenuGroupLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>) {
  return <BaseMenu.GroupLabel className={[styles.GroupLabel, className].filter(Boolean).join(' ')} {...props} />;
}

export function MenuBackdrop({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseMenu.Backdrop>) {
  return <BaseMenu.Backdrop className={[styles.Backdrop, className].filter(Boolean).join(' ')} {...props} />;
}

export function MenuArrow({ className, ...props }: React.ComponentPropsWithoutRef<typeof BaseMenu.Arrow>) {
  return <BaseMenu.Arrow className={[styles.Arrow, className].filter(Boolean).join(' ')} {...props} />;
}

/* ── Checkbox items ── */
type MenuCheckboxItemProps = React.ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem> &
  Pick<ListItemProps, 'icon' | 'iconPosition' | 'subtext' | 'indicatorPosition'>;

export function MenuCheckboxItem({ children, className, icon, iconPosition, subtext, indicatorPosition = 'right', ...props }: MenuCheckboxItemProps) {
  return (
    <BaseMenu.CheckboxItem className={[styles.Item, className].filter(Boolean).join(' ')} {...props}>
      <ListItem
        label={children}
        icon={icon}
        iconPosition={iconPosition}
        subtext={subtext}
        indicator={<BaseMenu.CheckboxItemIndicator className={styles.ItemIndicator}><TickIcon /></BaseMenu.CheckboxItemIndicator>}
        indicatorPosition={indicatorPosition}
      />
    </BaseMenu.CheckboxItem>
  );
}

/* ── Radio items ── */
export function MenuRadioGroup(props: React.ComponentPropsWithoutRef<typeof BaseMenu.RadioGroup>) {
  return <BaseMenu.RadioGroup {...props} />;
}

type MenuRadioItemProps = React.ComponentPropsWithoutRef<typeof BaseMenu.RadioItem> &
  Pick<ListItemProps, 'icon' | 'iconPosition' | 'subtext' | 'indicatorPosition'>;

export function MenuRadioItem({ children, className, icon, iconPosition, subtext, indicatorPosition = 'right', ...props }: MenuRadioItemProps) {
  return (
    <BaseMenu.RadioItem className={[styles.Item, className].filter(Boolean).join(' ')} {...props}>
      <ListItem
        label={children}
        icon={icon}
        iconPosition={iconPosition}
        subtext={subtext}
        indicator={<BaseMenu.RadioItemIndicator className={styles.ItemIndicator}><TickIcon /></BaseMenu.RadioItemIndicator>}
        indicatorPosition={indicatorPosition}
      />
    </BaseMenu.RadioItem>
  );
}

/* ── Submenu ── */
export function MenuSubmenuRoot(props: React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuRoot>) {
  return <BaseMenu.SubmenuRoot {...props} />;
}

type MenuSubmenuTriggerProps = React.ComponentPropsWithoutRef<typeof BaseMenu.SubmenuTrigger> &
  Pick<ListItemProps, 'icon' | 'subtext'>;

export function MenuSubmenuTrigger({ children, className, icon, subtext, ...props }: MenuSubmenuTriggerProps) {
  return (
    <BaseMenu.SubmenuTrigger className={[styles.Item, className].filter(Boolean).join(' ')} {...props}>
      <ListItem label={children} icon={icon} iconPosition="left" subtext={subtext} />
      <span className={styles.SubmenuIndicator}>
        <AngleRightIcon />
      </span>
    </BaseMenu.SubmenuTrigger>
  );
}

/* ── Link item ── */
type MenuLinkItemProps = React.ComponentPropsWithoutRef<typeof BaseMenu.LinkItem> &
  Pick<ListItemProps, 'icon' | 'iconPosition' | 'subtext'> & {
    /** Styles the row with the red palette, for actions like Delete. */
    destructive?: boolean;
  };

export function MenuLinkItem({ children, className, icon, iconPosition, subtext, destructive, ...props }: MenuLinkItemProps) {
  return (
    <BaseMenu.LinkItem className={[styles.Item, destructive && styles.Destructive, className].filter(Boolean).join(' ')} {...props}>
      <ListItem label={children} icon={icon} iconPosition={iconPosition} subtext={subtext} />
    </BaseMenu.LinkItem>
  );
}
