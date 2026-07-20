import React from 'react';
import { Tabs as BaseTabs } from '@base-ui/react/tabs';
import styles from './index.module.css';

type Variant = 'primary' | 'secondary' | 'tertiary';

const TabsContext = React.createContext<Variant>('secondary');

/* ── Root ── */
interface TabsProps extends Omit<React.ComponentPropsWithoutRef<typeof BaseTabs.Root>, 'orientation'> {
  variant?: Variant;
}

export function Tabs({ variant = 'secondary', children, className, ...props }: TabsProps) {
  return (
    <TabsContext.Provider value={variant}>
      <BaseTabs.Root
        orientation="horizontal"
        className={[styles.Root, className].filter(Boolean).join(' ')}
        {...props}
      >
        {children}
      </BaseTabs.Root>
    </TabsContext.Provider>
  );
}

/* ── List ── */
export function TabsList({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseTabs.List>) {
  const variant = React.useContext(TabsContext);
  const listVariantClass = { primary: styles.listPrimary, secondary: styles.listSecondary, tertiary: styles.listTertiary }[variant];
  const indicatorClass = { secondary: styles.indicatorSecondary, tertiary: styles.indicatorTertiary }[variant as 'secondary' | 'tertiary'];
  return (
    <BaseTabs.List className={[styles.List, listVariantClass, className].filter(Boolean).join(' ')} {...props}>
      {children}
      {variant !== 'primary' && (
        <BaseTabs.Indicator className={[styles.Indicator, indicatorClass].filter(Boolean).join(' ')} />
      )}
    </BaseTabs.List>
  );
}

/* ── Tab ── */
export function TabsTab({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseTabs.Tab>) {
  const variant = React.useContext(TabsContext);
  const tabVariantClass = { primary: styles.tabPrimary, secondary: styles.tabSecondary, tertiary: styles.tabTertiary }[variant];
  return (
    <BaseTabs.Tab className={[styles.Tab, tabVariantClass, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseTabs.Tab>
  );
}

/* ── Panel ── */
export function TabsPanel({ children, className, ...props }: React.ComponentPropsWithoutRef<typeof BaseTabs.Panel>) {
  return (
    <BaseTabs.Panel className={[styles.Panel, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </BaseTabs.Panel>
  );
}

/* ── Badge — count or notification indicator inside a tab ── */
interface TabsBadgeProps {
  children: React.ReactNode;
  variant?: 'count' | 'notification';
  className?: string;
}

export function TabsBadge({ children, variant = 'count', className }: TabsBadgeProps) {
  return (
    <span className={[styles.Badge, variant === 'notification' ? styles.badgeNotification : styles.badgeCount, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  );
}
